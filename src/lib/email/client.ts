import { Resend } from "resend";

// Use a Proxy to defer instantiation, avoiding build-time errors
// when RESEND_API_KEY is not set in the environment.
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const client = new Resend(process.env.RESEND_API_KEY);
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});

const FROM_ADDRESS = "DormantFile <noreply@notifications.southamwebdesign.co.uk>"; // TODO
export const REPLY_TO_ADDRESS = "hello@dormantfile.co.uk";

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
  idempotencyKey,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /**
   * Pass a stable string when this send must not be duplicated even if the
   * caller is invoked twice. Resend dedupes within its idempotency window
   * (~24h). Use a deterministic key tied to the business event, e.g.
   * `account-deleted-${userId}`.
   */
  idempotencyKey?: string;
}) {
  const result = await resend.emails.send(
    {
      from: FROM_ADDRESS,
      to,
      subject,
      ...(html ? { html } : { text: text ?? "" }),
      replyTo: replyTo ?? REPLY_TO_ADDRESS,
      ...(headers && { headers }),
    },
    idempotencyKey ? { idempotencyKey } : undefined,
  );

  // Resend returns { data, error } — errors are NOT thrown by the SDK.
  // Surface them as exceptions so callers' try/catch + telemetry work.
  if (result.error) {
    const err = new Error(
      `Resend send failed: ${result.error.name} — ${result.error.message}`,
    );
    (err as Error & { resendError?: unknown }).resendError = result.error;
    throw err;
  }

  return result;
}

/**
 * Send up to 100 emails in a single Resend `/emails/batch` call. For more
 * than 100 recipients, the caller should chunk. Returns the number of
 * successful sends and the number of failures (with the first error message
 * for diagnostics).
 */
export async function sendEmailBatch(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
  }>,
): Promise<{ sent: number; failed: number; firstError?: string }> {
  if (emails.length === 0) return { sent: 0, failed: 0 };

  const payload = emails.map((e) => ({
    from: FROM_ADDRESS,
    to: e.to,
    subject: e.subject,
    html: e.html,
    replyTo: e.replyTo ?? REPLY_TO_ADDRESS,
  }));

  const result = await resend.batch.send(payload);

  if (result.error) {
    return {
      sent: 0,
      failed: emails.length,
      firstError: `${result.error.name} — ${result.error.message}`,
    };
  }

  // batch.send with default "strict" validation returns one entry per email,
  // each with an `id` on success. We treat anything missing an `id` as a
  // failure (Resend rarely returns partial-success arrays, but be defensive).
  const items: Array<{ id?: string }> = result.data?.data ?? [];
  const sent = items.filter((i) => i.id).length;
  const failed = emails.length - sent;
  return { sent, failed };
}
