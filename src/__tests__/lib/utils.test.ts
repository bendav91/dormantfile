import { describe, it, expect } from "vitest";
import { calculateFilingDeadline, validateUTR, calculateNextReminderDate } from "@/lib/utils";

describe("calculateFilingDeadline", () => {
  it("returns 12 months after accounting period end", () => {
    const periodEnd = new Date("2026-03-31");
    const deadline = calculateFilingDeadline(periodEnd);
    expect(deadline).toEqual(new Date("2027-03-31"));
  });

  it("handles leap year edge case", () => {
    const periodEnd = new Date("2027-02-28");
    const deadline = calculateFilingDeadline(periodEnd);
    expect(deadline).toEqual(new Date("2028-02-28"));
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
