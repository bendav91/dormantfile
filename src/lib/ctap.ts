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

