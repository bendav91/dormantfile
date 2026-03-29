export function calculateCT600Deadline(accountingPeriodEnd: Date): Date {
  const deadline = new Date(accountingPeriodEnd);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + 1);
  return deadline;
}

export function calculateAccountsDeadline(accountingPeriodEnd: Date): Date {
  const deadline = new Date(accountingPeriodEnd);
  const targetMonth = deadline.getUTCMonth() + 9;
  const originalDate = deadline.getUTCDate();
  deadline.setUTCMonth(targetMonth, 1);
  const maxDay = new Date(
    Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth() + 1, 0),
  ).getUTCDate();
  deadline.setUTCDate(Math.min(originalDate, maxDay));
  return deadline;
}

export function validateUTR(utr: string): boolean {
  return /^\d{10}$/.test(utr);
}

export function validatePassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const REMINDER_DAYS_BEFORE = [90, 30, 14, 7, 3, 1] as const;

export function calculateNextReminderDate(
  filingDeadline: Date,
  remindersSent: number,
): Date | null {
  if (remindersSent >= REMINDER_DAYS_BEFORE.length) return null;
  const daysBefore = REMINDER_DAYS_BEFORE[remindersSent];
  const reminderDate = new Date(filingDeadline);
  reminderDate.setUTCDate(reminderDate.getUTCDate() - daysBefore);
  return reminderDate;
}
