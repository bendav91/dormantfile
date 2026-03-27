import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { getSubscriptionStatusFromEvent } from "@/lib/stripe/helpers";
import { tierFromPriceId } from "@/lib/subscription";
import { prisma } from "@/lib/db";
import Stripe from "stripe";
import { SubscriptionTier } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle checkout.session.completed — fires immediately when payment succeeds
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerId = typeof session.customer === "string" ? session.customer : undefined;
    const tier = (session.metadata?.tier as SubscriptionTier) || "basic";

    if (customerId) {
      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          subscriptionStatus: "active",
          subscriptionTier: tier,
          subscriptionPeriodStart: new Date(),
        },
      });
    }

    return NextResponse.json({ received: true });
  }

  // Handle subscription updates (cancel at period end / reactivation)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : undefined;

    if (customerId) {
      if (subscription.cancel_at_period_end) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "cancelling" },
        });
      } else if (subscription.status === "active") {
        // User reactivated before period end
        const tier = subscription.items.data.length
          ? tierFromPriceId(subscription.items.data[0].price.id)
          : undefined;
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: "active",
            ...(tier ? { subscriptionTier: tier } : {}),
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  }

  // Handle ongoing subscription events (renewals, failures, cancellations)
  const status = getSubscriptionStatusFromEvent(event.type);

  if (status) {
    const dataObject = event.data.object as Stripe.Subscription | Stripe.Invoice;
    const customerId = typeof dataObject.customer === "string"
      ? dataObject.customer
      : undefined;

    if (customerId) {
      const updateData: { subscriptionStatus: typeof status; subscriptionTier?: SubscriptionTier; subscriptionPeriodStart?: Date } = {
        subscriptionStatus: status,
      };

      // Reset period start on renewal
      if (status === "active") {
        updateData.subscriptionPeriodStart = new Date();
      }

      // Determine tier from the subscription's price
      if (status === "active" && "items" in dataObject && dataObject.items?.data?.length) {
        const priceId = dataObject.items.data[0].price.id;
        updateData.subscriptionTier = tierFromPriceId(priceId);
      } else if (status === "active" && "subscription" in dataObject && dataObject.subscription) {
        // invoice.paid — fetch subscription to get price
        const subId = typeof dataObject.subscription === "string"
          ? dataObject.subscription
          : dataObject.subscription;
        const sub = await stripe.subscriptions.retrieve(subId as string);
        if (sub.items.data.length) {
          updateData.subscriptionTier = tierFromPriceId(sub.items.data[0].price.id);
        }
      }

      // Reset tier on cancellation
      if (status === "cancelled") {
        updateData.subscriptionTier = "none";
      }

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: updateData,
      });
    }
  }

  return NextResponse.json({ received: true });
}
