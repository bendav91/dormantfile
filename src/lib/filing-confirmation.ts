import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { buildFilingConfirmationEmail } from "@/lib/email/templates";

/**
 * Send the "your filing was accepted" confirmation email, exactly once per
 * filing, and record that fact as the single source of truth.
 *
 * A `Notification{ filingId, type: "filing_confirmation" }` row is the dedupe
 * AND audit key: it means "the customer was told filing X was accepted". The
 * manual-check route and the cron poll can both reach an accepted filing, so
 * this MUST be idempotent on `(filingId, "filing_confirmation")`.
 *
 * Contract:
 *  - If such a row already exists: do nothing (no email, no duplicate row).
 *  - Otherwise: send the email, then on success write the row.
 *  - On send failure: do NOT throw, do NOT write the row (so a later retry can
 *    still happen), and log a structured error.
 *
 * This is deliberately minimal — no retry/backoff here; a later unit adds
 * durability. This represents "we filed this and CH/HMRC accepted it"; the
 * `filed_elsewhere` path must never reach this function (its caller passes
 * `skipEmail: true` and returns before this is invoked).
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
  const { filingId, companyId, recipient } = args;

  const existing = await prisma.notification.findFirst({
    where: { filingId, type: "filing_confirmation" },
  });
  if (existing) return;

  try {
    const { subject, html } = buildFilingConfirmationEmail({
      companyName: args.companyName,
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      filingType: args.filingType,
    });
    await sendEmail({ to: recipient, subject, html });
  } catch (error) {
    console.error("[filing-confirmation] send failed", {
      filingId,
      companyId,
      recipient,
      error,
    });
    return;
  }

  await prisma.notification.create({
    data: { companyId, filingId, type: "filing_confirmation" },
  });
}
