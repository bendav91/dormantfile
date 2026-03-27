import { prisma } from "@/lib/db";
import { calculateAccountsDeadline, calculateCT600Deadline, calculateNextReminderDate } from "@/lib/utils";
import { resend } from "@/lib/email/client";
import { buildFilingConfirmationEmail } from "@/lib/email/templates";

export async function rollForwardPeriod(
  companyId: string,
  oldPeriodEnd: Date,
  registeredForCorpTax: boolean,
  filingType: "accounts" | "ct600",
  userEmail: string,
  companyName: string
): Promise<void> {
  // Check if all required filings for this period are accepted
  const acceptedFilings = await prisma.filing.findMany({
    where: { companyId, periodEnd: oldPeriodEnd, status: "accepted" },
    select: { filingType: true },
  });
  const acceptedTypes = new Set(acceptedFilings.map((f) => f.filingType));

  // Don't roll forward until all required filings are done
  if (!acceptedTypes.has("accounts")) return;
  if (registeredForCorpTax && !acceptedTypes.has("ct600")) return;

  // All required filings accepted — roll forward
  const newPeriodStart = new Date(oldPeriodEnd);
  newPeriodStart.setUTCDate(newPeriodStart.getUTCDate() + 1);
  const newPeriodEnd = new Date(oldPeriodEnd);
  newPeriodEnd.setUTCFullYear(newPeriodEnd.getUTCFullYear() + 1);

  const newAccountsDeadline = calculateAccountsDeadline(newPeriodEnd);
  const reminders: Array<{
    companyId: string;
    filingType: "accounts" | "ct600";
    filingDeadline: Date;
    remindersSent: number;
    nextReminderAt: Date | null;
  }> = [{
    companyId,
    filingType: "accounts",
    filingDeadline: newAccountsDeadline,
    remindersSent: 0,
    nextReminderAt: calculateNextReminderDate(newAccountsDeadline, 0),
  }];

  if (registeredForCorpTax) {
    const newCT600Deadline = calculateCT600Deadline(newPeriodEnd);
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
      data: { accountingPeriodStart: newPeriodStart, accountingPeriodEnd: newPeriodEnd },
    }),
    prisma.reminder.deleteMany({ where: { companyId } }),
    ...reminders.map((r) => prisma.reminder.create({ data: r })),
  ]);

  // Confirmation email — non-fatal
  try {
    const { subject, html } = buildFilingConfirmationEmail({
      companyName,
      periodStart: new Date(newPeriodStart.getTime() - 365 * 24 * 60 * 60 * 1000),
      periodEnd: oldPeriodEnd,
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
