import { describe, it, expect, vi } from "vitest";
import {
  matchesNeedsAttention,
  matchesRecentlyFiled,
  matchesIssues,
  computeFilterCounts,
} from "@/lib/dashboard-filters";
import type { PeriodView } from "@/lib/filing-queries";

function filing(overrides: Record<string, unknown> = {}) {
  return {
    status: "pending" as string,
    confirmedAt: null as Date | null,
    filingType: "accounts" as string,
    periodStart: new Date("2024-04-01"),
    periodEnd: new Date("2025-03-31"),
    ...overrides,
  };
}

function period(overrides: Partial<PeriodView> = {}): PeriodView {
  return {
    periodId: "period-1",
    periodStart: new Date("2024-04-01"),
    periodEnd: new Date("2025-03-31"),
    accountsDeadline: new Date("2026-01-01"),
    ct600Deadline: new Date("2026-03-31"),
    accountsFiling: null,
    ct600Filings: [],
    accountsFiled: false,
    ct600Filed: false,
    isComplete: false,
    isOverdue: false,
    isSuppressed: false,
    hasEarlierGaps: false,
    isDisclosureTerritory: false,
    isBlockedTerritory: false,
    ...overrides,
  };
}

describe("matchesNeedsAttention", () => {
  it("returns true when a period is overdue", () => {
    const periods = [period({ isOverdue: true })];
    expect(matchesNeedsAttention(periods, false)).toBe(true);
  });

  it("returns true when accounts deadline is within 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10"));
    const periods = [period({ accountsDeadline: new Date("2026-01-20") })];
    expect(matchesNeedsAttention(periods, false)).toBe(true);
    vi.useRealTimers();
  });

  it("returns true when ct600 deadline is within 30 days for corp tax company", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15"));
    const periods = [period({ ct600Deadline: new Date("2026-03-31") })];
    expect(matchesNeedsAttention(periods, true)).toBe(true);
    vi.useRealTimers();
  });

  it("returns false when ct600 is due soon but company not registered for corp tax", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15"));
    const periods = [
      period({ ct600Deadline: new Date("2026-03-31"), accountsDeadline: new Date("2027-01-01") }),
    ];
    expect(matchesNeedsAttention(periods, false)).toBe(false);
    vi.useRealTimers();
  });

  it("returns false when all periods are complete", () => {
    const periods = [period({ isComplete: true, isOverdue: true })];
    expect(matchesNeedsAttention(periods, false)).toBe(false);
  });

  it("returns false when no deadlines are near", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01"));
    const periods = [
      period({ accountsDeadline: new Date("2026-01-01"), ct600Deadline: new Date("2026-03-31") }),
    ];
    expect(matchesNeedsAttention(periods, false)).toBe(false);
    vi.useRealTimers();
  });
});

describe("matchesRecentlyFiled", () => {
  it("returns true when a filing was accepted within 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));
    const filings = [filing({ status: "accepted", confirmedAt: new Date("2026-03-15") })];
    expect(matchesRecentlyFiled(filings)).toBe(true);
    vi.useRealTimers();
  });

  it("returns false when accepted filing is older than 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));
    const filings = [filing({ status: "accepted", confirmedAt: new Date("2026-01-01") })];
    expect(matchesRecentlyFiled(filings)).toBe(false);
    vi.useRealTimers();
  });

  it("returns false when filing is not accepted", () => {
    const filings = [filing({ status: "submitted", confirmedAt: new Date() })];
    expect(matchesRecentlyFiled(filings)).toBe(false);
  });
});

describe("matchesIssues", () => {
  it("returns true when a filing is rejected", () => {
    expect(matchesIssues([filing({ status: "rejected" })])).toBe(true);
  });

  it("returns true when a filing is failed", () => {
    expect(matchesIssues([filing({ status: "failed" })])).toBe(true);
  });

  it("returns false when all filings are accepted", () => {
    expect(matchesIssues([filing({ status: "accepted" })])).toBe(false);
  });

  it("returns false with no filings", () => {
    expect(matchesIssues([])).toBe(false);
  });
});

describe("computeFilterCounts", () => {
  it("counts companies matching each filter", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const companies = [
      {
        periods: [period({ isOverdue: true })],
        registeredForCorpTax: false,
        filings: [filing({ status: "accepted", confirmedAt: new Date("2026-03-15") })],
      },
      {
        periods: [period({ isComplete: true })],
        registeredForCorpTax: false,
        filings: [filing({ status: "rejected" })],
      },
      {
        periods: [period()],
        registeredForCorpTax: false,
        filings: [],
      },
    ];

    const counts = computeFilterCounts(companies);
    expect(counts.all).toBe(3);
    expect(counts.needsAttention).toBe(1);
    expect(counts.recentlyFiled).toBe(1);
    expect(counts.issues).toBe(1);

    vi.useRealTimers();
  });
});
