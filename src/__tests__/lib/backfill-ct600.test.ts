import { describe, it, expect } from "vitest";
import { planBackfill } from "../../../scripts/backfill-ct600-ctaps";
import { generateCt600Ctaps } from "@/lib/ctap";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("planBackfill", () => {
  it("is deterministic — same inputs yield a deep-equal plan twice", () => {
    const company = { id: "co1", ctapStartDate: null };
    const accountsPeriods = [{ start: d("2024-02-07"), end: d("2025-02-28") }];
    const existingCt600s = [
      {
        id: "f1",
        status: "outstanding",
        ctapUserEdited: false,
        periodStart: d("2024-02-07"),
        periodEnd: d("2025-02-06"),
      },
    ];

    const a = planBackfill(company, accountsPeriods, existingCt600s);
    const b = planBackfill(company, accountsPeriods, existingCt600s);
    expect(a).toEqual(b);
  });

  it("deletes system-generated outstanding rows and recreates the split CTAPs", () => {
    const company = { id: "co1", ctapStartDate: null };
    const accountsPeriods = [{ start: d("2024-02-07"), end: d("2025-02-28") }];
    const existingCt600s = [
      {
        id: "f1",
        status: "outstanding",
        ctapUserEdited: false,
        periodStart: d("2024-02-07"),
        periodEnd: d("2025-02-06"),
      },
    ];

    const plan = planBackfill(company, accountsPeriods, existingCt600s);

    expect(plan.deleteIds).toEqual(["f1"]);

    const expectedCtaps = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: null,
    });
    expect(plan.create).toHaveLength(expectedCtaps.length);
    expect(expectedCtaps).toHaveLength(2);

    plan.create.forEach((row, i) => {
      expect(row.companyId).toBe("co1");
      expect(row.filingType).toBe("ct600");
      expect(row.status).toBe("outstanding");
      expect(row.ctapUserEdited).toBe(false);
      expect(row.periodStart).toEqual(expectedCtaps[i].start);
      expect(row.periodEnd).toEqual(expectedCtaps[i].end);
      expect(row.startDate).toEqual(expectedCtaps[i].start);
      expect(row.endDate).toEqual(expectedCtaps[i].end);
      expect(row.deadline).toEqual(expectedCtaps[i].deadline);
    });

    // All CTAPs in the span share the same deadline.
    const deadlines = new Set(plan.create.map((c) => c.deadline.getTime()));
    expect(deadlines.size).toBe(1);
  });

  it("uses the company's ctapStartDate as the anchor", () => {
    const company = { id: "co1", ctapStartDate: d("2024-06-01") };
    const accountsPeriods = [{ start: d("2024-02-07"), end: d("2025-02-28") }];

    const plan = planBackfill(company, accountsPeriods, []);

    const expectedCtaps = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: d("2024-06-01"),
    });
    expect(plan.create.map((c) => c.periodStart)).toEqual(
      expectedCtaps.map((c) => c.start),
    );
    expect(plan.create[0].periodStart).toEqual(d("2024-06-01"));
  });

  it("does not touch a span containing a submitted CT600 (protected status)", () => {
    const company = { id: "co1", ctapStartDate: null };
    const accountsPeriods = [{ start: d("2024-02-07"), end: d("2025-02-28") }];
    const existingCt600s = [
      {
        id: "f-sys",
        status: "outstanding",
        ctapUserEdited: false,
        periodStart: d("2024-02-07"),
        periodEnd: d("2025-02-06"),
      },
      {
        id: "f-sub",
        status: "submitted",
        ctapUserEdited: false,
        periodStart: d("2025-02-07"),
        periodEnd: d("2025-02-28"),
      },
    ];

    const plan = planBackfill(company, accountsPeriods, existingCt600s);

    expect(plan.deleteIds).toEqual([]);
    expect(plan.create).toEqual([]);
  });

  it("does not touch a span containing a user-edited CT600 (ctapUserEdited)", () => {
    const company = { id: "co1", ctapStartDate: null };
    const accountsPeriods = [{ start: d("2024-02-07"), end: d("2025-02-28") }];
    const existingCt600s = [
      {
        id: "f-edited",
        status: "outstanding",
        ctapUserEdited: true,
        periodStart: d("2024-02-07"),
        periodEnd: d("2025-02-06"),
      },
    ];

    const plan = planBackfill(company, accountsPeriods, existingCt600s);

    expect(plan.deleteIds).toEqual([]);
    expect(plan.create).toEqual([]);
  });

  it("produces no creates and no deletes when there are no accounts periods", () => {
    const company = { id: "co1", ctapStartDate: null };
    const existingCt600s = [
      {
        id: "f1",
        status: "outstanding",
        ctapUserEdited: false,
        periodStart: d("2024-02-07"),
        periodEnd: d("2025-02-06"),
      },
    ];

    const plan = planBackfill(company, [], existingCt600s);

    expect(plan.deleteIds).toEqual([]);
    expect(plan.create).toEqual([]);
  });

  it("isolates per span: cleans a clean span while leaving a protected span untouched", () => {
    const company = { id: "co1", ctapStartDate: null };
    // Span A: clean (only a system outstanding ct600). Span B: protected (a
    // submitted ct600). The plan must touch only span A.
    const accountsPeriods = [
      { start: d("2024-02-07"), end: d("2025-02-28") },
      { start: d("2025-03-01"), end: d("2026-02-28") },
    ];
    const existingCt600s = [
      {
        id: "a-sys",
        status: "outstanding",
        ctapUserEdited: false,
        periodStart: d("2024-02-07"),
        periodEnd: d("2025-02-06"),
      },
      {
        id: "b-sub",
        status: "submitted",
        ctapUserEdited: false,
        periodStart: d("2025-03-01"),
        periodEnd: d("2026-02-28"),
      },
    ];

    const plan = planBackfill(company, accountsPeriods, existingCt600s);

    // Only span A's system row is deleted; span B's submitted row is protected.
    expect(plan.deleteIds).toEqual(["a-sys"]);

    const spanACtaps = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: null,
    });
    expect(plan.create).toHaveLength(spanACtaps.length);
    plan.create.forEach((row, i) => {
      expect(row.periodStart).toEqual(spanACtaps[i].start);
      expect(row.periodEnd).toEqual(spanACtaps[i].end);
    });
    // Nothing created for span B (the protected span).
    plan.create.forEach((row) => {
      expect(row.periodStart.getTime()).toBeLessThan(d("2025-03-01").getTime());
    });
  });

  it("only deletes in-span system rows, leaving out-of-span rows untouched", () => {
    const company = { id: "co1", ctapStartDate: null };
    const accountsPeriods = [{ start: d("2024-02-07"), end: d("2025-02-28") }];
    const existingCt600s = [
      {
        id: "in-span",
        status: "outstanding",
        ctapUserEdited: false,
        periodStart: d("2024-02-07"),
        periodEnd: d("2025-02-06"),
      },
      {
        id: "out-of-span",
        status: "outstanding",
        ctapUserEdited: false,
        periodStart: d("2025-03-01"),
        periodEnd: d("2026-02-28"),
      },
    ];

    const plan = planBackfill(company, accountsPeriods, existingCt600s);

    expect(plan.deleteIds).toEqual(["in-span"]);
  });
});
