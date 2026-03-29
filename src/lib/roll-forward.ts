import { prisma } from "@/lib/db";
import {
  calculateAccountsDeadline,
  calculateCT600Deadline,
  calculateNextReminderDate,
} from "@/lib/utils";
import { resend } from "@/lib/email/client";
import { buildFilingConfirmationEmail } from "@/lib/email/templates";

/**
 * After a filing is accepted, check whether the company's stored period
 * (the oldest unfiled one) can advance. This only happens when the accepted
 * filing's period matches the company's current `accountingPeriodEnd`.
 *
 * If the user filed out of order (e.g., filed period 3 before period 1),
 * the company record stays put until the oldest period is completed.
 *
 * When the oldest period is completed, cascade forward through any
 * already-completed subsequent periods.
 */
export async function rollForwardPeriod(
  companyId: string,
  filedPeriodEnd: Date,
  registeredForCorpTax: boolean,
  filingType: "accounts" | "ct600",
  userEmail: string,
  companyName: string,
  options?: { skipEmail?: boolean },
): Promise<void> {
  // Send confirmation email first (non-blocking)
  if (!options?.skipEmail) {
    try {
      const filedPeriodStart = new Date(filedPeriodEnd);
      filedPeriodStart.setUTCFullYear(filedPeriodStart.getUTCFullYear() - 1);
      filedPeriodStart.setUTCDate(filedPeriodStart.getUTCDate() + 1);

      const { subject, html } = buildFilingConfirmationEmail({
        companyName,
        periodStart: filedPeriodStart,
        periodEnd: filedPeriodEnd,
        filingType,
      });
      await resend.emails.send({
        from: "DormantFile <noreply@dormantfile.com>",
        to: userEmail,
        subject,
        html,
      });
    } catch {
      // Must not block
    }
  }

  // Fetch the company's current stored period
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { accountingPeriodStart: true, accountingPeriodEnd: true },
  });
  if (!company) return;

  // Only roll forward if the filed period matches the company's current (oldest unfiled) period
  if (filedPeriodEnd.getTime() !== company.accountingPeriodEnd.getTime()) {
    return;
  }

  // Cascade: keep rolling forward as long as the next period is already complete
  let currentEnd = new Date(company.accountingPeriodEnd);

  while (true) {
    // Check if all required filings for this period are accepted
    const acceptedFilings = await prisma.filing.findMany({
      where: { companyId, periodEnd: currentEnd, status: "accepted" },
      select: { filingType: true },
    });
    const acceptedTypes = new Set(acceptedFilings.map((f) => f.filingType));

    if (!acceptedTypes.has("accounts")) break;
    if (registeredForCorpTax && !acceptedTypes.has("ct600")) break;

    // This period is complete — advance to next
    const nextStart = new Date(currentEnd);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    const nextEnd = new Date(currentEnd);
    nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);

    currentEnd = nextEnd;

    // Check if we've gone past the present — if so, this is the new "current" period
    if (nextEnd.getTime() > Date.now()) {
      // Update company to this future period and set up reminders
      const newAccountsDeadline = calculateAccountsDeadline(nextEnd);
      const reminders: Array<{
        companyId: string;
        filingType: "accounts" | "ct600";
        filingDeadline: Date;
        remindersSent: number;
        nextReminderAt: Date | null;
      }> = [
        {
          companyId,
          filingType: "accounts",
          filingDeadline: newAccountsDeadline,
          remindersSent: 0,
          nextReminderAt: calculateNextReminderDate(newAccountsDeadline, 0),
        },
      ];

      if (registeredForCorpTax) {
        const newCT600Deadline = calculateCT600Deadline(nextEnd);
        reminders.push({
          companyId,
          filingType: "ct600",
          filingDeadline: newCT600Deadline,
          remindersSent: 0,
          nextReminderAt: calculateNextReminderDate(newCT600Deadline, 0),
        });
      }

      await prisma.$transaction([
        prisma.company.update({
          where: { id: companyId },
          data: { accountingPeriodStart: nextStart, accountingPeriodEnd: nextEnd },
        }),
        prisma.reminder.deleteMany({ where: { companyId } }),
        ...reminders.map((r) => prisma.reminder.create({ data: r })),
      ]);

      return;
    }

    // Period is in the past — update company and continue cascade
    await prisma.company.update({
      where: { id: companyId },
      data: {
        accountingPeriodStart: nextStart,
        accountingPeriodEnd: nextEnd,
      },
    });
  }

  // Cascade stopped at a period that still needs filing — update reminders for it
  const stoppedStart = new Date(currentEnd);
  stoppedStart.setUTCFullYear(stoppedStart.getUTCFullYear() - 1);
  stoppedStart.setUTCDate(stoppedStart.getUTCDate() + 1);

  const accountsDeadline = calculateAccountsDeadline(currentEnd);
  const reminders: Array<{
    companyId: string;
    filingType: "accounts" | "ct600";
    filingDeadline: Date;
    remindersSent: number;
    nextReminderAt: Date | null;
  }> = [
    {
      companyId,
      filingType: "accounts",
      filingDeadline: accountsDeadline,
      remindersSent: 0,
      nextReminderAt: calculateNextReminderDate(accountsDeadline, 0),
    },
  ];

  if (registeredForCorpTax) {
    const ct600Deadline = calculateCT600Deadline(currentEnd);
    reminders.push({
      companyId,
      filingType: "ct600",
      filingDeadline: ct600Deadline,
      remindersSent: 0,
      nextReminderAt: calculateNextReminderDate(ct600Deadline, 0),
    });
  }

  await prisma.$transaction([
    prisma.reminder.deleteMany({ where: { companyId } }),
    ...reminders.map((r) => prisma.reminder.create({ data: r })),
  ]);
}
