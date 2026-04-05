import type { FilingStatus, FilingType } from "@prisma/client";

export interface FilingRecord {
  id: string;
  companyId: string;
  filingType: FilingType;
  periodStart: Date;
  periodEnd: Date;
  startDate: Date | null;
  endDate: Date | null;
  status: FilingStatus;
  deadline: Date | null;
  suppressedAt: Date | null;
  correlationId: string | null;
  submittedAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
}

export interface FilingView {
  filing: FilingRecord;
  isOverdue: boolean;
  isFiled: boolean;
  isSuppressed: boolean;
  hasEarlierGaps: boolean;
  isDisclosureTerritory: boolean;
  isBlockedTerritory: boolean;
}

function isFiled(status: FilingStatus): boolean {
  return status === "accepted" || status === "filed_elsewhere";
}

function effectiveDeadline(f: FilingRecord): Date {
  return f.deadline ?? f.periodEnd;
}

function effectiveEnd(f: FilingRecord): Date {
  return f.endDate ?? f.periodEnd;
}

/**
 * Build enriched views for a single filing type.
 * Filters by type, sorts chronologically, computes per-filing flags.
 */
export function buildFilingViews(
  filings: FilingRecord[],
  type: "accounts" | "ct600",
): FilingView[] {
  const now = new Date();
  const fourYearsAgo = new Date(now);
  fourYearsAgo.setUTCFullYear(fourYearsAgo.getUTCFullYear() - 4);
  const sixYearsAgo = new Date(now);
  sixYearsAgo.setUTCFullYear(sixYearsAgo.getUTCFullYear() - 6);

  const typed = filings
    .filter((f) => f.filingType === type)
    .sort((a, b) => effectiveEnd(a).getTime() - effectiveEnd(b).getTime());

  // First pass: build views
  const views: FilingView[] = typed.map((f) => {
    const filed = isFiled(f.status);
    const suppressed = f.suppressedAt != null;
    const deadline = effectiveDeadline(f);
    const end = effectiveEnd(f);

    return {
      filing: f,
      isFiled: filed,
      isSuppressed: suppressed,
      isOverdue: !filed && !suppressed && deadline.getTime() < now.getTime(),
      isDisclosureTerritory: end.getTime() <= fourYearsAgo.getTime(),
      isBlockedTerritory: end.getTime() <= sixYearsAgo.getTime(),
      hasEarlierGaps: false,
    };
  });

  // Second pass: compute hasEarlierGaps (only meaningful for accounts)
  if (type === "accounts") {
    let hasSeenIncomplete = false;
    for (const view of views) {
      if (hasSeenIncomplete && !view.isFiled && !view.isSuppressed) {
        view.hasEarlierGaps = true;
      }
      if (!view.isFiled && !view.isSuppressed) {
        hasSeenIncomplete = true;
      }
    }
  }

  return views;
}

/** Count outstanding (unfiled, unsuppressed) filings of a given type. */
export function getOutstandingCount(
  filings: FilingRecord[],
  type: "accounts" | "ct600",
): number {
  return filings.filter(
    (f) => f.filingType === type && !isFiled(f.status) && f.suppressedAt == null,
  ).length;
}

/** Earliest deadline across all unfiled, unsuppressed filings. */
export function getEarliestDeadline(filings: FilingRecord[]): number {
  let earliest = Infinity;
  for (const f of filings) {
    if (isFiled(f.status) || f.suppressedAt != null) continue;
    const d = effectiveDeadline(f);
    if (d.getTime() < earliest) earliest = d.getTime();
  }
  return earliest;
}
