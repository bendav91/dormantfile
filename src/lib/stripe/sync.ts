import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { tierFromPriceId } from "@/lib/subscription";
import { SubscriptionStatus } from "@prisma/client";

/**
 * Syncs a user's subscription state from Stripe if the local data looks stale.
 * Call on dashboard load as a safety net for missed webhooks or delayed renewals.
 */
export async function syncSubscriptionIfStale(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.stripeCustomerId) return;

  // Only check if user has an active-ish subscription
  if (!["active", "cancelling"].includes(user.subscriptionStatus)) return;

  // If period start is less than 11 months ago, no renewal could have happened yet
  if (user.subscriptionPeriodStart) {
    const monthsSincePeriodStart =
      (Date.now() - user.subscriptionPeriodStart.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsSincePeriodStart < 11) return;
  }

  // Fetch current subscription from Stripe
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    // No subscription in Stripe — mark as cancelled
    if (user.subscriptionStatus !== "cancelled") {
      await prisma.user.update({
        where: { id: userId },
        data: { subscriptionStatus: "cancelled", subscriptionTier: "none" },
      });
    }
    return;
  }

  const sub = subscriptions.data[0];
  const stripeTier = sub.items.data.length
    ? tierFromPriceId(sub.items.data[0].price.id)
    : "none";

  let status: SubscriptionStatus;
  if (sub.status === "active" && sub.cancel_at_period_end) {
    status = "cancelling";
  } else if (sub.status === "active") {
    status = "active";
  } else if (sub.status === "past_due") {
    status = "past_due";
  } else if (sub.status === "canceled") {
    status = "cancelled";
  } else {
    return; // trialing, incomplete, etc. — don't touch
  }

  const periodStart = new Date((sub as unknown as { current_period_start: number }).current_period_start * 1000);

  // Only update if something actually changed
  if (
    user.subscriptionStatus !== status ||
    user.subscriptionTier !== stripeTier ||
    user.subscriptionPeriodStart?.getTime() !== periodStart.getTime()
  ) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionStatus: status,
        subscriptionTier: stripeTier,
        subscriptionPeriodStart: periodStart,
      },
    });
  }
}
