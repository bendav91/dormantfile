import {
  formatUkDate,
  formatUkDateShort,
  formatCivilDate,
  formatCivilDateShort,
} from "@/lib/format-date";
import { describe, expect, it } from "vitest";

// Event instants (confirmedAt / submittedAt / createdAt) are real moments in
// time and must render in UK civil time, because every customer is a UK
// company filing to UK authorities.
describe("formatUkDate / formatUkDateShort — event instants in UK time", () => {
  it("renders a BST-evening instant as the UK calendar day, not the UTC day", () => {
    // 23:30 UTC on 16 May = 00:30 BST on 17 May. UK customers must see 17 May.
    const instant = new Date("2026-05-16T23:30:00.000Z");
    expect(formatUkDate(instant)).toBe("17 May 2026");
    expect(formatUkDateShort(instant)).toBe("17 May 2026");
  });

  it("renders a GMT (winter) instant correctly (no offset)", () => {
    const instant = new Date("2026-01-15T09:00:00.000Z");
    expect(formatUkDate(instant)).toBe("15 January 2026");
    expect(formatUkDateShort(instant)).toBe("15 Jan 2026");
  });
});

// Statutory calendar dates (period start/end, deadline, ARD, made-up date,
// incorporation) are date-only civil dates with no time or zone. They are
// stored as YYYY-MM-DDT00:00:00Z and must render verbatim — never shifted by
// any timezone — so they always match Companies House / HMRC exactly.
describe("formatCivilDate / formatCivilDateShort — statutory dates verbatim", () => {
  it("renders a stored civil date exactly as stored, regardless of timezone", () => {
    const periodEnd = new Date("2025-08-31T00:00:00.000Z");
    expect(formatCivilDate(periodEnd)).toBe("31 August 2025");
    expect(formatCivilDateShort(periodEnd)).toBe("31 Aug 2025");
  });

  it("does NOT shift a civil date even if it carries a late-evening time", () => {
    // Defensive: a date-picker storing local-midnight-as-UTC must still show
    // the intended civil day under a verbatim (UTC) reading.
    const madeUpDate = new Date("2026-03-31T00:00:00.000Z");
    expect(formatCivilDate(madeUpDate)).toBe("31 March 2026");
  });

  it("long form uses full month, short form uses abbreviated month", () => {
    const d = new Date("2026-02-03T00:00:00.000Z");
    expect(formatCivilDate(d)).toBe("3 February 2026");
    expect(formatCivilDateShort(d)).toBe("3 Feb 2026");
  });
});
