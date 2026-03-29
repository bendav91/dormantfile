import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resend } from "@/lib/email/client";
import { buildReminderEmail } from "@/lib/email/templates";

const REMINDER_DAYS_BEFORE = [90, 30, 14, 7, 3, 1] as const;

/**
 * Daily cron (08:00) — sends reminder emails for upcoming filing deadlines.
 *
 * Only reminds for the upcoming period per company: the outstanding,
 * non-suppressed accounts Filing with the nearest future deadline.
 * Uses the Notification table as a pure append-only log to track
 * which reminders have been sent.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dormantfile.com";

  // Find all outstanding, non-suppressed accounts filings with future deadlines
  // grouped by company (we want the earliest future deadline per company)
  const upcomingFilings = await prisma.filing.findMany({
    where: {
      status: "outstanding",
      filingType: "accounts",
      suppressedAt: null,
      accountsDeadline: { not: null, gt: now },
      company: {
        deletedAt: null,
        user: { subscriptionStatus: { in: ["active", "cancelling"] } },
      },
    },
    include: {
      company: { include: { user: true } },
      notifications: { where: { type: "reminder" } },
    },
    orderBy: { accountsDeadline: "asc" },
  });

  // Group by company — pick the earliest future deadline per company
  const companyFilingMap = new Map<string, (typeof upcomingFilings)[number]>();
  for (const filing of upcomingFilings) {
    if (!companyFilingMap.has(filing.companyId)) {
      companyFilingMap.set(filing.companyId, filing);
    }
  }

  let sent = 0;

  for (const filing of companyFilingMap.values()) {
    const deadline = filing.accountsDeadline!;
    const daysUntilDeadline = Math.floor(
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // How many reminders already sent for this filing?
    const remindersSent = filing.notifications.length;
    if (remindersSent >= REMINDER_DAYS_BEFORE.length) continue;

    // Check if the next reminder tier date has passed
    const nextTierDays = REMINDER_DAYS_BEFORE[remindersSent];
    if (daysUntilDeadline > nextTierDays) continue;

    try {
      const fileUrl = `${appUrl}/file/${filing.companyId}/accounts`;

      const { subject, html } = buildReminderEmail({
        companyName: filing.company.companyName,
        daysUntilDeadline,
        filingDeadline: deadline,
        fileUrl,
        filingType: "accounts",
      });

      await resend.emails.send({
        from: "DormantFile <noreply@dormantfile.com>",
        to: filing.company.user.email,
        subject,
        html,
      });

      // Append to notification log
      await prisma.notification.create({
        data: {
          companyId: filing.companyId,
          filingId: filing.id,
          type: "reminder",
        },
      });

      sent++;
    } catch {
      // Continue to next company on error
    }
  }

  return NextResponse.json({ sent });
}
