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
 * `filingId`; the confirmation is idempotent + audited on
 * `(filingId, "filing_confirmation")` inside `sendFilingConfirmation`, so
 * the manual-check and cron paths can no longer double-send. This must never
 * throw on email failure (it must not block acceptance).
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
    // Must not block acceptance — sendFilingConfirmation already handles its
    // own send failures, but stay defensive so a throw never propagates.
  }
}
