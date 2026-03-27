import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildGovTalkMessage } from "@/lib/hmrc/xml-builder";
import { submitToHmrc, pollHmrc } from "@/lib/hmrc/submission-client";
import { calculateFilingDeadline, calculateNextReminderDate } from "@/lib/utils";
import { resend } from "@/lib/email/client";
import { buildFilingConfirmationEmail } from "@/lib/email/templates";
import type { VendorCredentials } from "@/lib/hmrc/types";

const POLL_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 5_000;

function getVendorCredentials(): VendorCredentials {
  const vendorId = process.env.HMRC_VENDOR_ID;
  const senderId = process.env.HMRC_SENDER_ID;
  const senderPassword = process.env.HMRC_SENDER_PASSWORD;

  if (!vendorId || !senderId || !senderPassword) {
    throw new Error("HMRC vendor credentials are not configured");
  }

  return { vendorId, senderId, senderPassword };
}

function getHmrcEndpoint(): string {
  const endpoint = process.env.HMRC_ENDPOINT;
  if (!endpoint) {
    throw new Error("HMRC_ENDPOINT is not configured");
  }
  return endpoint;
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

  // Send confirmation email — non-fatal if it fails
  try {
    const { subject, html } = buildFilingConfirmationEmail({
      companyName,
      periodStart: new Date(newPeriodStart.getTime() - (365 * 24 * 60 * 60 * 1000)),
      periodEnd: oldPeriodEnd,
    });

    await resend.emails.send({
      from: "DormantFile <noreply@dormantfile.com>",
      to: userEmail,
      subject,
      html,
    });
  } catch {
    // Email failure must not block the filing response
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check subscription
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.subscriptionStatus !== "active") {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  let body: { companyId?: string; gatewayUsername?: string; gatewayPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { companyId, gatewayUsername, gatewayPassword } = body;

  if (!companyId || !gatewayUsername || !gatewayPassword) {
    return NextResponse.json(
      { error: "companyId, gatewayUsername, and gatewayPassword are required" },
      { status: 400 }
    );
  }

  // Find company
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Idempotency check
  const existingFiling = await prisma.filing.findFirst({
    where: {
      companyId,
      periodStart: company.accountingPeriodStart,
      periodEnd: company.accountingPeriodEnd,
      status: { in: ["submitted", "polling_timeout", "accepted"] },
    },
  });

  if (existingFiling) {
    return NextResponse.json(
      { error: "A filing already exists for this period" },
      { status: 409 }
    );
  }

  // Create filing record with "pending" status
  const filing = await prisma.filing.create({
    data: {
      companyId,
      periodStart: company.accountingPeriodStart,
      periodEnd: company.accountingPeriodEnd,
      status: "pending",
    },
  });

  let vendor: VendorCredentials;
  let endpoint: string;

  try {
    vendor = getVendorCredentials();
    endpoint = getHmrcEndpoint();
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server configuration error" },
      { status: 500 }
    );
  }

  // Build XML
  let govTalkXml: string;
  try {
    govTalkXml = buildGovTalkMessage(
      {
        companyName: company.companyName,
        uniqueTaxReference: company.uniqueTaxReference,
        periodStart: company.accountingPeriodStart,
        periodEnd: company.accountingPeriodEnd,
        declarantName: user.name,
        declarantStatus: "Director",
      },
      { gatewayUsername, gatewayPassword },
      vendor
    );
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build submission" },
      { status: 500 }
    );
  }

  // Submit to HMRC
  let correlationId: string;
  let pollEndpoint: string;

  try {
    const submissionResult = await submitToHmrc(govTalkXml, endpoint);
    correlationId = submissionResult.correlationId;
    pollEndpoint = submissionResult.endpoint;
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit to HMRC" },
      { status: 502 }
    );
  }

  // Credentials no longer referenced after this point

  await prisma.filing.update({
    where: { id: filing.id },
    data: {
      status: "submitted",
      hmrcCorrelationId: correlationId,
      submittedAt: new Date(),
    },
  });

  // Poll for response
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    let pollResult: Awaited<ReturnType<typeof pollHmrc>>;

    try {
      pollResult = await pollHmrc(correlationId, pollEndpoint, vendor);
    } catch {
      // Transient poll error — keep trying until timeout
      continue;
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
        companyId,
        company.accountingPeriodEnd,
        user.email,
        company.companyName
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

    // still processing — continue loop
  }

  // Timed out
  await prisma.filing.update({
    where: { id: filing.id },
    data: { status: "polling_timeout" },
  });

  return NextResponse.json({ status: "polling_timeout", filingId: filing.id });
}
