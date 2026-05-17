import { sendFilingConfirmation } from "@/lib/filing-confirmation";

/**
 * After a filing is accepted, send the confirmation email.
 *
 * In the materialised period model, there is no Company pointer to advance
 * and no Reminder records to manage. The Filing was already transitioned
 * to `accepted` by the submit route. This function only handles the email.
 *
 * `skipEmail: true` is the seam for the `mark-filed` / `filed_elsewhere`
 * path: it must emit NOTHING (no email, no `filing_confirmation`
 * Notification). Keep this short-circuit before any confirmation work — the
 * filed-elsewhere path must never reach `sendFilingConfirmation`.
 *
 * The genuine-acceptance callers (check-status, poll-filings) pass
 * `filingId`; `sendFilingConfirmation` dedupes both the sequential case (via
 * the `(filingId, "filing_confirmation")` Notification check) and the
 * concurrent manual-check-vs-cron race (via the email idempotency key), so a
 * duplicate confirmation is not sent. This must never throw on email failure
 * (it must not block acceptance).
 */
export async function rollForwardPeriod(
  companyId: string,
  filedPeriodEnd: Date,
  registeredForCorpTax: boolean,
  filingType: "accounts" | "ct600",
  userEmail: string,
  companyName: string,
  options?: { skipEmail?: boolean; filingId?: string; startDate?: Date; endDate?: Date },
): Promise<void> {
  if (options?.skipEmail) return;

  try {
    // Use explicit startDate/endDate if provided (new model), otherwise derive from periodEnd
    const periodStart = options?.startDate ?? (() => {
      const d = new Date(filedPeriodEnd);
      d.setUTCFullYear(d.getUTCFullYear() - 1);
      d.setUTCDate(d.getUTCDate() + 1);
      return d;
    })();
    const periodEnd = options?.endDate ?? filedPeriodEnd;

    await sendFilingConfirmation({
      filingId: options!.filingId!,
      companyId,
      recipient: userEmail,
      companyName,
      periodStart,
      periodEnd,
      filingType,
    });
  } catch {
    // Must not block acceptance. sendFilingConfirmation already swallows its
    // own email-send failures, so the only throws this guards are the
    // surrounding work: the period-start date derivation and the Prisma
    // findFirst/create calls. Swallow them so a throw never propagates and
    // blocks the accepted filing.
  }
}
