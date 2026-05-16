import { describe, it, expect } from "vitest";
import { deriveCt600EditorSeed } from "@/lib/ct600-editor-seed";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("deriveCt600EditorSeed", () => {
  it("seeds from the earliest accounts period when no CT600 exists yet", () => {
    const seed = deriveCt600EditorSeed({
      filings: [
        { filingType: "accounts", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "outstanding", ctapUserEdited: false },
      ],
    });
    expect(seed).toBeTruthy();
    expect(seed!.accountsPeriodStartISO).toBe("2023-01-01");
    expect(seed!.accountsPeriodEndISO).toBe("2023-12-31");
    expect(seed!.suggested.length).toBe(1); // 12-month period → single CTAP, anchored at accounts start
    expect(seed!.immutable).toEqual([]);
  });

  it("skips an accounts span already protected by a filed CT600 and advances", () => {
    const seed = deriveCt600EditorSeed({
      filings: [
        { filingType: "accounts", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", ctapUserEdited: false },
        { filingType: "accounts", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "outstanding", ctapUserEdited: false },
        { filingType: "ct600", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "accepted", ctapUserEdited: false },
      ],
    });
    expect(seed!.accountsPeriodStartISO).toBe("2023-01-01");
  });

  it("skips an accounts span protected by an OUTSTANDING but user-edited CT600", () => {
    const seed = deriveCt600EditorSeed({
      filings: [
        { filingType: "accounts", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", ctapUserEdited: false },
        { filingType: "accounts", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "outstanding", ctapUserEdited: false },
        { filingType: "ct600", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", ctapUserEdited: true },
      ],
    });
    expect(seed!.accountsPeriodStartISO).toBe("2023-01-01");
  });

  it("returns null when there are no accounts periods", () => {
    expect(deriveCt600EditorSeed({ filings: [] })).toBeNull();
  });

  it("falls back to accounts[0] when every accounts span has a protected CT600", () => {
    // Both 2022 and 2023 spans have an accepted CT600 covering them — no unprotected span exists.
    // deriveCt600EditorSeed must fall back to the earliest accounts period (2022) rather than null.
    const seed = deriveCt600EditorSeed({
      filings: [
        { filingType: "accounts", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", ctapUserEdited: false },
        { filingType: "accounts", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "outstanding", ctapUserEdited: false },
        { filingType: "ct600", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "accepted", ctapUserEdited: false },
        { filingType: "ct600", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "accepted", ctapUserEdited: false },
      ],
    });
    expect(seed).not.toBeNull();
    expect(seed!.accountsPeriodStartISO).toBe("2022-01-01");
  });
});
