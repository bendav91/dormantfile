import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { buildFilingConfirmationEmail } from "@/lib/email/templates";

/**
 * Send the "your filing was accepted" confirmation email, exactly once per
 * filing, durably — surviving a process crash right after acceptance and a
 * temporary email-transport outage.
 *
 * Durability uses the existing `Notification` model only (no migration). A
 * small `type` namespace per `filingId` represents the lifecycle:
 *
 *  - `filing_confirmation`          SUCCESS / terminal-OK. THE dedupe + audit
 *                                   key: "the customer was told filing X was
 *                                   accepted". Written at most once. (Unit A
 *                                   semantics — unchanged.)
 *  - `filing_confirmation_pending`  "a confirmation is owed for this accepted
 *                                   filing." Written idempotently at the START
 *                                   of `sendFilingConfirmation`, BEFORE the
 *                                   send, so a crash right after acceptance is
 *                                   still recoverable by the drain. At most one.
 *  - `filing_confirmation_attempt`  One row appended per FAILED send attempt
 *                                   (inline or drain). Count = attempts made.
 *  - `filing_confirmation_failed`   Terminal GIVE-UP marker, written once after
 *                                   the attempt cap.
 *
 * An item is "owed/pending" iff it has `filing_confirmation_pending` AND NOT
 * `filing_confirmation` AND NOT `filing_confirmation_failed`.
 *
 * Give-up is by ATTEMPT COUNT, not wall-clock: after
 * `CONFIRMATION_ATTEMPT_CAP` failed attempts we stop and surface the item to
 * ops. The drain rides the daily `poll-filings` cron, so the cap of 3 ≈ ~3
 * days wall-clock. There is no sub-day backoff: the "backoff" IS the daily
 * cron cadence (at most one attempt per drain run per item), so no timers are
 * implemented — this is deliberate.
 *
 * Dedupe of the success email is defence-in-depth:
 *  - sequential calls: the `filing_confirmation` `findFirst` short-circuits
 *    the second call once the first has written its row;
 *  - concurrent calls: a deterministic `idempotencyKey` on `sendEmail` lets
 *    Resend dedupe within its window (~24h), so at most one email is sent.
 * (A DB-level unique constraint is intentionally out of scope here.)
 *
 * Contract preserved from Unit A:
 *  - If a `filing_confirmation` row already exists: no email, no duplicate
 *    success row.
 *  - On send failure: never throw, never write `filing_confirmation` (so a
 *    later drain can retry), and log the same structured error.
 *  - The `filed_elsewhere` path must never reach this function (its caller
 *    passes `skipEmail: true` and returns before this is invoked).
 */

const TYPE_CONFIRMATION = "filing_confirmation" as const;
const TYPE_PENDING = "filing_confirmation_pending" as const;
const TYPE_ATTEMPT = "filing_confirmation_attempt" as const;
const TYPE_FAILED = "filing_confirmation_failed" as const;

/**
 * Max FAILED send attempts before we give up and surface the item to ops.
 * The drain runs on the daily `poll-filings` cron, so 3 attempts ≈ ~3 days
 * of wall-clock retry. The daily cron cadence IS the backoff.
 */
export const CONFIRMATION_ATTEMPT_CAP = 3;

interface ConfirmationContent {
  filingId: string;
  companyId: string;
  recipient: string;
  companyName: string;
  periodStart: Date;
  periodEnd: Date;
  filingType: "accounts" | "ct600";
}

/**
 * The single shared "attempt the send" primitive used by BOTH the inline
 * caller and the drain (no duplicated send logic).
 *
 *  - If a `filing_confirmation` row already exists: no-op (idempotent).
 *  - Otherwise build + send the email with the deterministic idempotency key.
 *  - On success: write the `filing_confirmation` (success/audit) row.
 *  - On failure: append a `filing_confirmation_attempt` row and log the same
 *    structured error Unit A logged. Never throws.
 *
 * Returns `true` iff the confirmation is now delivered (row exists / was just
 * written), `false` if this attempt failed.
 */
async function attemptConfirmationSend(
  content: ConfirmationContent,
): Promise<boolean> {
  const { filingId, companyId, recipient, companyName, periodStart, periodEnd, filingType } =
    content;

  const existing = await prisma.notification.findFirst({
    where: { filingId, type: TYPE_CONFIRMATION },
  });
  if (existing) return true;

  try {
    const { subject, html } = buildFilingConfirmationEmail({
      companyName,
      periodStart,
      periodEnd,
      filingType,
    });
    await sendEmail({
      to: recipient,
      subject,
      html,
      idempotencyKey: `filing_confirmation-${filingId}`,
    });
  } catch (error) {
    console.error("[filing-confirmation] send failed", {
      filingId,
      companyId,
      recipient,
      error,
    });
    await prisma.notification.create({
      data: { companyId, filingId, type: TYPE_ATTEMPT },
    });
    return false;
  }

  await prisma.notification.create({
    data: { companyId, filingId, type: TYPE_CONFIRMATION },
  });
  return true;
}

/**
 * Inline entry point (called from the genuine-acceptance path of
 * `rollForwardPeriod`). If the confirmation was already delivered nothing is
 * owed and we return immediately (so re-entries on an already-confirmed
 * accepted filing — manual check-status AND the cron both reach it — never
 * accrue dead `pending` rows). Otherwise writes the durable `pending` marker
 * first so the owed confirmation survives a crash, then performs one send
 * attempt via the shared primitive. Never throws.
 */
export async function sendFilingConfirmation(args: {
  filingId: string;
  companyId: string;
  recipient: string;
  companyName: string;
  periodStart: Date;
  periodEnd: Date;
  filingType: "accounts" | "ct600";
}): Promise<void> {
  const { filingId, companyId } = args;

  // Already delivered — `filing_confirmation` is THE success/idempotency key,
  // so nothing is owed. Short-circuit BEFORE writing the `pending` marker:
  // otherwise every later re-entry on an already-confirmed filing (especially
  // pre-Unit-D filings confirmed by the old inline path that have no `pending`
  // row) would write a fresh dead `pending` row forever. `attemptConfirmationSend`
  // keeps its own confirmed-check (it is still the shared drain primitive);
  // this is just an additional earlier short-circuit on the inline path.
  const confirmed = await prisma.notification.findFirst({
    where: { filingId, type: TYPE_CONFIRMATION },
  });
  if (confirmed) return;

  // Idempotent durable "a confirmation is owed" marker — written BEFORE the
  // send so a crash between acceptance and delivery is still recoverable by
  // the drain. At most one per filing.
  const pending = await prisma.notification.findFirst({
    where: { filingId, type: TYPE_PENDING },
  });
  if (!pending) {
    await prisma.notification.create({
      data: { companyId, filingId, type: TYPE_PENDING },
    });
  }

  await attemptConfirmationSend(args);
}

export interface StuckConfirmation {
  filingId: string;
  companyId: string;
  attempts: number;
}

/**
 * Durable retry drain. Finds every confirmation that is owed/pending and, for
 * each:
 *  - if it has already reached `CONFIRMATION_ATTEMPT_CAP` failed attempts:
 *    write the terminal `filing_confirmation_failed` marker and add it to the
 *    returned stuck list (ops digest);
 *  - otherwise: perform exactly ONE send attempt via the shared primitive
 *    (success writes `filing_confirmation` and the item drops out of "owed";
 *    failure appends an attempt row). If that failing attempt is the one that
 *    reaches the cap, it is given up and reported stuck this same run.
 *
 * One bad item must not abort the rest — every item is processed in its own
 * try/catch and the drain itself never throws.
 *
 * Designed to ride the daily `poll-filings` cron: at most one attempt per
 * filing per run, so the daily cadence is the (only) backoff.
 */
export async function drainPendingFilingConfirmations(): Promise<
  StuckConfirmation[]
> {
  const stuck: StuckConfirmation[] = [];

  let pendingRows: Array<{ filingId: string; companyId: string }>;
  try {
    pendingRows = await prisma.notification.findMany({
      where: { type: TYPE_PENDING },
    });
  } catch (error) {
    console.error("[filing-confirmation] drain query failed", { error });
    return stuck;
  }

  // De-dupe by filingId (pending is at-most-one, but be defensive).
  const seen = new Set<string>();

  for (const row of pendingRows) {
    const { filingId, companyId } = row;
    if (seen.has(filingId)) continue;
    seen.add(filingId);

    try {
      // Already delivered or already given up -> no longer owed.
      const [confirmed, failed] = await Promise.all([
        prisma.notification.findFirst({
          where: { filingId, type: TYPE_CONFIRMATION },
        }),
        prisma.notification.findFirst({
          where: { filingId, type: TYPE_FAILED },
        }),
      ]);
      if (confirmed || failed) continue;

      const attempts = await prisma.notification.count({
        where: { filingId, type: TYPE_ATTEMPT },
      });

      if (attempts >= CONFIRMATION_ATTEMPT_CAP) {
        // Cap already reached on a prior run with no success since — give up.
        await prisma.notification.create({
          data: { companyId, filingId, type: TYPE_FAILED },
        });
        stuck.push({ filingId, companyId, attempts });
        continue;
      }

      const filing = await prisma.filing.findUnique({
        where: { id: filingId },
        include: { company: { include: { user: true } } },
      });
      if (!filing) {
        // Defensive guard against a currently-impossible invariant violation:
        // an orphaned `pending` with no Filing. A `pending` row only exists
        // for an `accepted` filing; accepted filings can't be hard-deleted via
        // the ct600-remove path, full-account deletion removes these
        // notifications in the same operation, and `Notification.filingId` is
        // FK-Restrict. This is NOT an expected/normal case — it is kept only
        // to fail terminal (write `failed`, surface to ops) rather than
        // re-query a nonexistent Filing forever should that invariant ever
        // break in future.
        await prisma.notification.create({
          data: { companyId, filingId, type: TYPE_FAILED },
        });
        stuck.push({ filingId, companyId, attempts });
        continue;
      }

      const ok = await attemptConfirmationSend({
        filingId,
        companyId,
        recipient: filing.company.user.email,
        companyName: filing.company.companyName,
        periodStart: filing.startDate ?? filing.periodStart,
        periodEnd: filing.endDate ?? filing.periodEnd,
        filingType: filing.filingType as "accounts" | "ct600",
      });

      if (!ok) {
        const attemptsNow = attempts + 1;
        if (attemptsNow >= CONFIRMATION_ATTEMPT_CAP) {
          // This failed attempt was the one that hit the cap — give up now.
          await prisma.notification.create({
            data: { companyId, filingId, type: TYPE_FAILED },
          });
          stuck.push({ filingId, companyId, attempts: attemptsNow });
        }
      }
    } catch (error) {
      // One bad item must not abort the rest of the drain.
      console.error("[filing-confirmation] drain item failed", {
        filingId,
        companyId,
        error,
      });
    }
  }

  return stuck;
}
