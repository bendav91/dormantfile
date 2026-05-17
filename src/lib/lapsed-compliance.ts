/**
 * Tiered lapsed-compliance / win-back policy (Risk 1 wrap).
 *
 * Pure, I/O-free decision logic that classifies a (user, company, filing)
 * triple and — for the Lapsed cohort only — decides which win-back
 * notification (if any) the daily reminders cron should send right now.
 *
 * Style mirrors `src/lib/companies-house/review-policy.ts`: documented
 * constants + small pure functions, behaviour testable without mocks.
 *
 * Cohorts
 * -------
 * - **Covered** — `subscriptionStatus ∈ {active, cancelling}`. The user is
 *   (still) paying, so the existing reminder behaviour is UNCHANGED. The
 *   lapsed track never touches them.
 * - **Lapsed** — `subscriptionStatus ∈ {past_due, cancelled, none}` AND the
 *   company is non-deleted AND it has an upcoming/overdue obligation. Gets
 *   the honest, reactivate-only win-back track.
 * - **Stop** — no messaging at all: the company is soft-deleted; OR the
 *   period filing is `accepted`/`filed_elsewhere`; OR (Lapsed) it has no
 *   live obligation. The per-period cap and the post-deadline grace are
 *   additional Stop conditions enforced by `decideLapsedNotificationType`.
 *
 * Windows ALIGN to the existing cron tiers — we do NOT invent new windows.
 * The win-back track fires on the SAME tier crossings as the cron's
 * `getCurrentTierType`, distinguished only by a distinct `lapsed_*`
 * notification-type namespace and different copy.
 */
import type { SubscriptionStatus, FilingStatus } from "@prisma/client";

/**
 * Maximum number of lapsed-track ("lapsed_*") emails to send per filing
 * period before going silent. Honest nudging, not harassment.
 */
export const LAPSED_PERIOD_CAP = 3;

/**
 * The lapsed track may fire on overdue tiers only up to and including the
 * 30-days-overdue tier. Past this it Stops — it must NEVER send the
 * `lapsed_overdue_90` tier.
 */
export const LAPSED_OVERDUE_GRACE_DAYS = 30;

// Mirror of the reminders cron tiers (see
// src/app/api/cron/reminders/route.ts). Kept in lock-step deliberately:
// the lapsed track must cross the SAME thresholds as getCurrentTierType.
const UPCOMING_TIERS = [90, 30, 14, 7, 3, 1] as const;
const OVERDUE_TIERS = [1, 7, 30, 90] as const;

export type ComplianceCohort = "Covered" | "Lapsed" | "Stop";

const COVERED_STATUSES: ReadonlySet<SubscriptionStatus> = new Set([
  "active",
  "cancelling",
]);

/** Filing statuses for which we must never message about the period again. */
const TERMINAL_FILING_STATUSES: ReadonlySet<FilingStatus> = new Set([
  "accepted",
  "filed_elsewhere",
]);

export interface ClassifyInput {
  subscriptionStatus: SubscriptionStatus;
  /** Company soft-deleted (`Company.deletedAt` set). */
  companyDeleted: boolean;
  /** Status of the Filing for the period in question. */
  filingStatus: FilingStatus;
  /**
   * Whether the company currently has an upcoming/overdue obligation worth
   * messaging about. Only consulted for the Lapsed branch — a Lapsed company
   * with nothing outstanding is a Stop.
   */
  hasObligation: boolean;
}

/**
 * Classify a (user, company, period-filing) triple into a compliance cohort.
 *
 * Stop signals (deleted company, terminal filing status) override the Lapsed
 * track. They do NOT override Covered: the existing reminder path owns its
 * own no-op decision (via `getCurrentTierType`) and must stay byte-for-byte
 * unchanged, so an `accepted` filing under an active sub is still "Covered"
 * here and simply yields no reminder downstream.
 */
export function classifyComplianceCohort(input: ClassifyInput): ComplianceCohort {
  // A soft-deleted company is silenced entirely, regardless of subscription.
  if (input.companyDeleted) return "Stop";

  if (COVERED_STATUSES.has(input.subscriptionStatus)) return "Covered";

  // Lapsed-eligible subscription statuses: past_due | cancelled | none.
  if (TERMINAL_FILING_STATUSES.has(input.filingStatus)) return "Stop";
  if (!input.hasObligation) return "Stop";

  return "Lapsed";
}

/**
 * The lapsed `Notification.type` for a filing's current tier, or null if no
 * tier has been crossed. Mirrors the cron's `getCurrentTierType` arithmetic
 * exactly (same `<=` / `>=` boundary semantics, same most-recently-crossed
 * selection) but emits the `lapsed_*` namespace instead of `reminder_*`.
 */
function currentLapsedTierType(daysUntilDeadline: number): string | null {
  if (daysUntilDeadline >= 0) {
    let matched: number | null = null;
    for (const tier of UPCOMING_TIERS) {
      if (daysUntilDeadline <= tier) matched = tier;
    }
    return matched !== null ? `lapsed_due_${matched}` : null;
  }
  const daysOverdue = -daysUntilDeadline;
  let matched: number | null = null;
  for (const tier of OVERDUE_TIERS) {
    if (daysOverdue >= tier) matched = tier;
  }
  return matched !== null ? `lapsed_overdue_${matched}` : null;
}

export interface LapsedDecisionInput extends Omit<ClassifyInput, "hasObligation"> {
  /**
   * Whole days from now until the deadline (negative ⇒ overdue). Same
   * convention as the reminders cron's `daysUntilDeadline`.
   */
  daysUntilDeadline: number;
  /**
   * All existing `Notification.type` values already recorded for THIS
   * filing/period (the cron passes `filing.notifications.map(n => n.type)`).
   * Used for both the per-tier dedupe and the per-period lapsed cap.
   */
  existingTypes: string[];
}

/**
 * Decide which lapsed-track notification (if any) to send for this filing
 * right now. Returns the `lapsed_due_<tier>` / `lapsed_overdue_<tier>` type
 * to send, or null when nothing should be sent because:
 *   - the cohort is Covered or Stop (deleted / accepted / filed_elsewhere);
 *   - the per-period cap of 3 lapsed_* emails is already reached;
 *   - we are beyond the 30-day post-deadline grace (would be overdue_90);
 *   - no tier has been crossed yet; or
 *   - the currently-crossed tier was already sent for this period.
 *
 * Pure: caller handles the actual send + the createMany dedupe write.
 */
export function decideLapsedNotificationType(
  input: LapsedDecisionInput,
): string | null {
  // hasObligation is implied true here: the cron only calls this for filings
  // it already loaded as a live obligation (status outstanding, deadline set).
  const cohort = classifyComplianceCohort({
    subscriptionStatus: input.subscriptionStatus,
    companyDeleted: input.companyDeleted,
    filingStatus: input.filingStatus,
    hasObligation: true,
  });
  if (cohort !== "Lapsed") return null;

  // Post-deadline grace: never send beyond 30 days overdue (i.e. the
  // lapsed_overdue_90 tier is never emitted).
  if (-input.daysUntilDeadline > LAPSED_OVERDUE_GRACE_DAYS) return null;

  // Per-period cap: count only lapsed_* history for this filing.
  const lapsedSent = input.existingTypes.filter((t) =>
    t.startsWith("lapsed_"),
  ).length;
  if (lapsedSent >= LAPSED_PERIOD_CAP) return null;

  const tierType = currentLapsedTierType(input.daysUntilDeadline);
  if (tierType === null) return null;

  // Per-tier idempotency: never re-send a tier already recorded.
  if (input.existingTypes.includes(tierType)) return null;

  return tierType;
}
