import { calculateAccountsDeadline, calculateCT600Deadline } from "@/lib/utils";

export interface PeriodInfo {
  periodStart: Date;
  periodEnd: Date;
  accountsDeadline: Date;
  ct600Deadline: Date;
  accountsFiled: boolean;
  ct600Filed: boolean;
  /** All required filings for this period are accepted */
  isComplete: boolean;
  /** Unfiled periods exist before this one */
  hasEarlierGaps: boolean;
  /** Period ended more than 4 years ago — HMRC disclosure territory */
  isDisclosureTerritory: boolean;
  /** Period ended more than 6 years ago — filing blocked, professional advice needed */
  isBlockedTerritory: boolean;
  /** At least one filing deadline has passed */
  isOverdue: boolean;
  /** Period has been suppressed by the user */
  isSuppressed: boolean;
}

/**
 * Computes all accounting periods from the company's current (oldest unfiled)
 * period forward to the present, cross-referenced with filing history.
 *
 * The company's stored `accountingPeriodStart`/`accountingPeriodEnd` always
 * represents the oldest unfiled period. We generate successive annual periods
 * until `periodEnd` exceeds today.
 */
export function getOutstandingPeriods(
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  registeredForCorpTax: boolean,
  filings: Array<{
    periodStart: Date;
    periodEnd: Date;
    filingType: string;
    status: string;
  }>,
  options?: {
    dateOfCreation?: Date | null;
    accountsDueOn?: Date | null;
    suppressedPeriodEnds?: Set<number>;
  },
): PeriodInfo[] {
  const now = new Date();
  const fourYearsAgo = new Date(now);
  fourYearsAgo.setUTCFullYear(fourYearsAgo.getUTCFullYear() - 4);
  const sixYearsAgo = new Date(now);
  sixYearsAgo.setUTCFullYear(sixYearsAgo.getUTCFullYear() - 6);

  const dateOfCreation = options?.dateOfCreation ?? undefined;
  const accountsDueOn = options?.accountsDueOn ?? undefined;
  const suppressedPeriodEnds = options?.suppressedPeriodEnds ?? new Set<number>();

  const periods: PeriodInfo[] = [];
  let pStart = new Date(currentPeriodStart);
  let pEnd = new Date(currentPeriodEnd);

  // Collect all period ends first so we can identify the last one
  const allPeriodEnds: Date[] = [];
  {
    let tempEnd = new Date(currentPeriodEnd);
    while (tempEnd.getTime() <= now.getTime()) {
      allPeriodEnds.push(new Date(tempEnd));
      tempEnd = new Date(tempEnd);
      tempEnd.setUTCFullYear(tempEnd.getUTCFullYear() + 1);
    }
  }
  const lastPeriodEnd = allPeriodEnds.length > 0 ? allPeriodEnds[allPeriodEnds.length - 1] : null;

  // Generate periods until the period end is in the future
  while (pEnd.getTime() <= now.getTime()) {
    const isFirstPeriod =
      dateOfCreation &&
      pStart.getTime() === dateOfCreation.getTime();

    const isLastPeriod =
      lastPeriodEnd && pEnd.getTime() === lastPeriodEnd.getTime();

    // Priority: CH-provided deadline > first-accounts rule > standard 9-month
    let accountsDeadline: Date;
    if (isLastPeriod && accountsDueOn) {
      accountsDeadline = accountsDueOn;
    } else if (isFirstPeriod) {
      accountsDeadline = calculateAccountsDeadline(pEnd, dateOfCreation);
    } else {
      accountsDeadline = calculateAccountsDeadline(pEnd);
    }

    const ct600Deadline = calculateCT600Deadline(pEnd);

    const accountsFiled = filings.some(
      (f) =>
        f.filingType === "accounts" &&
        f.status === "accepted" &&
        f.periodEnd.getTime() === pEnd.getTime(),
    );

    const ct600Filed = filings.some(
      (f) =>
        f.filingType === "ct600" &&
        f.status === "accepted" &&
        f.periodEnd.getTime() === pEnd.getTime(),
    );

    // If accounts are accepted, assume CT600 was handled too — we can't
    // track CT600 status for periods filed before the user enabled corp tax.
    const isComplete = accountsFiled;

    const isSuppressed = suppressedPeriodEnds.has(pEnd.getTime());
    const isOverdue = !isComplete && !isSuppressed && accountsDeadline.getTime() < now.getTime();

    periods.push({
      periodStart: new Date(pStart),
      periodEnd: new Date(pEnd),
      accountsDeadline,
      ct600Deadline,
      accountsFiled,
      ct600Filed,
      isComplete,
      hasEarlierGaps: false, // computed below
      isDisclosureTerritory: pEnd.getTime() <= fourYearsAgo.getTime(),
      isBlockedTerritory: pEnd.getTime() <= sixYearsAgo.getTime(),
      isOverdue,
      isSuppressed,
    });

    // Advance to next annual period
    const nextStart = new Date(pEnd);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    const nextEnd = new Date(pEnd);
    nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);
    pStart = nextStart;
    pEnd = nextEnd;
  }

  // Compute hasEarlierGaps: true if any earlier period is incomplete
  let hasSeenIncomplete = false;
  for (const period of periods) {
    if (hasSeenIncomplete) {
      period.hasEarlierGaps = true;
    }
    if (!period.isComplete) {
      hasSeenIncomplete = true;
    }
  }

  return periods;
}

/**
 * Returns only the periods that still need filing.
 */
export function getIncompletePeriodsCount(periods: PeriodInfo[]): number {
  return periods.filter((p) => !p.isComplete).length;
}
