import { describe, it, expect, vi } from "vitest";
import { getOutstandingPeriods } from "@/lib/periods";

describe("getOutstandingPeriods — isBlockedTerritory", () => {
  it("marks periods older than 6 years as blocked", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const periods = getOutstandingPeriods(
      new Date("2018-04-01"),
      new Date("2019-03-31"), // ~7 years ago
      false,
      [],
    );

    expect(periods[0].isBlockedTerritory).toBe(true);
    expect(periods[0].isDisclosureTerritory).toBe(true);

    vi.useRealTimers();
  });

  it("does not mark periods 5 years old as blocked", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const periods = getOutstandingPeriods(
      new Date("2020-04-01"),
      new Date("2021-03-31"), // ~5 years ago
      false,
      [],
    );

    expect(periods[0].isBlockedTerritory).toBe(false);
    expect(periods[0].isDisclosureTerritory).toBe(true); // >4 years

    vi.useRealTimers();
  });

  it("does not mark periods 3 years old as blocked or disclosure", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const periods = getOutstandingPeriods(
      new Date("2022-04-01"),
      new Date("2023-03-31"), // ~3 years ago
      false,
      [],
    );

    expect(periods[0].isBlockedTerritory).toBe(false);
    expect(periods[0].isDisclosureTerritory).toBe(false);

    vi.useRealTimers();
  });
});
