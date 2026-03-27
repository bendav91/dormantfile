import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pollHmrc } from "@/lib/hmrc/submission-client";
import type { VendorCredentials } from "@/lib/hmrc/types";
import { calculateFilingDeadline, calculateNextReminderDate } from "@/lib/utils";
import { resend } from "@/lib/email/client";
import { buildFilingConfirmationEmail } from "@/lib/email/templates";

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
      periodStart: new Date(oldPeriodEnd.getTime() - 365 * 24 * 60 * 60 * 1000),
      periodEnd: oldPeriodEnd,
    });

    await resend.emails.send({
      from: "DormantFile <noreply@dormantfile.com>",
      to: userEmail,
      subject,
      html,
    });
  } catch {
    // Email failure must not block period roll-forward
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filings = await prisma.filing.findMany({
    where: {
      status: "polling_timeout",
      hmrcCorrelationId: { not: null },
    },
    include: {
      company: {
        include: { user: true },
      },
    },
  });

  const total = filings.length;
  let resolved = 0;

  const endpoint = process.env.HMRC_ENDPOINT;

  let vendor: VendorCredentials;
  try {
    vendor = getVendorCredentials();
  } catch {
    return NextResponse.json(
      { error: "HMRC vendor credentials are not configured" },
      { status: 500 }
    );
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: "HMRC_ENDPOINT is not configured" },
      { status: 500 }
    );
  }

  for (const filing of filings) {
    try {
      const pollResult = await pollHmrc(
        filing.hmrcCorrelationId!,
        endpoint,
        vendor
      );

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

        resolved++;
      } else if (pollResult.status === "rejected") {
        await prisma.filing.update({
          where: { id: filing.id },
          data: {
            status: "rejected",
            hmrcResponsePayload: pollResult.responsePayload,
          },
        });

        resolved++;
      }
      // status === "processing": leave as polling_timeout, do nothing
    } catch {
      // Don't crash the cron — continue to next filing
    }
  }

  return NextResponse.json({ checked: total, resolved });
}
