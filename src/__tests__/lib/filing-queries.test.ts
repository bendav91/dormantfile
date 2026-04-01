import { describe, it, expect, vi } from "vitest";
import { buildPeriodViews, type FilingRecord } from "@/lib/filing-queries";

function filing(overrides: Partial<FilingRecord> = {}): FilingRecord {
  return {
    id: "filing-1",
    companyId: "comp-1",
    filingType: "accounts",
    periodId: null,
    periodStart: new Date("2024-04-01"),
    periodEnd: new Date("2025-03-31"),
    startDate: null,
    endDate: null,
    status: "outstanding",
    deadline: null,
    accountsDeadline: new Date("2025-12-31"),
    ct600Deadline: new Date("2026-03-31"),
    suppressedAt: null,
    correlationId: null,
    submittedAt: null,
    confirmedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("buildPeriodViews", () => {
  it("groups accounts and ct600 filings into a single period", () => {
    const filings = [
      filing({ id: "a", filingType: "accounts" }),
      filing({ id: "c", filingType: "ct600" }),
    ];
    const views = buildPeriodViews(filings);
    expect(views).toHaveLength(1);
    expect(views[0].accountsFiling?.id).toBe("a");
    expect(views[0].ct600Filings[0]?.id).toBe("c");
  });

  it("marks period as complete when accounts is accepted", () => {
    const filings = [filing({ status: "accepted" })];
    const views = buildPeriodViews(filings);
    expect(views[0].isComplete).toBe(true);
    expect(views[0].accountsFiled).toBe(true);
  });

  it("marks period as incomplete when accounts is outstanding", () => {
    const filings = [filing({ status: "outstanding" })];
    const views = buildPeriodViews(filings);
    expect(views[0].isComplete).toBe(false);
  });

  it("marks period as overdue when deadline has passed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));

    const filings = [filing({ accountsDeadline: new Date("2025-12-31") })];
    const views = buildPeriodViews(filings);
    expect(views[0].isOverdue).toBe(true);

    vi.useRealTimers();
  });

  it("does not mark suppressed period as overdue", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));

    const filings = [
      filing({
        accountsDeadline: new Date("2025-12-31"),
        suppressedAt: new Date("2026-01-01"),
      }),
    ];
    const views = buildPeriodViews(filings);
    expect(views[0].isSuppressed).toBe(true);
    expect(views[0].isOverdue).toBe(false);

    vi.useRealTimers();
  });

  it("computes hasEarlierGaps correctly", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));

    const filings = [
      filing({
        id: "a1",
        periodStart: new Date("2023-04-01"),
        periodEnd: new Date("2024-03-31"),
        accountsDeadline: new Date("2024-12-31"),
      }),
      filing({
        id: "a2",
        periodStart: new Date("2024-04-01"),
        periodEnd: new Date("2025-03-31"),
        accountsDeadline: new Date("2025-12-31"),
      }),
    ];
    const views = buildPeriodViews(filings);
    expect(views[0].hasEarlierGaps).toBe(false);
    expect(views[1].hasEarlierGaps).toBe(true);

    vi.useRealTimers();
  });

  it("does not count suppressed periods as earlier gaps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));

    const filings = [
      filing({
        id: "a1",
        periodStart: new Date("2023-04-01"),
        periodEnd: new Date("2024-03-31"),
        accountsDeadline: new Date("2024-12-31"),
        suppressedAt: new Date("2026-01-01"),
      }),
      filing({
        id: "a2",
        periodStart: new Date("2024-04-01"),
        periodEnd: new Date("2025-03-31"),
        accountsDeadline: new Date("2025-12-31"),
      }),
    ];
    const views = buildPeriodViews(filings);
    expect(views[0].isSuppressed).toBe(true);
    expect(views[1].hasEarlierGaps).toBe(false);

    vi.useRealTimers();
  });

  it("computes blocked and disclosure territory", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const filings = [
      filing({
        periodStart: new Date("2018-04-01"),
        periodEnd: new Date("2019-03-31"),
        accountsDeadline: new Date("2019-12-31"),
      }),
    ];
    const views = buildPeriodViews(filings);
    expect(views[0].isBlockedTerritory).toBe(true);
    expect(views[0].isDisclosureTerritory).toBe(true);

    vi.useRealTimers();
  });

  it("sorts periods chronologically", () => {
    const filings = [
      filing({
        id: "b",
        periodStart: new Date("2025-04-01"),
        periodEnd: new Date("2026-03-31"),
        accountsDeadline: new Date("2026-12-31"),
      }),
      filing({
        id: "a",
        periodStart: new Date("2024-04-01"),
        periodEnd: new Date("2025-03-31"),
        accountsDeadline: new Date("2025-12-31"),
      }),
    ];
    const views = buildPeriodViews(filings);
    expect(views[0].periodEnd).toEqual(new Date("2025-03-31"));
    expect(views[1].periodEnd).toEqual(new Date("2026-03-31"));
  });
});
