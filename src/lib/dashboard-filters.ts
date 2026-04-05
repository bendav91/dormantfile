import type { FilingStatus } from "@prisma/client";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function isFiled(status: FilingStatus | string): boolean {
  return status === "accepted" || status === "filed_elsewhere";
}

interface FilingLike {
  filingType: string;
  status: string;
  deadline: Date | null;
  suppressedAt: Date | null;
  confirmedAt: Date | null;
}

interface CompanyForCounts {
  registeredForCorpTax: boolean;
  filings: FilingLike[];
}

export interface FilterCounts {
  all: number;
  needsAttention: number;
  recentlyFiled: number;
  issues: number;
}

export type FilterType = "needs-attention" | "recently-filed" | "issues" | "";

export function matchesNeedsAttention(
  filings: FilingLike[],
  registeredForCorpTax: boolean,
): boolean {
  const now = Date.now();
  return filings.some((f) => {
    if (isFiled(f.status) || f.suppressedAt != null) return false;
    if (f.filingType === "ct600" && !registeredForCorpTax) return false;
    const deadline = f.deadline;
    if (!deadline) return false;
    const dl = deadline.getTime();
    if (dl < now) return true; // overdue
    return dl >= now && dl <= now + THIRTY_DAYS_MS; // due soon
  });
}

export function matchesRecentlyFiled(filings: FilingLike[]): boolean {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return filings.some(
    (f) => isFiled(f.status) && f.confirmedAt && f.confirmedAt.getTime() >= cutoff,
  );
}

export function matchesIssues(filings: FilingLike[]): boolean {
  return filings.some((f) => f.status === "rejected" || f.status === "failed");
}

export function computeFilterCounts(companies: CompanyForCounts[]): FilterCounts {
  const counts: FilterCounts = { all: 0, needsAttention: 0, recentlyFiled: 0, issues: 0 };
  for (const c of companies) {
    counts.all++;
    if (matchesNeedsAttention(c.filings, c.registeredForCorpTax)) counts.needsAttention++;
    if (matchesRecentlyFiled(c.filings)) counts.recentlyFiled++;
    if (matchesIssues(c.filings)) counts.issues++;
  }
  return counts;
}

export function matchesFilter(
  filter: FilterType,
  filings: FilingLike[],
  registeredForCorpTax: boolean,
): boolean {
  switch (filter) {
    case "needs-attention":
      return matchesNeedsAttention(filings, registeredForCorpTax);
    case "recently-filed":
      return matchesRecentlyFiled(filings);
    case "issues":
      return matchesIssues(filings);
    case "":
      return true;
  }
}
