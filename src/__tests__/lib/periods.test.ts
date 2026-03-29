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

describe("getOutstandingPeriods — deadline overrides", () => {
  it("uses CH accountsDueOn for the last outstanding period", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const periods = getOutstandingPeriods(
      new Date("2024-04-01"),
      new Date("2025-03-31"),
      false,
      [],
      { accountsDueOn: new Date("2026-03-31") },
    );

    const lastPeriod = periods[periods.length - 1];
    expect(lastPeriod.accountsDeadline).toEqual(new Date("2026-03-31"));

    vi.useRealTimers();
  });

  it("uses first-accounts rule for first period when dateOfCreation provided", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2008-06-01"));

    // Incorporated 2 June 2006, first period ends 31 March 2007
    const periods = getOutstandingPeriods(
      new Date("2006-06-02"),
      new Date("2007-03-31"),
      false,
      [],
      { dateOfCreation: new Date("2006-06-02") },
    );

    // 21 months from 2 June 2006 = 2 March 2008 (later than 9 months = 31 Dec 2007)
    expect(periods[0].accountsDeadline).toEqual(new Date("2008-03-02"));

    vi.useRealTimers();
  });

  it("CH accountsDueOn takes precedence over first-accounts rule on last period", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01"));

    // Single period that is both first and last
    const periods = getOutstandingPeriods(
      new Date("2025-07-09"),
      new Date("2026-03-31"),
      false,
      [],
      {
        dateOfCreation: new Date("2025-07-09"),
        accountsDueOn: new Date("2027-04-09"),
      },
    );

    expect(periods[0].accountsDeadline).toEqual(new Date("2027-04-09"));

    vi.useRealTimers();
  });
});
