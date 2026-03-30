import { config } from "dotenv";
config({ path: ".env.local" });

import { sendEmail } from "../src/lib/email/client";
import { buildWelcomeEmail } from "../src/lib/email/templates";

async function main() {
  const to = process.argv[2];
  if (!to) {
    console.error("Usage: npx tsx scripts/send-test-email.ts <email>");
    process.exit(1);
  }

  const { subject, html } = buildWelcomeEmail({
    userName: "Ben",
    dashboardUrl: "https://dormantfile.co.uk/dashboard",
  });

  const result = await sendEmail({ to, subject, html });
  console.log("Sent!", result);
}

main();
