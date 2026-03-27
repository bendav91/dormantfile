import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe/client";
import { SubscriptionTier } from "@prisma/client";
import { priceIdFromTier, tierFromPriceId, isUpgrade } from "@/lib/subscription";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const body = await req.json();
  const tier = body.tier as SubscriptionTier;

  if (!tier || !["basic", "multi", "bulk"].includes(tier)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const newPriceId = priceIdFromTier(tier);
  if (!newPriceId) {
    return NextResponse.json({ error: "Plan not available" }, { status: 400 });
  }

  // Find the active subscription
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  const subscription = subscriptions.data[0];
  const currentPriceId = subscription.items.data[0].price.id;
  const currentTier = tierFromPriceId(currentPriceId);

  if (currentTier === tier) {
    return NextResponse.json({ error: "You are already on this plan" }, { status: 400 });
  }

  if (isUpgrade(currentTier, tier)) {
    // Upgrade: charge prorated difference immediately, update tier now
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: "always_invoice",
      payment_behavior: "error_if_incomplete",
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { subscriptionTier: tier },
    });

    return NextResponse.json({ success: true, tier, effective: "now" });
  } else {
    // Downgrade: change price for next renewal, keep current tier until then
    await stripe.subscriptions.update(subscription.id, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId,
        },
      ],
      proration_behavior: "none",
    });

    return NextResponse.json({ success: true, tier, effective: "next_period" });
  }
}
