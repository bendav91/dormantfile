export function calculateCT600Deadline(accountingPeriodEnd: Date): Date {
  const deadline = new Date(accountingPeriodEnd);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + 1);
  return deadline;
}

export function calculateAccountsDeadline(
  accountingPeriodEnd: Date,
  incorporationDate?: Date,
): Date {
  // Standard rule: 9 months after the accounting period end
  const deadline = new Date(accountingPeriodEnd);
  const targetMonth = deadline.getUTCMonth() + 9;
  const originalDate = deadline.getUTCDate();
  deadline.setUTCMonth(targetMonth, 1);
  const maxDay = new Date(
    Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth() + 1, 0),
  ).getUTCDate();
  deadline.setUTCDate(Math.min(originalDate, maxDay));

  // First accounts rule: deadline is the later of 9 months from period end
  // OR 21 months from incorporation (Companies Act 2006, s.442(3))
  if (incorporationDate) {
    const twentyOneMonths = new Date(incorporationDate);
    twentyOneMonths.setUTCMonth(twentyOneMonths.getUTCMonth() + 21);
    if (twentyOneMonths.getTime() > deadline.getTime()) {
      return twentyOneMonths;
    }
  }

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
