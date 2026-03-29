import type { PeriodInfo } from "@/lib/periods";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface FilingLike {
  status: string;
  confirmedAt: Date | null;
}

interface CompanyForCounts {
  periods: PeriodInfo[];
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

export function matchesNeedsAttention(periods: PeriodInfo[], registeredForCorpTax: boolean): boolean {
  const now = Date.now();
  return periods.some((p) => {
    if (p.isComplete) return false;
    if (p.isOverdue) return true;
    const accountsDueSoon =
      !p.accountsFiled &&
      p.accountsDeadline.getTime() >= now &&
      p.accountsDeadline.getTime() <= now + THIRTY_DAYS_MS;
    const ct600DueSoon =
      registeredForCorpTax &&
      !p.ct600Filed &&
      p.ct600Deadline.getTime() >= now &&
      p.ct600Deadline.getTime() <= now + THIRTY_DAYS_MS;
    return accountsDueSoon || ct600DueSoon;
  });
}

export function matchesRecentlyFiled(filings: FilingLike[]): boolean {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return filings.some(
    (f) => f.status === "accepted" && f.confirmedAt && f.confirmedAt.getTime() >= cutoff,
  );
}

export function matchesIssues(filings: FilingLike[]): boolean {
  return filings.some((f) => f.status === "rejected" || f.status === "failed");
}

export function computeFilterCounts(companies: CompanyForCounts[]): FilterCounts {
  const counts: FilterCounts = { all: 0, needsAttention: 0, recentlyFiled: 0, issues: 0 };
  for (const c of companies) {
    counts.all++;
    if (matchesNeedsAttention(c.periods, c.registeredForCorpTax)) counts.needsAttention++;
    if (matchesRecentlyFiled(c.filings)) counts.recentlyFiled++;
    if (matchesIssues(c.filings)) counts.issues++;
  }
  return counts;
}

export function matchesFilter(
  filter: FilterType,
  periods: PeriodInfo[],
  registeredForCorpTax: boolean,
  filings: FilingLike[],
): boolean {
  switch (filter) {
    case "needs-attention":
      return matchesNeedsAttention(periods, registeredForCorpTax);
    case "recently-filed":
      return matchesRecentlyFiled(filings);
    case "issues":
      return matchesIssues(filings);
    case "":
      return true;
  }
}
