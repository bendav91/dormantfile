import { describe, it, expect } from "vitest";

import { buildActivityTimeline } from "@/lib/activity-timeline";

const COMPANY_CREATED = new Date("2026-01-01T09:00:00.000Z");

function notification(type: string, sentAt: string) {
  return { id: `${type}-${sentAt}`, type, sentAt: new Date(sentAt) };
}

describe("buildActivityTimeline — notification scoping", () => {
  it("still renders reminder_due_* / reminder_overdue_* as 'Reminder sent' with humanized detail and date preserved", () => {
    const events = buildActivityTimeline(
      COMPANY_CREATED,
      [],
      [
        notification("reminder_due_30", "2026-02-01T08:00:00.000Z"),
        notification("reminder_overdue_7", "2026-03-15T08:00:00.000Z"),
      ],
    );

    const due = events.find((e) => e.id === "notification-reminder_due_30-2026-02-01T08:00:00.000Z");
    expect(due).toBeDefined();
    expect(due!.type).toBe("reminder_sent");
    expect(due!.title).toBe("Reminder sent");
    expect(due!.detail).toBe("Due within 30 days");
    expect(due!.date.toISOString()).toBe("2026-02-01T08:00:00.000Z");

    const overdue = events.find(
      (e) => e.id === "notification-reminder_overdue_7-2026-03-15T08:00:00.000Z",
    );
    expect(overdue).toBeDefined();
    expect(overdue!.type).toBe("reminder_sent");
    expect(overdue!.title).toBe("Reminder sent");
    expect(overdue!.detail).toBe("7 days overdue");
    expect(overdue!.date.toISOString()).toBe("2026-03-15T08:00:00.000Z");
  });

  it("produces NO timeline entry for non-reminder_ notification types (filing_confirmation*/lapsed_*)", () => {
    const leakyTypes = [
      "filing_confirmation",
      "filing_confirmation_pending",
      "filing_confirmation_attempt",
      "filing_confirmation_failed",
      "lapsed_due_30",
      "lapsed_overdue_7",
    ];

    const events = buildActivityTimeline(
      COMPANY_CREATED,
      [],
      leakyTypes.map((t, i) => notification(t, `2026-04-0${i + 1}T08:00:00.000Z`)),
    );

    // No notification-derived events at all from these types.
    expect(events.filter((e) => e.id.startsWith("notification-"))).toHaveLength(0);
    // And specifically none surfaced as a reminder.
    expect(events.filter((e) => e.type === "reminder_sent")).toHaveLength(0);
    // Only the company_added event remains.
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("company_added");
  });

  it("keeps a mixed batch correct: reminder_* kept, others dropped", () => {
    const events = buildActivityTimeline(
      COMPANY_CREATED,
      [],
      [
        notification("reminder_due_30", "2026-02-01T08:00:00.000Z"),
        notification("filing_confirmation_attempt", "2026-02-02T08:00:00.000Z"),
        notification("lapsed_overdue_7", "2026-02-03T08:00:00.000Z"),
        notification("reminder_overdue_7", "2026-02-04T08:00:00.000Z"),
      ],
    );

    const notifEvents = events.filter((e) => e.id.startsWith("notification-"));
    expect(notifEvents.map((e) => e.detail).sort()).toEqual([
      "7 days overdue",
      "Due within 30 days",
    ]);
  });
});

describe("buildActivityTimeline — non-notification sources unchanged (regression guard)", () => {
  it("still emits company_added and filing_submitted/accepted events", () => {
    const events = buildActivityTimeline(
      COMPANY_CREATED,
      [
        {
          id: "f1",
          filingType: "accounts",
          periodStart: new Date("2025-01-01"),
          periodEnd: new Date("2025-12-31"),
          startDate: null,
          endDate: null,
          status: "accepted",
          submittedAt: new Date("2026-03-01T10:00:00.000Z"),
          confirmedAt: new Date("2026-03-02T10:00:00.000Z"),
          createdAt: new Date("2026-02-28T10:00:00.000Z"),
        },
      ],
      [notification("filing_confirmation", "2026-03-02T10:05:00.000Z")],
    );

    const companyAdded = events.find((e) => e.type === "company_added");
    expect(companyAdded).toBeDefined();
    expect(companyAdded!.title).toBe("Company added to DormantFile");

    const submitted = events.find((e) => e.type === "filing_submitted");
    expect(submitted).toBeDefined();
    expect(submitted!.title).toBe("Accounts submitted to Companies House");

    const accepted = events.find((e) => e.type === "filing_accepted");
    expect(accepted).toBeDefined();
    expect(accepted!.title).toBe("Accounts accepted");

    // The filing_confirmation notification must NOT leak as a reminder.
    expect(events.some((e) => e.type === "reminder_sent")).toBe(false);
  });
});
