import { describe, it, expect, vi } from "vitest";
import {
  matchesNeedsAttention,
  matchesRecentlyFiled,
  matchesIssues,
  computeFilterCounts,
} from "@/lib/dashboard-filters";

function filing(overrides: Record<string, unknown> = {}) {
  return {
    filingType: "accounts" as string,
    status: "outstanding" as string,
    deadline: new Date("2026-01-01") as Date | null,
    accountsDeadline: null as Date | null,
    ct600Deadline: null as Date | null,
    suppressedAt: null as Date | null,
    confirmedAt: null as Date | null,
    ...overrides,
  };
}

describe("matchesNeedsAttention", () => {
  it("returns true when a filing is overdue", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));
    const filings = [filing({ deadline: new Date("2025-12-31") })];
    expect(matchesNeedsAttention(filings, false)).toBe(true);
    vi.useRealTimers();
  });

  it("returns true when accounts deadline is within 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10"));
    const filings = [filing({ deadline: new Date("2026-01-20") })];
    expect(matchesNeedsAttention(filings, false)).toBe(true);
    vi.useRealTimers();
  });

  it("returns true when ct600 deadline is within 30 days for corp tax company", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15"));
    const filings = [filing({ filingType: "ct600", deadline: new Date("2026-03-31") })];
    expect(matchesNeedsAttention(filings, true)).toBe(true);
    vi.useRealTimers();
  });

  it("returns false when ct600 is due soon but company not registered for corp tax", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15"));
    const filings = [filing({ filingType: "ct600", deadline: new Date("2026-03-31") })];
    expect(matchesNeedsAttention(filings, false)).toBe(false);
    vi.useRealTimers();
  });

  it("returns false when all filings are accepted", () => {
    const filings = [filing({ status: "accepted", deadline: new Date("2025-01-01") })];
    expect(matchesNeedsAttention(filings, false)).toBe(false);
  });

  it("returns false when no deadlines are near", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01"));
    const filings = [filing({ deadline: new Date("2026-01-01") })];
    expect(matchesNeedsAttention(filings, false)).toBe(false);
    vi.useRealTimers();
  });

  it("returns false when filing is suppressed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));
    const filings = [filing({ deadline: new Date("2025-12-31"), suppressedAt: new Date() })];
    expect(matchesNeedsAttention(filings, false)).toBe(false);
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
        registeredForCorpTax: false,
        filings: [
          filing({ status: "outstanding", deadline: new Date("2025-12-31") }),
          filing({ status: "accepted", confirmedAt: new Date("2026-03-15") }),
        ],
      },
      {
        registeredForCorpTax: false,
        filings: [filing({ status: "rejected", deadline: new Date("2027-01-01") })],
      },
      {
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
