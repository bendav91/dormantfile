import { describe, it, expect } from "vitest";
import type { SubscriptionStatus, FilingStatus } from "@prisma/client";
import {
  classifyComplianceCohort,
  decideLapsedNotificationType,
  LAPSED_PERIOD_CAP,
  LAPSED_OVERDUE_GRACE_DAYS,
} from "@/lib/lapsed-compliance";

// ─── classifyComplianceCohort ─────────────────────────────────────────────
//
// Covered = subscriptionStatus ∈ {active, cancelling}        → reminder path
// Lapsed  = subscriptionStatus ∈ {past_due, cancelled, none} → win-back path
//           AND company not deleted AND has an obligation
// Stop    = company deletedAt set; OR filing accepted|filed_elsewhere

describe("classifyComplianceCohort — exhaustive over SubscriptionStatus", () => {
  const baseObligation = {
    companyDeleted: false,
    filingStatus: "outstanding" as FilingStatus,
    hasObligation: true,
  };

  it("active → Covered", () => {
    expect(
      classifyComplianceCohort({ subscriptionStatus: "active", ...baseObligation }),
    ).toBe("Covered");
  });

  it("cancelling → Covered (still paying through period end)", () => {
    expect(
      classifyComplianceCohort({ subscriptionStatus: "cancelling", ...baseObligation }),
    ).toBe("Covered");
  });

  it("past_due → Lapsed", () => {
    expect(
      classifyComplianceCohort({ subscriptionStatus: "past_due", ...baseObligation }),
    ).toBe("Lapsed");
  });

  it("cancelled → Lapsed", () => {
    expect(
      classifyComplianceCohort({ subscriptionStatus: "cancelled", ...baseObligation }),
    ).toBe("Lapsed");
  });

  it("none → Lapsed", () => {
    expect(
      classifyComplianceCohort({ subscriptionStatus: "none", ...baseObligation }),
    ).toBe("Lapsed");
  });

  it("exhaustively classifies every enum member", () => {
    const all: SubscriptionStatus[] = [
      "none",
      "active",
      "cancelling",
      "cancelled",
      "past_due",
    ];
    const result = all.map((s) =>
      classifyComplianceCohort({ subscriptionStatus: s, ...baseObligation }),
    );
    expect(result).toEqual(["Lapsed", "Covered", "Covered", "Lapsed", "Lapsed"]);
  });
});

describe("classifyComplianceCohort — Stop signals override Lapsed", () => {
  it("Stop when the company is soft-deleted (even if subscription lapsed)", () => {
    expect(
      classifyComplianceCohort({
        subscriptionStatus: "cancelled",
        companyDeleted: true,
        filingStatus: "outstanding",
        hasObligation: true,
      }),
    ).toBe("Stop");
  });

  it("Stop when the period filing is already accepted", () => {
    expect(
      classifyComplianceCohort({
        subscriptionStatus: "none",
        companyDeleted: false,
        filingStatus: "accepted",
        hasObligation: true,
      }),
    ).toBe("Stop");
  });

  it("Stop when the period filing is filed_elsewhere", () => {
    expect(
      classifyComplianceCohort({
        subscriptionStatus: "past_due",
        companyDeleted: false,
        filingStatus: "filed_elsewhere",
        hasObligation: true,
      }),
    ).toBe("Stop");
  });

  it("Stop when a lapsed company has no upcoming/overdue obligation", () => {
    expect(
      classifyComplianceCohort({
        subscriptionStatus: "cancelled",
        companyDeleted: false,
        filingStatus: "outstanding",
        hasObligation: false,
      }),
    ).toBe("Stop");
  });

  it("Covered users with accepted filing are still Covered (reminder path owns Stop)", () => {
    // Stop signals only redirect the Lapsed track; the Covered path is
    // byte-for-byte unchanged and decides its own no-op via getCurrentTierType.
    expect(
      classifyComplianceCohort({
        subscriptionStatus: "active",
        companyDeleted: false,
        filingStatus: "accepted",
        hasObligation: true,
      }),
    ).toBe("Covered");
  });

  it("a deleted company under an active sub is Stop (no messaging at all)", () => {
    expect(
      classifyComplianceCohort({
        subscriptionStatus: "active",
        companyDeleted: true,
        filingStatus: "outstanding",
        hasObligation: true,
      }),
    ).toBe("Stop");
  });
});

// ─── decideLapsedNotificationType ─────────────────────────────────────────
//
// Aligned to the EXISTING cron tiers (UPCOMING [90,30,14,7,3,1],
// OVERDUE [1,7,30,90]) — same crossings as getCurrentTierType, only the
// namespace (lapsed_*) and copy differ.
// Returns null when: Covered/Stop, cap (3) reached, beyond 30d grace
// (would be overdue_90), or no NEW tier crossed.

const lapsed = {
  subscriptionStatus: "cancelled" as SubscriptionStatus,
  companyDeleted: false,
  filingStatus: "outstanding" as FilingStatus,
};

describe("decideLapsedNotificationType — tier alignment with the existing cron", () => {
  it("constants are the locked product decisions", () => {
    expect(LAPSED_PERIOD_CAP).toBe(3);
    expect(LAPSED_OVERDUE_GRACE_DAYS).toBe(30);
  });

  it("25 days until deadline → lapsed_due_30 (same crossing as reminder_due_30)", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: 25, existingTypes: [] }),
    ).toBe("lapsed_due_30");
  });

  it("90 days exactly → lapsed_due_90 (boundary inclusive)", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: 90, existingTypes: [] }),
    ).toBe("lapsed_due_90");
  });

  it("1 day until deadline → lapsed_due_1 (most urgent upcoming tier)", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: 1, existingTypes: [] }),
    ).toBe("lapsed_due_1");
  });

  it("deadline day (0 days) → lapsed_due_1 (matches getCurrentTierType upcoming branch)", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: 0, existingTypes: [] }),
    ).toBe("lapsed_due_1");
  });

  it("200 days out → null (no tier crossed yet, like the reminder cron)", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: 200, existingTypes: [] }),
    ).toBeNull();
  });

  it("10 days overdue → lapsed_overdue_7 (same crossing as reminder_overdue_7)", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: -10, existingTypes: [] }),
    ).toBe("lapsed_overdue_7");
  });

  it("1 day overdue → lapsed_overdue_1", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: -1, existingTypes: [] }),
    ).toBe("lapsed_overdue_1");
  });

  it("exactly 30 days overdue → lapsed_overdue_30 (last tier within grace)", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: -30, existingTypes: [] }),
    ).toBe("lapsed_overdue_30");
  });
});

describe("decideLapsedNotificationType — post-deadline 30-day grace (Stop)", () => {
  it("31 days overdue → null (never sends overdue_90, beyond grace)", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: -31, existingTypes: [] }),
    ).toBeNull();
  });

  it("90 days overdue → null (would be overdue_90 — explicitly never sent)", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: -90, existingTypes: [] }),
    ).toBeNull();
  });

  it("365 days overdue → null", () => {
    expect(
      decideLapsedNotificationType({ ...lapsed, daysUntilDeadline: -365, existingTypes: [] }),
    ).toBeNull();
  });
});

describe("decideLapsedNotificationType — per-period cap of 3 lapsed emails", () => {
  it("sends the 3rd lapsed email when only 2 prior lapsed_* exist", () => {
    expect(
      decideLapsedNotificationType({
        ...lapsed,
        daysUntilDeadline: -10,
        existingTypes: ["lapsed_due_90", "lapsed_due_30"],
      }),
    ).toBe("lapsed_overdue_7");
  });

  it("Stop (null) once 3 lapsed_* notifications already exist for the period", () => {
    expect(
      decideLapsedNotificationType({
        ...lapsed,
        daysUntilDeadline: -10,
        existingTypes: ["lapsed_due_90", "lapsed_due_30", "lapsed_due_1"],
      }),
    ).toBeNull();
  });

  it("cap counts ONLY lapsed_* — reminder_* history does not consume the cap", () => {
    expect(
      decideLapsedNotificationType({
        ...lapsed,
        daysUntilDeadline: -10,
        existingTypes: [
          "reminder_due_90",
          "reminder_due_30",
          "reminder_due_14",
          "reminder_due_7",
        ],
      }),
    ).toBe("lapsed_overdue_7");
  });
});

describe("decideLapsedNotificationType — per-tier idempotency (no re-send)", () => {
  it("null when this exact lapsed tier was already sent", () => {
    expect(
      decideLapsedNotificationType({
        ...lapsed,
        daysUntilDeadline: 25,
        existingTypes: ["lapsed_due_30"],
      }),
    ).toBeNull();
  });

  it("still sends a NEWLY crossed tier even if an earlier lapsed tier was sent", () => {
    expect(
      decideLapsedNotificationType({
        ...lapsed,
        daysUntilDeadline: 5,
        existingTypes: ["lapsed_due_30"],
      }),
    ).toBe("lapsed_due_7");
  });
});

describe("decideLapsedNotificationType — non-Lapsed cohorts get nothing", () => {
  it("Covered (active) → null (the lapsed track must never touch payers)", () => {
    expect(
      decideLapsedNotificationType({
        subscriptionStatus: "active",
        companyDeleted: false,
        filingStatus: "outstanding",
        daysUntilDeadline: 25,
        existingTypes: [],
      }),
    ).toBeNull();
  });

  it("Covered (cancelling) → null", () => {
    expect(
      decideLapsedNotificationType({
        subscriptionStatus: "cancelling",
        companyDeleted: false,
        filingStatus: "outstanding",
        daysUntilDeadline: -10,
        existingTypes: [],
      }),
    ).toBeNull();
  });

  it("Stop via deleted company → null", () => {
    expect(
      decideLapsedNotificationType({
        subscriptionStatus: "cancelled",
        companyDeleted: true,
        filingStatus: "outstanding",
        daysUntilDeadline: 25,
        existingTypes: [],
      }),
    ).toBeNull();
  });

  it("Stop via accepted filing → null", () => {
    expect(
      decideLapsedNotificationType({
        subscriptionStatus: "none",
        companyDeleted: false,
        filingStatus: "accepted",
        daysUntilDeadline: 25,
        existingTypes: [],
      }),
    ).toBeNull();
  });

  it("Stop via filed_elsewhere → null", () => {
    expect(
      decideLapsedNotificationType({
        subscriptionStatus: "past_due",
        companyDeleted: false,
        filingStatus: "filed_elsewhere",
        daysUntilDeadline: -10,
        existingTypes: [],
      }),
    ).toBeNull();
  });
});
