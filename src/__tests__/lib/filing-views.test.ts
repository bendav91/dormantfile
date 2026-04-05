import { describe, it, expect, vi } from "vitest";
import {
  buildFilingViews,
  getOutstandingCount,
  getEarliestDeadline,
  type FilingRecord,
} from "@/lib/filing-views";

function filing(overrides: Partial<FilingRecord> = {}): FilingRecord {
  return {
    id: "filing-1",
    companyId: "comp-1",
    filingType: "accounts",
    periodStart: new Date("2024-04-01"),
    periodEnd: new Date("2025-03-31"),
    startDate: null,
    endDate: null,
    status: "outstanding",
    deadline: new Date("2025-12-31"),
    suppressedAt: null,
    correlationId: null,
    submittedAt: null,
    confirmedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("buildFilingViews", () => {
  it("filters by filing type", () => {
    const filings = [
      filing({ id: "a", filingType: "accounts" }),
      filing({ id: "c", filingType: "ct600" }),
    ];
    const views = buildFilingViews(filings, "accounts");
    expect(views).toHaveLength(1);
    expect(views[0].filing.id).toBe("a");
  });

  it("marks filed filings correctly", () => {
    const views = buildFilingViews([filing({ status: "accepted" })], "accounts");
    expect(views[0].isFiled).toBe(true);
    expect(views[0].isOverdue).toBe(false);
  });

  it("marks outstanding filings as not filed", () => {
    const views = buildFilingViews([filing({ status: "outstanding" })], "accounts");
    expect(views[0].isFiled).toBe(false);
  });

  it("marks overdue filings", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));

    const views = buildFilingViews(
      [filing({ deadline: new Date("2025-12-31") })],
      "accounts",
    );
    expect(views[0].isOverdue).toBe(true);

    vi.useRealTimers();
  });

  it("does not mark suppressed filings as overdue", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));

    const views = buildFilingViews(
      [filing({ deadline: new Date("2025-12-31"), suppressedAt: new Date("2026-01-01") })],
      "accounts",
    );
    expect(views[0].isSuppressed).toBe(true);
    expect(views[0].isOverdue).toBe(false);

    vi.useRealTimers();
  });

  it("computes hasEarlierGaps for accounts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));

    const views = buildFilingViews(
      [
        filing({
          id: "a1",
          periodStart: new Date("2023-04-01"),
          periodEnd: new Date("2024-03-31"),
          deadline: new Date("2024-12-31"),
        }),
        filing({
          id: "a2",
          periodStart: new Date("2024-04-01"),
          periodEnd: new Date("2025-03-31"),
          deadline: new Date("2025-12-31"),
        }),
      ],
      "accounts",
    );
    expect(views[0].hasEarlierGaps).toBe(false);
    expect(views[1].hasEarlierGaps).toBe(true);

    vi.useRealTimers();
  });

  it("does not count suppressed filings as earlier gaps", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));

    const views = buildFilingViews(
      [
        filing({
          id: "a1",
          periodStart: new Date("2023-04-01"),
          periodEnd: new Date("2024-03-31"),
          deadline: new Date("2024-12-31"),
          suppressedAt: new Date("2026-01-01"),
        }),
        filing({
          id: "a2",
          periodStart: new Date("2024-04-01"),
          periodEnd: new Date("2025-03-31"),
          deadline: new Date("2025-12-31"),
        }),
      ],
      "accounts",
    );
    expect(views[0].isSuppressed).toBe(true);
    expect(views[1].hasEarlierGaps).toBe(false);

    vi.useRealTimers();
  });

  it("computes disclosure and blocked territory", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const views = buildFilingViews(
      [
        filing({
          periodStart: new Date("2018-04-01"),
          periodEnd: new Date("2019-03-31"),
          deadline: new Date("2019-12-31"),
        }),
      ],
      "accounts",
    );
    expect(views[0].isBlockedTerritory).toBe(true);
    expect(views[0].isDisclosureTerritory).toBe(true);

    vi.useRealTimers();
  });

  it("sorts chronologically by effective end date", () => {
    const views = buildFilingViews(
      [
        filing({
          id: "b",
          periodStart: new Date("2025-04-01"),
          periodEnd: new Date("2026-03-31"),
          deadline: new Date("2026-12-31"),
        }),
        filing({
          id: "a",
          periodStart: new Date("2024-04-01"),
          periodEnd: new Date("2025-03-31"),
          deadline: new Date("2025-12-31"),
        }),
      ],
      "accounts",
    );
    expect(views[0].filing.id).toBe("a");
    expect(views[1].filing.id).toBe("b");
  });

  it("uses startDate/endDate for CT600 sorting", () => {
    const views = buildFilingViews(
      [
        filing({
          id: "c2",
          filingType: "ct600",
          periodEnd: new Date("2026-03-31"),
          endDate: new Date("2026-06-30"),
        }),
        filing({
          id: "c1",
          filingType: "ct600",
          periodEnd: new Date("2026-03-31"),
          endDate: new Date("2025-06-30"),
        }),
      ],
      "ct600",
    );
    expect(views[0].filing.id).toBe("c1");
    expect(views[1].filing.id).toBe("c2");
  });
});

describe("getOutstandingCount", () => {
  it("counts unfiled unsuppressed filings of the given type", () => {
    const filings = [
      filing({ id: "a1", status: "outstanding" }),
      filing({ id: "a2", status: "accepted" }),
      filing({ id: "a3", status: "outstanding", suppressedAt: new Date() }),
      filing({ id: "c1", filingType: "ct600", status: "outstanding" }),
    ];
    expect(getOutstandingCount(filings, "accounts")).toBe(1);
    expect(getOutstandingCount(filings, "ct600")).toBe(1);
  });
});

describe("getEarliestDeadline", () => {
  it("returns earliest deadline across unfiled filings", () => {
    const filings = [
      filing({ id: "a1", deadline: new Date("2026-01-01") }),
      filing({ id: "a2", deadline: new Date("2025-06-01") }),
      filing({ id: "a3", status: "accepted", deadline: new Date("2024-01-01") }),
    ];
    expect(getEarliestDeadline(filings)).toBe(new Date("2025-06-01").getTime());
  });

  it("returns Infinity when all filings are filed", () => {
    const filings = [filing({ status: "accepted" })];
    expect(getEarliestDeadline(filings)).toBe(Infinity);
  });
});
