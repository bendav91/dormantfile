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
  return resend.emails.send(
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
}
