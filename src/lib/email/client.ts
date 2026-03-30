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

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
}: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}) {
  return resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    ...(html ? { html } : { text: text ?? "" }),
    ...(replyTo && { replyTo }),
    ...(headers && { headers }),
  });
}
