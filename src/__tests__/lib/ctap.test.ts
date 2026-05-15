import { describe, it, expect } from "vitest";
import { computeCtaps, getNextCtapStart, generateCt600Ctaps } from "@/lib/ctap";
import { calculateCT600Deadline } from "@/lib/utils";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

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

describe("generateCt600Ctaps", () => {
  it("splits the Anouar >12-month first period into two CTAPs sharing one deadline", () => {
    const out = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: null,
    });
    expect(out.map((c) => [c.start.toISOString().slice(0, 10), c.end.toISOString().slice(0, 10)]))
      .toEqual([
        ["2024-02-07", "2025-02-06"],
        ["2025-02-07", "2025-02-28"],
      ]);
    const shared = calculateCT600Deadline(d("2025-02-28")).getTime();
    expect(out.every((c) => c.deadline.getTime() === shared)).toBe(true);
  });

  it("returns a single CTAP for a <=12-month period", () => {
    const out = generateCt600Ctaps({
      accountsPeriodStart: d("2024-04-01"),
      accountsPeriodEnd: d("2025-03-31"),
      anchor: null,
    });
    expect(out).toHaveLength(1);
    expect(out[0].start.toISOString().slice(0, 10)).toBe("2024-04-01");
    expect(out[0].end.toISOString().slice(0, 10)).toBe("2025-03-31");
  });

  it("honours an explicit anchor later than the accounts start", () => {
    const out = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: d("2024-06-01"),
    });
    expect(out[0].start.toISOString().slice(0, 10)).toBe("2024-06-01");
    expect(out[out.length - 1].end.toISOString().slice(0, 10)).toBe("2025-02-28");
  });

  it("returns [] when the anchor is strictly after the accounts end", () => {
    const out = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: d("2025-03-01"),
    });
    expect(out).toEqual([]);
  });

  it("returns [] when the anchor equals the accounts end (zero-length period)", () => {
    const out = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: d("2025-02-28"),
    });
    expect(out).toEqual([]);
  });
});

