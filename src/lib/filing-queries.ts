import type { FilingStatus, FilingType } from "@prisma/client";

export interface FilingRecord {
  id: string;
  companyId: string;
  filingType: FilingType;
  periodStart: Date;
  periodEnd: Date;
  status: FilingStatus;
  accountsDeadline: Date | null;
  ct600Deadline: Date | null;
  suppressedAt: Date | null;
  correlationId: string | null;
  submittedAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
}

export interface PeriodView {
  periodStart: Date;
  periodEnd: Date;
  accountsDeadline: Date;
  ct600Deadline: Date;
  accountsFiling: FilingRecord | null;
  ct600Filing: FilingRecord | null;
  accountsFiled: boolean;
  ct600Filed: boolean;
  isComplete: boolean;
  hasEarlierGaps: boolean;
  isDisclosureTerritory: boolean;
  isBlockedTerritory: boolean;
  isOverdue: boolean;
  isSuppressed: boolean;
}

/**
 * Builds PeriodView objects from raw Filing records.
 * Groups filings by period (periodStart/periodEnd) and derives
 * display flags from stored data. Replaces getOutstandingPeriods().
 */
export function buildPeriodViews(filings: FilingRecord[]): PeriodView[] {
  const now = new Date();
  const fourYearsAgo = new Date(now);
  fourYearsAgo.setUTCFullYear(fourYearsAgo.getUTCFullYear() - 4);
  const sixYearsAgo = new Date(now);
  sixYearsAgo.setUTCFullYear(sixYearsAgo.getUTCFullYear() - 6);

  // Group filings by period end timestamp
  const periodMap = new Map<
    number,
    {
      accounts: FilingRecord | null;
      ct600: FilingRecord | null;
      periodStart: Date;
      periodEnd: Date;
    }
  >();

  for (const f of filings) {
    const key = f.periodEnd.getTime();
    if (!periodMap.has(key)) {
      periodMap.set(key, {
        accounts: null,
        ct600: null,
        periodStart: f.periodStart,
        periodEnd: f.periodEnd,
      });
    }
    const group = periodMap.get(key)!;
    if (f.filingType === "accounts") group.accounts = f;
    else if (f.filingType === "ct600") group.ct600 = f;
  }

  // Sort by period end (chronological)
  const sortedPeriods = [...periodMap.values()].sort(
    (a, b) => a.periodEnd.getTime() - b.periodEnd.getTime(),
  );

  const periods: PeriodView[] = [];

  for (const group of sortedPeriods) {
    const accountsFiled = group.accounts?.status === "accepted";
    const ct600Filed = group.ct600?.status === "accepted";
    const isComplete = accountsFiled;

    // Suppressed if the accounts filing has suppressedAt set
    const isSuppressed = group.accounts?.suppressedAt != null;

    // Use stored deadlines, fall back to period end if missing
    const accountsDeadline = group.accounts?.accountsDeadline ?? group.periodEnd;
    const ct600Deadline =
      group.accounts?.ct600Deadline ?? group.ct600?.ct600Deadline ?? group.periodEnd;

    const isOverdue = !isComplete && !isSuppressed && accountsDeadline.getTime() < now.getTime();

    periods.push({
      periodStart: group.periodStart,
      periodEnd: group.periodEnd,
      accountsDeadline,
      ct600Deadline,
      accountsFiling: group.accounts,
      ct600Filing: group.ct600,
      accountsFiled,
      ct600Filed,
      isComplete,
      hasEarlierGaps: false, // computed below
      isDisclosureTerritory: group.periodEnd.getTime() <= fourYearsAgo.getTime(),
      isBlockedTerritory: group.periodEnd.getTime() <= sixYearsAgo.getTime(),
      isOverdue,
      isSuppressed,
    });
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
