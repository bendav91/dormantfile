import { formatUkDate, formatUkDateShort } from "@/lib/format-date";
import { describe, expect, it } from "vitest";

describe("formatUkDate / formatUkDateShort — always UK (Europe/London) time", () => {
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

  it("keeps a midnight-UTC period date on the same calendar day under BST", () => {
    // periodStart/End are stored as 00:00:00Z; +1h BST must not roll the day.
    const periodStart = new Date("2024-09-01T00:00:00.000Z");
    expect(formatUkDate(periodStart)).toBe("1 September 2024");
  });

  it("long form uses full month, short form uses abbreviated month", () => {
    const d = new Date("2026-02-03T12:00:00.000Z");
    expect(formatUkDate(d)).toBe("3 February 2026");
    expect(formatUkDateShort(d)).toBe("3 Feb 2026");
  });
});
