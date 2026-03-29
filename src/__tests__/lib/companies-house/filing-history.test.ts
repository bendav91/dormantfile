import { describe, it, expect } from "vitest";
import {
  computeFirstPeriodEnd,
  detectAccountsGaps,
} from "@/lib/companies-house/filing-history";

describe("computeFirstPeriodEnd", () => {
  it("returns first ARD strictly after incorporation", () => {
    // Incorporated 2015-05-16, ARD 31 March → first ARD is 2016-03-31
    const result = computeFirstPeriodEnd(
      new Date("2015-05-16"),
      3,
      31,
    );
    expect(result).toEqual(new Date("2016-03-31"));
  });

  it("advances to next year when incorporated on the ARD", () => {
    // Incorporated 2015-03-31, ARD 31 March → first ARD must be strictly after, so 2016-03-31
    const result = computeFirstPeriodEnd(
      new Date("2015-03-31"),
      3,
      31,
    );
    expect(result).toEqual(new Date("2016-03-31"));
  });

  it("applies 18-month cap", () => {
    // Incorporated 2014-06-01, ARD 31 March → naive first ARD = 2015-03-31 (< 18 months)
    // but 2016-03-31 would be > 18 months after 2014-06-01 (= 2015-12-01), so caps to 2015-03-31
    const result = computeFirstPeriodEnd(
      new Date("2014-06-01"),
      3,
      31,
    );
    expect(result).toEqual(new Date("2015-03-31"));
  });

  it("skips ARD that is less than 6 months after incorporation", () => {
    // Incorporated 2015-05-16, ARD 31 May
    // 2015-05-31 is only 15 days later — must skip to 2016-05-31
    const result = computeFirstPeriodEnd(
      new Date("2015-05-16"),
      5,
      31,
    );
    expect(result).toEqual(new Date("2016-05-31"));
  });

  it("does not apply 18-month cap when not needed", () => {
    // Incorporated 2015-09-01, ARD 31 March → first ARD strictly after = 2016-03-31
    // 18 months after 2015-09-01 = 2017-03-01; 2016-03-31 is within that, no cap needed
    const result = computeFirstPeriodEnd(
      new Date("2015-09-01"),
      3,
      31,
    );
    expect(result).toEqual(new Date("2016-03-31"));
  });
});

describe("detectAccountsGaps", () => {
  it("detects gaps when some periods are unfiled", () => {
    // Incorporated 2015-05-16, ARD 31 March
    // Filed: 2016, 2017, 2020, 2021, 2022
    // Missing: 2018, 2019 — oldest unfiled = 2018-03-31, periodStart = 2017-04-01
    const filed = [
      new Date("2016-03-31"),
      new Date("2017-03-31"),
      new Date("2020-03-31"),
      new Date("2021-03-31"),
      new Date("2022-03-31"),
    ];
    const result = detectAccountsGaps("2015-05-16", 3, 31, filed);
    expect(result).not.toBeNull();
    expect(result!.oldestUnfiledPeriodEnd).toEqual(new Date("2018-03-31"));
    expect(result!.oldestUnfiledPeriodStart).toEqual(new Date("2017-04-01"));
  });

  it("returns null when all periods are filed", () => {
    // Incorporated 2022-01-01, ARD 31 December, filed 2022 and 2023, current date is 2026-03-29
    const filed = [
      new Date("2022-12-31"),
      new Date("2023-12-31"),
      new Date("2024-12-31"),
      new Date("2025-12-31"),
    ];
    const result = detectAccountsGaps("2022-01-01", 12, 31, filed);
    expect(result).toBeNull();
  });

  it("returns first period when nothing has been filed", () => {
    // Incorporated 2020-06-01, ARD 31 March, nothing filed
    // First period end = 2021-03-31, periodStart = incorporation date
    const result = detectAccountsGaps("2020-06-01", 3, 31, []);
    expect(result).not.toBeNull();
    expect(result!.oldestUnfiledPeriodEnd).toEqual(new Date("2021-03-31"));
    expect(result!.oldestUnfiledPeriodStart).toEqual(new Date("2020-06-01"));
  });

  it("uses tolerance matching — CH date 15 days off still matches", () => {
    // Incorporated 2020-06-01, ARD 31 March → first period end = 2021-03-31
    // CH filed date is 15 days off: 2021-04-15 (within 31-day tolerance)
    // 2021 period should be matched; oldest unfiled = 2022-03-31
    const chDate = new Date("2021-04-15");
    const result = detectAccountsGaps("2020-06-01", 3, 31, [chDate]);
    expect(result).not.toBeNull();
    // 2021-03-31 was matched, so oldest unfiled is 2022-03-31
    expect(result!.oldestUnfiledPeriodEnd).toEqual(new Date("2022-03-31"));
    // filedPeriodEnds maps the CH date → computed period end
    expect(result!.filedPeriodEnds.get(chDate.getTime())).toEqual(
      new Date("2021-03-31"),
    );
  });

  it("does not match beyond 31-day tolerance — 46 days off = no match", () => {
    // Incorporated 2020-06-01, ARD 31 March → first period end = 2021-03-31
    // CH filed date is 46 days off from 2021-03-31 → 2021-05-16 (beyond tolerance)
    const filed = [new Date("2021-05-16")];
    const result = detectAccountsGaps("2020-06-01", 3, 31, filed);
    expect(result).not.toBeNull();
    // 2021-03-31 should NOT be matched, so oldest unfiled should be 2021-03-31
    expect(result!.oldestUnfiledPeriodEnd).toEqual(new Date("2021-03-31"));
  });

  it("maps CH filed dates to computed expected period ends in filedPeriodEnds", () => {
    // Incorporated 2020-06-01, ARD 31 March → first period end = 2021-03-31
    // CH filed date is slightly off: 2021-04-02 (2 days off from 2021-03-31)
    const chDate = new Date("2021-04-02");
    const result = detectAccountsGaps("2020-06-01", 3, 31, [chDate]);
    expect(result).not.toBeNull();
    const map = result!.filedPeriodEnds;
    // Key is chDate.getTime(), value should be the computed period end 2021-03-31
    expect(map.get(chDate.getTime())).toEqual(new Date("2021-03-31"));
  });
});
