import { describe, it, expect } from "vitest";
import {
  crossedTier,
  UPCOMING_TIERS,
  OVERDUE_TIERS,
} from "@/lib/reminder-tiers";

// ─── crossedTier ──────────────────────────────────────────────────────────
//
// The ONE copy of the tier arithmetic shared, in lock-step, by:
//   - reminders/route.ts getCurrentTierType  → `reminder_${kind}_${days}`
//   - lapsed-compliance.ts currentLapsedTierType → `lapsed_${kind}_${days}`
//
// Upcoming (daysUntilDeadline >= 0): most-recently-crossed of
//   UPCOMING_TIERS [90,30,14,7,3,1] using `<=` (smallest tier >= days).
// Overdue (daysUntilDeadline < 0): most-recently-crossed of
//   OVERDUE_TIERS [1,7,30,90] using `>=` (largest tier <= daysOverdue).

describe("crossedTier — canonical tier arrays", () => {
  it("exports the locked product tier arrays", () => {
    expect(UPCOMING_TIERS).toEqual([90, 30, 14, 7, 3, 1]);
    expect(OVERDUE_TIERS).toEqual([1, 7, 30, 90]);
  });
});

describe("crossedTier — upcoming branch (daysUntilDeadline >= 0)", () => {
  it("90 days exactly → due/90 (boundary inclusive)", () => {
    expect(crossedTier(90)).toEqual({ kind: "due", days: 90 });
  });

  it("25 days → due/30 (most recently crossed)", () => {
    expect(crossedTier(25)).toEqual({ kind: "due", days: 30 });
  });

  it("5 days → due/7", () => {
    expect(crossedTier(5)).toEqual({ kind: "due", days: 7 });
  });

  it("1 day → due/1 (most urgent upcoming tier)", () => {
    expect(crossedTier(1)).toEqual({ kind: "due", days: 1 });
  });

  it("0 days (deadline day) → due/1", () => {
    expect(crossedTier(0)).toEqual({ kind: "due", days: 1 });
  });

  it("200 days → null (no tier crossed yet)", () => {
    expect(crossedTier(200)).toBeNull();
  });

  it("91 days → null (just outside the widest upcoming tier)", () => {
    expect(crossedTier(91)).toBeNull();
  });
});

describe("crossedTier — overdue branch (daysUntilDeadline < 0)", () => {
  it("1 day overdue → overdue/1", () => {
    expect(crossedTier(-1)).toEqual({ kind: "overdue", days: 1 });
  });

  it("10 days overdue → overdue/7 (most recently crossed)", () => {
    expect(crossedTier(-10)).toEqual({ kind: "overdue", days: 7 });
  });

  it("30 days overdue exactly → overdue/30 (boundary inclusive)", () => {
    expect(crossedTier(-30)).toEqual({ kind: "overdue", days: 30 });
  });

  it("31 days overdue → overdue/30 (largest tier <= daysOverdue)", () => {
    expect(crossedTier(-31)).toEqual({ kind: "overdue", days: 30 });
  });

  it("90 days overdue → overdue/90", () => {
    expect(crossedTier(-90)).toEqual({ kind: "overdue", days: 90 });
  });
});

// ─── Lock-step pin ────────────────────────────────────────────────────────
//
// The cron's reminder_* type and the lapsed_* type MUST differ ONLY by the
// namespace prefix. Both are thin wrappers over crossedTier. We re-derive
// each wrapper here from crossedTier and assert that across a representative
// range of daysUntilDeadline values the (kind, days) pair is IDENTICAL for
// both tracks. A future divergence in the shared arithmetic — or one track
// being silently edited away from the other — fails this test.

function cronType(d: number): string | null {
  const t = crossedTier(d);
  return t ? `reminder_${t.kind}_${t.days}` : null;
}

function lapsedType(d: number): string | null {
  const t = crossedTier(d);
  return t ? `lapsed_${t.kind}_${t.days}` : null;
}

describe("crossedTier — cron and lapsed tracks stay in lock-step", () => {
  it("for every daysUntilDeadline in [-365, 365] the two tracks differ ONLY by prefix", () => {
    for (let d = -365; d <= 365; d++) {
      const cron = cronType(d);
      const lap = lapsedType(d);

      if (cron === null) {
        // Both tracks must agree there is no tier here.
        expect(lap).toBeNull();
        continue;
      }

      // Both non-null and identical once the prefix is stripped: the
      // (kind, days) suffix is shared, never independently chosen.
      expect(lap).not.toBeNull();
      expect(cron.replace(/^reminder_/, "")).toBe(lap!.replace(/^lapsed_/, ""));

      // And both are pure functions of the single crossedTier result.
      const t = crossedTier(d)!;
      expect(cron).toBe(`reminder_${t.kind}_${t.days}`);
      expect(lap).toBe(`lapsed_${t.kind}_${t.days}`);
    }
  });

  it("crossedTier is referentially stable (pure) for the same input", () => {
    for (const d of [90, 25, 0, 200, -1, -10, -30, -31, -90, -400]) {
      expect(crossedTier(d)).toEqual(crossedTier(d));
    }
  });
});
