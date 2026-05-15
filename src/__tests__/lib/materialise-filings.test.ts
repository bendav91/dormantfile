import { describe, it, expect } from "vitest";
import { buildCt600FilingData } from "@/lib/companies-house/materialise-filings";
import { generateCt600Ctaps } from "@/lib/ctap";
import { calculateCT600Deadline } from "@/lib/utils";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("buildCt600FilingData (pure helper)", () => {
  it("(a) first accounts period with no existing CT600 → exactly the generateCt600Ctaps CTAPs, shared deadline, ctapUserEdited:false, status:outstanding", () => {
    const accountsPeriods = [
      { start: d("2024-02-07"), end: d("2025-02-28"), isFiled: false },
    ];

    const rows = buildCt600FilingData({
      registeredForCorpTax: true,
      ctapStartDate: null,
      accountsPeriods,
      existingCt600s: [],
    });

    const expectedCtaps = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: null,
    });
    const sharedDeadline = calculateCT600Deadline(d("2025-02-28")).getTime();

    expect(rows.length).toBe(expectedCtaps.length);
    expect(rows.length).toBe(2);

    expect(
      rows.map((r) => [
        r.periodStart.toISOString().slice(0, 10),
        r.periodEnd.toISOString().slice(0, 10),
      ]),
    ).toEqual([
      ["2024-02-07", "2025-02-06"],
      ["2025-02-07", "2025-02-28"],
    ]);

    for (const r of rows) {
      expect(r.filingType).toBe("ct600");
      expect(r.status).toBe("outstanding");
      expect(r.ctapUserEdited).toBe(false);
      expect(r.confirmedAt).toBeNull();
      expect(r.deadline.getTime()).toBe(sharedDeadline);
      // startDate/endDate mirror the CTAP bounds
      expect(r.startDate.getTime()).toBe(r.periodStart.getTime());
      expect(r.endDate.getTime()).toBe(r.periodEnd.getTime());
    }

    // periodStart/periodEnd exactly track the generated CTAPs
    expect(rows.map((r) => r.periodStart.getTime())).toEqual(
      expectedCtaps.map((c) => c.start.getTime()),
    );
    expect(rows.map((r) => r.periodEnd.getTime())).toEqual(
      expectedCtaps.map((c) => c.end.getTime()),
    );
  });

  it("(b) span containing a submitted CT600 → no CT600 rows for that span", () => {
    const accountsPeriods = [
      { start: d("2024-02-07"), end: d("2025-02-28"), isFiled: false },
    ];

    const rows = buildCt600FilingData({
      registeredForCorpTax: true,
      ctapStartDate: null,
      accountsPeriods,
      existingCt600s: [
        {
          status: "submitted",
          ctapUserEdited: false,
          periodStart: d("2024-02-07"),
          periodEnd: d("2025-02-06"),
        },
      ],
    });

    expect(rows).toEqual([]);
  });

  it("(c) accounts period with isFiled:true → no CT600 rows (retained behaviour)", () => {
    const accountsPeriods = [
      { start: d("2024-02-07"), end: d("2025-02-28"), isFiled: true },
    ];

    const rows = buildCt600FilingData({
      registeredForCorpTax: true,
      ctapStartDate: null,
      accountsPeriods,
      existingCt600s: [],
    });

    expect(rows).toEqual([]);
  });

  it("(e) non-null ctapStartDate LATER than accounts-period start → CTAPs anchored at ctapStartDate (parity with generateCt600Ctaps anchor)", () => {
    // ctapStartDate deliberately set AFTER the accounts-period start so the
    // anchor visibly changes the chain — proves the anchor is now honoured
    // instead of the previously-hardcoded null.
    const accountsPeriodStart = d("2024-02-07");
    const accountsPeriodEnd = d("2025-02-28");
    const ctapStartDate = d("2024-06-01");

    const accountsPeriods = [
      { start: accountsPeriodStart, end: accountsPeriodEnd, isFiled: false },
    ];

    const rows = buildCt600FilingData({
      registeredForCorpTax: true,
      ctapStartDate,
      accountsPeriods,
      existingCt600s: [],
    });

    const expectedCtaps = generateCt600Ctaps({
      accountsPeriodStart,
      accountsPeriodEnd,
      anchor: ctapStartDate,
    });

    expect(rows.length).toBe(expectedCtaps.length);
    // First CTAP must start at the anchor, NOT the accounts-period start.
    expect(rows[0].periodStart.getTime()).toBe(ctapStartDate.getTime());
    expect(rows[0].periodStart.getTime()).not.toBe(accountsPeriodStart.getTime());

    expect(rows.map((r) => r.periodStart.getTime())).toEqual(
      expectedCtaps.map((c) => c.start.getTime()),
    );
    expect(rows.map((r) => r.periodEnd.getTime())).toEqual(
      expectedCtaps.map((c) => c.end.getTime()),
    );
  });

  it("(d) multi-period: filed A skipped, protected B skipped, clean C → exactly C's two split CTAPs", () => {
    const accountsPeriods = [
      // A: filed → no rows
      { start: d("2022-02-07"), end: d("2023-02-06"), isFiled: true },
      // B: not filed but contains a submitted CT600 → protected → no rows
      { start: d("2023-02-07"), end: d("2024-02-06"), isFiled: false },
      // C: clean → two split CTAPs
      { start: d("2024-02-07"), end: d("2025-02-28"), isFiled: false },
    ];

    const rows = buildCt600FilingData({
      registeredForCorpTax: true,
      ctapStartDate: null,
      accountsPeriods,
      existingCt600s: [
        {
          status: "submitted",
          ctapUserEdited: false,
          periodStart: d("2023-02-07"),
          periodEnd: d("2024-02-06"),
        },
      ],
    });

    const expectedCtaps = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: null,
    });
    const sharedDeadline = calculateCT600Deadline(d("2025-02-28")).getTime();

    expect(rows.length).toBe(2);
    expect(rows.length).toBe(expectedCtaps.length);

    expect(
      rows.map((r) => [
        r.periodStart.toISOString().slice(0, 10),
        r.periodEnd.toISOString().slice(0, 10),
      ]),
    ).toEqual([
      ["2024-02-07", "2025-02-06"],
      ["2025-02-07", "2025-02-28"],
    ]);

    for (const r of rows) {
      expect(r.filingType).toBe("ct600");
      expect(r.status).toBe("outstanding");
      expect(r.ctapUserEdited).toBe(false);
      expect(r.confirmedAt).toBeNull();
      expect(r.deadline.getTime()).toBe(sharedDeadline);
    }

    expect(rows.map((r) => r.periodStart.getTime())).toEqual(
      expectedCtaps.map((c) => c.start.getTime()),
    );
    expect(rows.map((r) => r.periodEnd.getTime())).toEqual(
      expectedCtaps.map((c) => c.end.getTime()),
    );
  });
});
