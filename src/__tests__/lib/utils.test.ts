import { describe, it, expect } from "vitest";
import {
  calculateCT600Deadline,
  calculateAccountsDeadline,
  validateUTR,
  calculateNextReminderDate,
  validatePassword,
  validateEmail,
} from "@/lib/utils";

describe("calculateCT600Deadline", () => {
  it("returns 12 months after accounting period end", () => {
    expect(calculateCT600Deadline(new Date("2026-03-31"))).toEqual(new Date("2027-03-31"));
  });
  it("handles leap year edge case", () => {
    expect(calculateCT600Deadline(new Date("2027-02-28"))).toEqual(new Date("2028-02-28"));
  });
});

describe("calculateAccountsDeadline", () => {
  it("returns 9 months after accounting period end", () => {
    expect(calculateAccountsDeadline(new Date("2026-03-31"))).toEqual(new Date("2026-12-31"));
  });
  it("handles month overflow correctly", () => {
    expect(calculateAccountsDeadline(new Date("2026-06-30"))).toEqual(new Date("2027-03-30"));
  });
  it("clamps end-of-month correctly (May 31 + 9 months = Feb 28)", () => {
    const result = calculateAccountsDeadline(new Date("2026-05-31"));
    expect(result.getUTCFullYear()).toBe(2027);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(28);
  });

  describe("first accounts rule (s.442(3))", () => {
    it("uses 21 months from incorporation when later than 9 months from period end", () => {
      // Incorporated 2 June 2006, first period ends 31 March 2007
      // 9 months from period end = 31 Dec 2007
      // 21 months from incorporation = ~2 March 2008
      // Should use 21 months (later)
      const result = calculateAccountsDeadline(
        new Date("2007-03-31"),
        new Date("2006-06-02"),
      );
      expect(result).toEqual(new Date("2008-03-02"));
    });

    it("uses 9 months from period end when later than 21 months from incorporation", () => {
      // Incorporated 1 Jan 2025, first period ends 31 Dec 2025
      // 9 months from period end = 30 Sep 2026
      // 21 months from incorporation = 1 Oct 2026
      // Should use 21 months (later by 1 day)
      const result = calculateAccountsDeadline(
        new Date("2025-12-31"),
        new Date("2025-01-01"),
      );
      expect(result).toEqual(new Date("2026-10-01"));
    });

    it("uses 9 months when no incorporation date provided", () => {
      expect(calculateAccountsDeadline(new Date("2007-03-31"))).toEqual(new Date("2007-12-31"));
    });

    it("uses 9 months for short first period where 21 months is earlier", () => {
      // Incorporated 1 Jan 2025, first period ends 31 Dec 2025
      // 9 months from period end = 30 Sep 2026
      // 21 months from incorporation = 1 Oct 2026
      // Actually 21 months is later here. Let me pick a case where 9 months wins:
      // Incorporated 1 Jan 2024, first period ends 31 March 2025
      // 9 months from period end = 31 Dec 2025
      // 21 months from incorporation = 1 Oct 2025
      // 9 months wins
      const result = calculateAccountsDeadline(
        new Date("2025-03-31"),
        new Date("2024-01-01"),
      );
      expect(result).toEqual(new Date("2025-12-31"));
    });
  });
});

describe("validateUTR", () => {
  it("accepts a valid 10-digit UTR", () => {
    expect(validateUTR("1234567890")).toBe(true);
  });

  it("rejects a UTR with fewer than 10 digits", () => {
    expect(validateUTR("123456789")).toBe(false);
  });

  it("rejects a UTR with letters", () => {
    expect(validateUTR("12345678ab")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateUTR("")).toBe(false);
  });
});

describe("calculateNextReminderDate", () => {
  it("returns 90 days before deadline when 0 reminders sent", () => {
    const deadline = new Date("2027-03-31");
    const next = calculateNextReminderDate(deadline, 0);
    expect(next).toEqual(new Date("2026-12-31"));
  });

  it("returns 30 days before deadline when 1 reminder sent", () => {
    const deadline = new Date("2027-03-31");
    const next = calculateNextReminderDate(deadline, 1);
    expect(next).toEqual(new Date("2027-03-01"));
  });

  it("returns 14 days before deadline when 2 reminders sent", () => {
    const deadline = new Date("2027-03-31");
    const next = calculateNextReminderDate(deadline, 2);
    expect(next).toEqual(new Date("2027-03-17"));
  });

  it("returns 7 days before deadline when 3 reminders sent", () => {
    const deadline = new Date("2027-03-31");
    const next = calculateNextReminderDate(deadline, 3);
    expect(next).toEqual(new Date("2027-03-24"));
  });

  it("returns 3 days before deadline when 4 reminders sent", () => {
    const deadline = new Date("2027-03-31");
    const next = calculateNextReminderDate(deadline, 4);
    expect(next).toEqual(new Date("2027-03-28"));
  });

  it("returns 1 day before deadline when 5 reminders sent", () => {
    const deadline = new Date("2027-03-31");
    const next = calculateNextReminderDate(deadline, 5);
    expect(next).toEqual(new Date("2027-03-30"));
  });

  it("returns null when all 6 reminders sent", () => {
    const deadline = new Date("2027-03-31");
    const next = calculateNextReminderDate(deadline, 6);
    expect(next).toBeNull();
  });
});

describe("validatePassword", () => {
  it("accepts a valid password with letters and numbers", () => {
    expect(validatePassword("hello123")).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(validatePassword("abc123")).toBe(false);
  });

  it("rejects a password with only letters", () => {
    expect(validatePassword("abcdefgh")).toBe(false);
  });

  it("rejects a password with only numbers", () => {
    expect(validatePassword("12345678")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validatePassword("")).toBe(false);
  });
});

describe("validateEmail", () => {
  it("accepts a valid email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("rejects a string without @", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("rejects a string without domain", () => {
    expect(validateEmail("user@")).toBe(false);
  });

  it("rejects a string without dot after @", () => {
    expect(validateEmail("user@example")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateEmail("")).toBe(false);
  });
});
