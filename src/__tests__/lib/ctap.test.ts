import { describe, it, expect } from "vitest";
import { computeCtaps, getNextCtapStart, findParentPeriod } from "@/lib/ctap";

describe("computeCtaps", () => {
  it("generates 12-month CTAPs from anchor date", () => {
    const ctaps = computeCtaps(new Date("2023-04-01"), new Date("2025-04-01"));

    expect(ctaps).toHaveLength(2);
    expect(ctaps[0].start).toEqual(new Date("2023-04-01"));
    expect(ctaps[0].end).toEqual(new Date("2024-03-31"));
    expect(ctaps[1].start).toEqual(new Date("2024-04-01"));
    expect(ctaps[1].end).toEqual(new Date("2025-03-31"));
  });

  it("returns empty array when anchor is after cutoff", () => {
    const ctaps = computeCtaps(new Date("2026-01-01"), new Date("2025-12-31"));
    expect(ctaps).toHaveLength(0);
  });

  it("handles single CTAP when cutoff is within first 12 months", () => {
    const ctaps = computeCtaps(new Date("2024-06-15"), new Date("2025-01-01"));
    expect(ctaps).toHaveLength(1);
    expect(ctaps[0].start).toEqual(new Date("2024-06-15"));
    expect(ctaps[0].end).toEqual(new Date("2025-06-14"));
  });

  it("chains CTAPs contiguously without gaps", () => {
    const ctaps = computeCtaps(new Date("2020-01-01"), new Date("2024-01-01"));

    for (let i = 1; i < ctaps.length; i++) {
      const prevEnd = ctaps[i - 1].end;
      const nextStart = ctaps[i].start;
      const dayAfterPrev = new Date(prevEnd);
      dayAfterPrev.setUTCDate(dayAfterPrev.getUTCDate() + 1);
      expect(nextStart).toEqual(dayAfterPrev);
    }
  });

  it("handles mid-year anchor correctly", () => {
    const ctaps = computeCtaps(new Date("2023-08-15"), new Date("2025-08-15"));
    expect(ctaps).toHaveLength(2);
    expect(ctaps[0].start).toEqual(new Date("2023-08-15"));
    expect(ctaps[0].end).toEqual(new Date("2024-08-14"));
    expect(ctaps[1].start).toEqual(new Date("2024-08-15"));
    expect(ctaps[1].end).toEqual(new Date("2025-08-14"));
  });
});

describe("getNextCtapStart", () => {
  it("returns day after latest CT600 end when both sources exist and chain is later", () => {
    const result = getNextCtapStart(new Date("2025-03-31"), new Date("2024-04-01"));
    expect(result).toEqual(new Date("2025-04-01"));
  });

  it("returns ctapStartDate when it is later than chain", () => {
    const result = getNextCtapStart(new Date("2023-03-31"), new Date("2025-01-01"));
    expect(result).toEqual(new Date("2025-01-01"));
  });

  it("returns chain date when ctapStartDate is null", () => {
    const result = getNextCtapStart(new Date("2025-03-31"), null);
    expect(result).toEqual(new Date("2025-04-01"));
  });

  it("returns ctapStartDate when chain is null", () => {
    const result = getNextCtapStart(null, new Date("2024-04-01"));
    expect(result).toEqual(new Date("2024-04-01"));
  });

  it("returns null when both sources are null", () => {
    const result = getNextCtapStart(null, null);
    expect(result).toBeNull();
  });
});

describe("findParentPeriod", () => {
  const periods = [
    { id: "p1", periodStart: new Date("2023-04-01"), periodEnd: new Date("2024-03-31") },
    { id: "p2", periodStart: new Date("2024-04-01"), periodEnd: new Date("2025-03-31") },
    { id: "p3", periodStart: new Date("2025-04-01"), periodEnd: new Date("2026-03-31") },
  ];

  it("finds the period containing the CTAP start date", () => {
    const result = findParentPeriod(new Date("2024-06-15"), periods);
    expect(result?.id).toBe("p2");
  });

  it("matches when CTAP starts on the period start date", () => {
    const result = findParentPeriod(new Date("2024-04-01"), periods);
    expect(result?.id).toBe("p2");
  });

  it("matches when CTAP starts on the period end date", () => {
    const result = findParentPeriod(new Date("2025-03-31"), periods);
    expect(result?.id).toBe("p2");
  });

  it("returns null when no period contains the date", () => {
    const result = findParentPeriod(new Date("2022-01-01"), periods);
    expect(result).toBeNull();
  });
});
