import { sendEmail } from "@/lib/email/client";
import { buildFilingConfirmationEmail } from "@/lib/email/templates";

/**
 * After a filing is accepted, send a confirmation email.
 *
 * In the materialised period model, there is no Company pointer to advance
 * and no Reminder records to manage. The Filing was already transitioned
 * to `accepted` by the submit route. This function only handles the email.
 */
export async function rollForwardPeriod(
  companyId: string,
  filedPeriodEnd: Date,
  registeredForCorpTax: boolean,
  filingType: "accounts" | "ct600",
  userEmail: string,
  companyName: string,
  options?: { skipEmail?: boolean; startDate?: Date; endDate?: Date },
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

    const { subject, html } = buildFilingConfirmationEmail({
      companyName,
      periodStart,
      periodEnd,
      filingType,
    });
    await sendEmail({ to: userEmail, subject, html });
  } catch {
    // Must not block
  }
}
