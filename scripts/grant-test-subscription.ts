import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

// Import the Prisma client *after* dotenv has populated process.env — db.ts
// reads POSTGRES_URL at module-eval time, and a static import would be hoisted
// above the config() calls above.
//
// Usage: npx tsx scripts/grant-test-subscription.ts <email>
// Marks a user as subscribed (active / basic) without going through Stripe,
// so the CT600 submit route's subscription gate passes for local HMRC testing.
async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/grant-test-subscription.ts <email>");
    process.exit(1);
  }

  // Sanity-check that .env parsing kept the special-char poll password intact.
  // A parsing bug here would surface later as an HMRC auth failure.
  console.log(
    "HMRC_SENDER_PASSWORD parsed as:",
    JSON.stringify(process.env.HMRC_SENDER_PASSWORD),
  );
  console.log("HMRC_SENDER_ID:", process.env.HMRC_SENDER_ID);
  console.log("HMRC_VENDOR_ID:", process.env.HMRC_VENDOR_ID);

  const { prisma } = await import("../src/lib/db");

  const user = await prisma.user.update({
    where: { email },
    data: { subscriptionStatus: "active", subscriptionTier: "basic" },
    select: { id: true, email: true, subscriptionStatus: true, subscriptionTier: true },
  });

  console.log("Updated:", user);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
