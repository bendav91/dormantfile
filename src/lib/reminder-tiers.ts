/**
 * Canonical reminder/lapsed tier arithmetic — the SINGLE source of truth.
 *
 * Pure, I/O-free. Both notification tracks delegate here so they cross the
 * SAME thresholds with the SAME boundary semantics, distinguished ONLY by
 * their notification-type namespace prefix:
 *
 *   - reminders/route.ts `getCurrentTierType`     → `reminder_${kind}_${days}`
 *   - lapsed-compliance.ts `currentLapsedTierType` → `lapsed_${kind}_${days}`
 *
 * Keeping the arithmetic in one place makes the product-required lock-step
 * structural rather than coincidental: a one-file edit can no longer silently
 * diverge the two tracks (see src/__tests__/lib/reminder-tiers.test.ts).
 *
 * Semantics are byte-for-byte preserved from the original duplicated loops:
 *   - Upcoming (daysUntilDeadline >= 0): scan UPCOMING_TIERS, last `<=` match
 *     wins → the smallest tier that is >= daysUntilDeadline (the
 *     most-recently-crossed upcoming threshold).
 *   - Overdue (daysUntilDeadline < 0): scan OVERDUE_TIERS, last `>=` match
 *     wins → the largest tier that is <= daysOverdue.
 */

// Upcoming: remind at these days-before-deadline thresholds.
// Overdue: remind at these days-after-deadline thresholds.
export const UPCOMING_TIERS = [90, 30, 14, 7, 3, 1] as const;
export const OVERDUE_TIERS = [1, 7, 30, 90] as const;

export type CrossedTier = { kind: "due" | "overdue"; days: number };

/**
 * The tier a filing has currently crossed for the given whole-day distance to
 * its deadline (negative ⇒ overdue), or null if no tier has been crossed yet.
 *
 * For 25 days until deadline → `{ kind: "due", days: 30 }` (most recently
 * crossed). For 10 days overdue → `{ kind: "overdue", days: 7 }`.
 */
export function crossedTier(daysUntilDeadline: number): CrossedTier | null {
  if (daysUntilDeadline >= 0) {
    let matched: number | null = null;
    for (const tier of UPCOMING_TIERS) {
      if (daysUntilDeadline <= tier) matched = tier;
    }
    return matched !== null ? { kind: "due", days: matched } : null;
  }
  const daysOverdue = -daysUntilDeadline;
  let matched: number | null = null;
  for (const tier of OVERDUE_TIERS) {
    if (daysOverdue >= tier) matched = tier;
  }
  return matched !== null ? { kind: "overdue", days: matched } : null;
}
