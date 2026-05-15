/**
 * Corporation Tax Accounting Period (CTAP) computation utilities.
 *
 * CTAPs can diverge from Companies House accounting periods. A CTAP:
 * - Cannot exceed 12 months
 * - Ends early when a company starts/stops trading, enters liquidation,
 *   ceases to be UK resident, or changes its accounting reference date
 * - May not align with the CH period start date (e.g. company registered
 *   for CT mid-way through an accounts period)
 */

import { calculateCT600Deadline } from "@/lib/utils";

export interface CtapRange {
  start: Date;
  end: Date;
}

/**
 * Generate a sequence of 12-month CTAPs from an anchor date up to a cutoff.
 * Each CTAP is exactly 12 months (or shorter if the cutoff falls mid-CTAP).
 *
 * @param ctapStartDate - The anchor date for the first CTAP
 * @param upToDate - Generate CTAPs whose start date is before this date
 * @returns Array of CTAP date ranges
 */
export function computeCtaps(ctapStartDate: Date, upToDate: Date): CtapRange[] {
  const ctaps: CtapRange[] = [];
  let start = new Date(ctapStartDate);

  while (start.getTime() < upToDate.getTime()) {
    const end = new Date(start);
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    end.setUTCDate(end.getUTCDate() - 1);

    ctaps.push({ start: new Date(start), end: new Date(end) });

    // Next CTAP starts the day after this one ends
    const nextStart = new Date(end);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    start = nextStart;
  }

  return ctaps;
}

/**
 * Determine the anchor date for the next CTAP to generate.
 *
 * Uses whichever is later:
 * - The day after the latest CT600 filing's endDate (the chain)
 * - The company's ctapStartDate (the manual anchor, set during onboarding or re-registration)
 *
 * @param latestCt600EndDate - endDate of the most recent CT600 filing, or null
 * @param ctapStartDate - Company's stored CTAP anchor date, or null
 * @returns The start date for the next CTAP, or null if neither source is available
 */
export function getNextCtapStart(
  latestCt600EndDate: Date | null,
  ctapStartDate: Date | null,
): Date | null {
  const fromChain = latestCt600EndDate
    ? new Date(latestCt600EndDate.getTime())
    : null;
  if (fromChain) {
    fromChain.setUTCDate(fromChain.getUTCDate() + 1);
  }

  if (fromChain && ctapStartDate) {
    return fromChain.getTime() >= ctapStartDate.getTime() ? fromChain : ctapStartDate;
  }

  return fromChain ?? ctapStartDate;
}

export interface Ct600Ctap {
  start: Date;
  end: Date;
  deadline: Date;
}

/**
 * Single source of truth for CT600 CTAP generation. Wraps computeCtaps
 * (12-month chunks + short final remainder) and stamps every CTAP in the
 * period of accounts with the SAME filing deadline (12 months after the
 * period-of-accounts end — never the CTAP end).
 */
export function generateCt600Ctaps(input: {
  accountsPeriodStart: Date;
  accountsPeriodEnd: Date;
  anchor: Date | null;
}): Ct600Ctap[] {
  const { accountsPeriodStart, accountsPeriodEnd, anchor } = input;
  // CTAPs start at the CT anchor if set, else the accounts-period start
  const start = anchor ?? accountsPeriodStart;
  if (start.getTime() > accountsPeriodEnd.getTime()) return [];
  const deadline = calculateCT600Deadline(accountsPeriodEnd);
  return computeCtaps(start, accountsPeriodEnd).map((r) => ({
    start: new Date(r.start),
    // computeCtaps' final chunk may run past the accounts end — clamp it.
    end: r.end.getTime() > accountsPeriodEnd.getTime() ? new Date(accountsPeriodEnd) : r.end,
    deadline: new Date(deadline),
  }));
}

export function validateCtapChain(input: {
  accountsPeriodStart: Date;
  accountsPeriodEnd: Date;
  periods: { start: Date; end: Date }[];
}): string[] {
  const { accountsPeriodStart, accountsPeriodEnd, periods } = input;
  const errs: string[] = [];
  if (periods.length === 0) return ["At least one period is required."];
  const sorted = [...periods].sort((a, b) => a.start.getTime() - b.start.getTime());
  if (sorted[0].start.getTime() !== accountsPeriodStart.getTime())
    errs.push("The first period must start on the period-of-accounts start date.");
  if (sorted[sorted.length - 1].end.getTime() !== accountsPeriodEnd.getTime())
    errs.push("The last period must end on the period-of-accounts end date.");
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (p.end.getTime() < p.start.getTime()) errs.push(`Period ${i + 1}: end is before start.`);
    const max = new Date(p.start);
    max.setUTCFullYear(max.getUTCFullYear() + 1);
    max.setUTCDate(max.getUTCDate() - 1);
    if (p.end.getTime() > max.getTime())
      errs.push(`Period ${i + 1}: a CT accounting period cannot exceed 12 months.`);
    if (i > 0) {
      const prevEndPlus1 = new Date(sorted[i - 1].end);
      prevEndPlus1.setUTCDate(prevEndPlus1.getUTCDate() + 1);
      if (p.start.getTime() !== prevEndPlus1.getTime())
        errs.push(`Period ${i + 1}: must start the day after the previous period ends (no gaps or overlaps).`);
    }
  }
  return errs;
}

const PROTECTED_STATUSES = new Set([
  "submitted", "accepted", "rejected", "failed", "filed_elsewhere",
]);

/** True if a generator must NOT (re)generate CT600s for this accounts span. */
export function spanHasProtectedCt600(
  span: { accountsPeriodStart: Date; accountsPeriodEnd: Date },
  ct600Filings: { status: string; ctapUserEdited: boolean; periodStart: Date; periodEnd: Date }[],
): boolean {
  return ct600Filings.some((f) => {
    const inSpan =
      f.periodStart.getTime() >= span.accountsPeriodStart.getTime() &&
      f.periodEnd.getTime() <= span.accountsPeriodEnd.getTime();
    return inSpan && (PROTECTED_STATUSES.has(f.status) || f.ctapUserEdited);
  });
}

