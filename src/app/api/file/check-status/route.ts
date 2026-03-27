import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pollHmrc } from "@/lib/hmrc/submission-client";
import { calculateFilingDeadline, calculateNextReminderDate } from "@/lib/utils";
import { resend } from "@/lib/email/client";
import { buildFilingConfirmationEmail } from "@/lib/email/templates";
import type { VendorCredentials } from "@/lib/hmrc/types";

function getVendorCredentials(): VendorCredentials {
  const vendorId = process.env.HMRC_VENDOR_ID;
  const senderId = process.env.HMRC_SENDER_ID;
  const senderPassword = process.env.HMRC_SENDER_PASSWORD;

  if (!vendorId || !senderId || !senderPassword) {
    throw new Error("HMRC vendor credentials are not configured");
  }

  return { vendorId, senderId, senderPassword };
}

async function rollForwardPeriod(
  companyId: string,
  oldPeriodEnd: Date,
  userEmail: string,
  companyName: string
): Promise<void> {
  const newPeriodStart = new Date(oldPeriodEnd);
  newPeriodStart.setUTCDate(newPeriodStart.getUTCDate() + 1);

  const newPeriodEnd = new Date(oldPeriodEnd);
  newPeriodEnd.setUTCFullYear(newPeriodEnd.getUTCFullYear() + 1);

  const newFilingDeadline = calculateFilingDeadline(newPeriodEnd);
  const nextReminderAt = calculateNextReminderDate(newFilingDeadline, 0);

  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: {
        accountingPeriodStart: newPeriodStart,
        accountingPeriodEnd: newPeriodEnd,
      },
    }),
    prisma.reminder.deleteMany({
      where: { companyId },
    }),
    prisma.reminder.create({
      data: {
        companyId,
        filingDeadline: newFilingDeadline,
        remindersSent: 0,
        nextReminderAt,
      },
    }),
  ]);

  try {
    const { subject, html } = buildFilingConfirmationEmail({
      companyName,
      periodStart: new Date(oldPeriodEnd.getTime() - (365 * 24 * 60 * 60 * 1000)),
      periodEnd: oldPeriodEnd,
    });

    await resend.emails.send({
      from: "DormantFile <noreply@dormantfile.com>",
      to: userEmail,
      subject,
      html,
    });
  } catch {
    // Email failure must not block the status response
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { filingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { filingId } = body;

  if (!filingId) {
    return NextResponse.json({ error: "filingId is required" }, { status: 400 });
  }

  // Find filing, verify ownership
  const filing = await prisma.filing.findFirst({
    where: {
      id: filingId,
      company: { userId: session.user.id },
    },
    include: {
      company: {
        include: { user: true },
      },
    },
  });

  if (!filing) {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }

  if (filing.status !== "polling_timeout") {
    return NextResponse.json(
      { error: "Filing is not in polling_timeout status" },
      { status: 400 }
    );
  }

  if (!filing.hmrcCorrelationId) {
    return NextResponse.json(
      { error: "No correlation ID found for this filing" },
      { status: 400 }
    );
  }

  let vendor: VendorCredentials;
  try {
    vendor = getVendorCredentials();
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server configuration error" },
      { status: 500 }
    );
  }

  const endpoint = process.env.HMRC_ENDPOINT;
  if (!endpoint) {
    return NextResponse.json({ error: "HMRC_ENDPOINT is not configured" }, { status: 500 });
  }

  let pollResult: Awaited<ReturnType<typeof pollHmrc>>;
  try {
    pollResult = await pollHmrc(filing.hmrcCorrelationId, endpoint, vendor);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to poll HMRC" },
      { status: 502 }
    );
  }

  if (pollResult.status === "accepted") {
    await prisma.filing.update({
      where: { id: filing.id },
      data: {
        status: "accepted",
        confirmedAt: new Date(),
        hmrcResponsePayload: pollResult.responsePayload,
      },
    });

    await rollForwardPeriod(
      filing.companyId,
      filing.company.accountingPeriodEnd,
      filing.company.user.email,
      filing.company.companyName
    );

    return NextResponse.json({ status: "accepted", filingId: filing.id });
  }

  if (pollResult.status === "rejected") {
    await prisma.filing.update({
      where: { id: filing.id },
      data: {
        status: "rejected",
        hmrcResponsePayload: pollResult.responsePayload,
      },
    });

    return NextResponse.json({
      status: "rejected",
      filingId: filing.id,
      message: pollResult.message,
    });
  }

  // Still processing
  return NextResponse.json({ status: "processing", filingId: filing.id });
}
