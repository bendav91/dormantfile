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
  options?: { skipEmail?: boolean },
): Promise<void> {
  if (options?.skipEmail) return;

  try {
    const filedPeriodStart = new Date(filedPeriodEnd);
    filedPeriodStart.setUTCFullYear(filedPeriodStart.getUTCFullYear() - 1);
    filedPeriodStart.setUTCDate(filedPeriodStart.getUTCDate() + 1);

    const { subject, html } = buildFilingConfirmationEmail({
      companyName,
      periodStart: filedPeriodStart,
      periodEnd: filedPeriodEnd,
      filingType,
    });
    await sendEmail({ to: userEmail, subject, html });
  } catch {
    // Must not block
  }
}
