export function calculateFilingDeadline(accountingPeriodEnd: Date): Date {
  const deadline = new Date(accountingPeriodEnd);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + 1);
  return deadline;
}

export function validateUTR(utr: string): boolean {
  return /^\d{10}$/.test(utr);
}

const REMINDER_DAYS_BEFORE = [90, 30, 14, 7, 3, 1] as const;

export function calculateNextReminderDate(
  filingDeadline: Date,
  remindersSent: number
): Date | null {
  if (remindersSent >= REMINDER_DAYS_BEFORE.length) return null;
  const daysBefore = REMINDER_DAYS_BEFORE[remindersSent];
  const reminderDate = new Date(filingDeadline);
  reminderDate.setUTCDate(reminderDate.getUTCDate() - daysBefore);
  return reminderDate;
}
