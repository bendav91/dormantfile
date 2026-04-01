import type { FilingStatus, FilingType } from "@prisma/client";

export interface FilingRecord {
  id: string;
  companyId: string;
  filingType: FilingType;
  periodId: string | null;
  periodStart: Date;
  periodEnd: Date;
  startDate: Date | null;
  endDate: Date | null;
  status: FilingStatus;
  deadline: Date | null;
  accountsDeadline: Date | null;
  ct600Deadline: Date | null;
  suppressedAt: Date | null;
  correlationId: string | null;
  submittedAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
}

export interface PeriodInput {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  accountsDeadline: Date;
}

export interface PeriodView {
  periodId: string;
  periodStart: Date;
  periodEnd: Date;
  accountsDeadline: Date;
  ct600Deadline: Date;
  accountsFiling: FilingRecord | null;
  ct600Filings: FilingRecord[];
  accountsFiled: boolean;
  ct600Filed: boolean;
  isComplete: boolean;
  hasEarlierGaps: boolean;
  isDisclosureTerritory: boolean;
  isBlockedTerritory: boolean;
  isOverdue: boolean;
  isSuppressed: boolean;
}

function isFiled(status: FilingStatus): boolean {
  return status === "accepted" || status === "filed_elsewhere";
}

/**
 * Builds PeriodView objects from Period + Filing records.
 *
 * When Period records are available (new model), groups by periodId.
 * Falls back to grouping by periodEnd timestamp for backward compatibility.
 */
export function buildPeriodViews(filings: FilingRecord[], periods?: PeriodInput[]): PeriodView[] {
  const now = new Date();
  const fourYearsAgo = new Date(now);
  fourYearsAgo.setUTCFullYear(fourYearsAgo.getUTCFullYear() - 4);
  const sixYearsAgo = new Date(now);
  sixYearsAgo.setUTCFullYear(sixYearsAgo.getUTCFullYear() - 6);

  // If we have Period records, use periodId-based grouping (new model)
  if (periods && periods.length > 0) {
    return buildFromPeriods(periods, filings, now, fourYearsAgo, sixYearsAgo);
  }

  // Fallback: group by periodEnd timestamp (old model, backward compat)
  return buildFromFilings(filings, now, fourYearsAgo, sixYearsAgo);
}

function buildFromPeriods(
  periods: PeriodInput[],
  filings: FilingRecord[],
  now: Date,
  fourYearsAgo: Date,
  sixYearsAgo: Date,
): PeriodView[] {
  // Index filings by periodId
  const filingsByPeriod = new Map<string, FilingRecord[]>();
  for (const f of filings) {
    const key = f.periodId;
    if (!key) continue;
    if (!filingsByPeriod.has(key)) filingsByPeriod.set(key, []);
    filingsByPeriod.get(key)!.push(f);
  }

  // Sort periods chronologically
  const sorted = [...periods].sort(
    (a, b) => a.periodEnd.getTime() - b.periodEnd.getTime(),
  );

  const views: PeriodView[] = [];

  for (const period of sorted) {
    const periodFilings = filingsByPeriod.get(period.id) ?? [];
    const accountsFiling = periodFilings.find((f) => f.filingType === "accounts") ?? null;
    const ct600Filings = periodFilings.filter((f) => f.filingType === "ct600");

    const accountsFiled = accountsFiling ? isFiled(accountsFiling.status) : false;
    const ct600Filed =
      ct600Filings.length > 0 && ct600Filings.every((f) => isFiled(f.status));

    const isComplete = accountsFiled;
    const isSuppressed = accountsFiling?.suppressedAt != null;

    const accountsDeadline = accountsFiling?.deadline ?? period.accountsDeadline;

    // CT600 deadline: use the first outstanding CT600's deadline, or the first CT600's deadline
    const ct600Deadline =
      ct600Filings.find((f) => !isFiled(f.status))?.deadline ??
      ct600Filings[0]?.deadline ??
      period.accountsDeadline;

    const isOverdue = !isComplete && !isSuppressed && accountsDeadline.getTime() < now.getTime();

    views.push({
      periodId: period.id,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      accountsDeadline,
      ct600Deadline,
      accountsFiling,
      ct600Filings,
      accountsFiled,
      ct600Filed,
      isComplete,
      hasEarlierGaps: false,
      isDisclosureTerritory: period.periodEnd.getTime() <= fourYearsAgo.getTime(),
      isBlockedTerritory: period.periodEnd.getTime() <= sixYearsAgo.getTime(),
      isOverdue,
      isSuppressed,
    });
  }

  computeEarlierGaps(views);
  return views;
}

/**
 * Backward-compatible: group by periodEnd timestamp (old model).
 */
function buildFromFilings(
  filings: FilingRecord[],
  now: Date,
  fourYearsAgo: Date,
  sixYearsAgo: Date,
): PeriodView[] {
  const periodMap = new Map<
    number,
    {
      accounts: FilingRecord | null;
      ct600Filings: FilingRecord[];
      periodStart: Date;
      periodEnd: Date;
    }
  >();

  for (const f of filings) {
    const key = f.periodEnd.getTime();
    if (!periodMap.has(key)) {
      periodMap.set(key, {
        accounts: null,
        ct600Filings: [],
        periodStart: f.periodStart,
        periodEnd: f.periodEnd,
      });
    }
    const group = periodMap.get(key)!;
    if (f.filingType === "accounts") group.accounts = f;
    else if (f.filingType === "ct600") group.ct600Filings.push(f);
  }

  const sortedPeriods = [...periodMap.values()].sort(
    (a, b) => a.periodEnd.getTime() - b.periodEnd.getTime(),
  );

  const views: PeriodView[] = [];

  for (const group of sortedPeriods) {
    const accountsFiled = group.accounts ? isFiled(group.accounts.status) : false;
    const ct600Filed =
      group.ct600Filings.length > 0 && group.ct600Filings.every((f) => isFiled(f.status));
    const isComplete = accountsFiled;
    const isSuppressed = group.accounts?.suppressedAt != null;

    const accountsDeadline =
      group.accounts?.deadline ?? group.accounts?.accountsDeadline ?? group.periodEnd;
    const ct600Deadline =
      group.ct600Filings[0]?.deadline ??
      group.accounts?.ct600Deadline ??
      group.ct600Filings[0]?.ct600Deadline ??
      group.periodEnd;

    const isOverdue = !isComplete && !isSuppressed && accountsDeadline.getTime() < now.getTime();

    views.push({
      periodId: group.accounts?.periodId ?? group.ct600Filings[0]?.periodId ?? "",
      periodStart: group.periodStart,
      periodEnd: group.periodEnd,
      accountsDeadline,
      ct600Deadline,
      accountsFiling: group.accounts,
      ct600Filings: group.ct600Filings,
      accountsFiled,
      ct600Filed,
      isComplete,
      hasEarlierGaps: false,
      isDisclosureTerritory: group.periodEnd.getTime() <= fourYearsAgo.getTime(),
      isBlockedTerritory: group.periodEnd.getTime() <= sixYearsAgo.getTime(),
      isOverdue,
      isSuppressed,
    });
  }

  computeEarlierGaps(views);
  return views;
}

function computeEarlierGaps(periods: PeriodView[]): void {
  let hasSeenIncomplete = false;
  for (const period of periods) {
    if (hasSeenIncomplete) {
      period.hasEarlierGaps = true;
    }
    if (!period.isComplete && !period.isSuppressed) {
      hasSeenIncomplete = true;
    }
  }
}
