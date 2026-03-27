import { Resend } from "resend";

// Use a Proxy to defer instantiation, avoiding build-time errors
// when RESEND_API_KEY is not set in the environment.
export const resend = new Proxy({} as Resend, {
  get(_target, prop) {
    const client = new Resend(process.env.RESEND_API_KEY);
    return (client as unknown as Record<string | symbol, unknown>)[prop];
  },
});
