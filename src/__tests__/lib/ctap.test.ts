import { describe, it, expect } from "vitest";
import {
  computeCtaps,
  generateCt600Ctaps,
  validateCtapChain,
  spanHasProtectedCt600,
} from "@/lib/ctap";
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

describe("validateCtapChain", () => {
  const base = { accountsPeriodStart: d("2024-02-07"), accountsPeriodEnd: d("2025-02-28") };
  it("accepts a correct contiguous split", () => {
    expect(validateCtapChain({
      ...base,
      periods: [
        { start: d("2024-02-07"), end: d("2025-02-06") },
        { start: d("2025-02-07"), end: d("2025-02-28") },
      ],
    })).toEqual([]);
  });
  it("rejects a CTAP longer than 12 months", () => {
    const errs = validateCtapChain({ ...base, periods: [{ start: d("2024-02-07"), end: d("2025-02-28") }] });
    expect(errs.join(" ")).toMatch(/12 months/i);
  });
  it("rejects a gap between periods", () => {
    expect(validateCtapChain({ ...base, periods: [
      { start: d("2024-02-07"), end: d("2024-12-31") },
      { start: d("2025-02-07"), end: d("2025-02-28") },
    ] }).join(" ")).toMatch(/gaps or overlaps/i);
  });
  it("rejects an overlap between periods", () => {
    expect(validateCtapChain({ ...base, periods: [
      { start: d("2024-02-07"), end: d("2025-02-06") },
      { start: d("2025-01-01"), end: d("2025-02-28") },
    ] }).join(" ")).toMatch(/gaps or overlaps/i);
  });
  it("rejects an empty chain", () => {
    expect(validateCtapChain({ ...base, periods: [] })).toEqual([
      "At least one period is required.",
    ]);
  });
  it("rejects a period whose end is before its start", () => {
    expect(validateCtapChain({ ...base, periods: [
      { start: d("2025-02-28"), end: d("2024-02-07") },
    ] }).join(" ")).toMatch(/end is before start/i);
  });
  it("rejects a chain that does not span the accounts period", () => {
    expect(validateCtapChain({ ...base, periods: [
      { start: d("2024-03-01"), end: d("2025-02-28") },
    ] }).join(" ")).toMatch(/first period must start/i);
  });
});

describe("spanHasProtectedCt600", () => {
  const span = { accountsPeriodStart: d("2024-02-07"), accountsPeriodEnd: d("2025-02-28") };
  const mk = (status: string, ctapUserEdited = false, ps = "2024-02-07", pe = "2025-02-06") =>
    ({ status, ctapUserEdited, periodStart: d(ps), periodEnd: d(pe) }) as never;
  it("is true when an in-span CT600 is submitted/accepted/etc", () => {
    expect(spanHasProtectedCt600(span, [mk("submitted")])).toBe(true);
    expect(spanHasProtectedCt600(span, [mk("filed_elsewhere")])).toBe(true);
  });
  it("is true when an in-span CT600 is user-edited", () => {
    expect(spanHasProtectedCt600(span, [mk("outstanding", true)])).toBe(true);
  });
  it("is false when only system-generated outstanding rows are in span", () => {
    expect(spanHasProtectedCt600(span, [mk("outstanding", false)])).toBe(false);
  });
});

