import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { getSubscriptionStatusFromEvent } from "@/lib/stripe/helpers";
import { isUpgrade, tierFromPriceId } from "@/lib/subscription";
import { prisma } from "@/lib/db";
import Stripe from "stripe";
import { SubscriptionTier } from "@prisma/client";
import { sendEmail } from "@/lib/email/client";
import { buildPaymentFailedEmail, buildSubscriptionCancelledEmail } from "@/lib/email/templates";
import { notifyAdmins } from "@/lib/email/admin-notifications";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
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
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : undefined;

    if (customerId) {
      if (subscription.cancel_at_period_end) {
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: { subscriptionStatus: "cancelling" },
        });
      } else if (subscription.status === "active") {
        // User reactivated before period end, or tier changed (upgrade/downgrade took effect)
        const tier = subscription.items.data.length
          ? tierFromPriceId(subscription.items.data[0].price.id)
          : undefined;

        // Capture pre-update state to detect tier change for admin notification
        const userBefore = tier
          ? await prisma.user.findFirst({
              where: { stripeCustomerId: customerId },
              select: { email: true, name: true, subscriptionTier: true },
            })
          : null;

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            subscriptionStatus: "active",
            ...(tier ? { subscriptionTier: tier } : {}),
            // Reset agent filing preference when leaving agent tier
            ...(tier && tier !== "agent" ? { filingAsAgent: false } : {}),
          },
        });

        // Notify admins on tier change (skip if tier didn't move)
        if (userBefore && tier && tier !== userBefore.subscriptionTier && tier !== "none") {
          try {
            await notifyAdmins({
              kind: "tier_change",
              userEmail: userBefore.email,
              userName: userBefore.name,
              fromTier: userBefore.subscriptionTier,
              toTier: tier,
              direction: isUpgrade(userBefore.subscriptionTier, tier) ? "upgrade" : "downgrade",
            });
          } catch (err) {
            console.error("Failed to notify admins of tier change:", err);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  }

  // Handle ongoing subscription events (renewals, failures, cancellations)
  const status = getSubscriptionStatusFromEvent(event.type);

  if (status) {
    const dataObject = event.data.object as Stripe.Subscription | Stripe.Invoice;
    const customerId = typeof dataObject.customer === "string" ? dataObject.customer : undefined;

    if (customerId) {
      const updateData: {
        subscriptionStatus: typeof status;
        subscriptionTier?: SubscriptionTier;
        subscriptionPeriodStart?: Date;
      } = {
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
        const subId =
          typeof dataObject.subscription === "string"
            ? dataObject.subscription
            : dataObject.subscription;
        const sub = await stripe.subscriptions.retrieve(subId as string);
        if (sub.items.data.length) {
          updateData.subscriptionTier = tierFromPriceId(sub.items.data[0].price.id);
        }
      }

      // Reset tier and agent preference on cancellation
      if (status === "cancelled") {
        updateData.subscriptionTier = "none";
      }

      // Capture pre-update user state for admin notifications: first-payment
      // detection needs subscriptionPeriodStart, cancellation needs the
      // previous tier (we set it to "none" on the update).
      const userBefore = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
        select: {
          email: true,
          name: true,
          subscriptionTier: true,
          subscriptionPeriodStart: true,
        },
      });

      // Reset agent filing preference when tier changes away from agent
      const resetAgent = updateData.subscriptionTier && updateData.subscriptionTier !== "agent";

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          ...updateData,
          ...(resetAgent ? { filingAsAgent: false } : {}),
        },
      });

      // Send transactional emails for payment failure and cancellation.
      // Note: user may not exist if account was just deleted (which cancels
      // Stripe subscriptions, triggering this webhook). findFirst handles
      // this gracefully — if null, we skip the email.
      if (status === "past_due" || status === "cancelled") {
        if (userBefore) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXTAUTH_URL ||
            "https://dormantfile.co.uk";

          try {
            if (status === "past_due") {
              const { subject, html } = buildPaymentFailedEmail({
                settingsUrl: `${appUrl}/settings`,
              });
              await sendEmail({ to: userBefore.email, subject, html });
            } else if (status === "cancelled") {
              const { subject, html } = buildSubscriptionCancelledEmail({
                choosePlanUrl: `${appUrl}/choose-plan`,
              });
              await sendEmail({ to: userBefore.email, subject, html });
            }
          } catch {
            // Email failure shouldn't break the webhook
          }
        }
      }

      // Admin notifications for payment events
      if (userBefore) {
        try {
          if (status === "active" && event.type === "invoice.paid") {
            const invoice = dataObject as Stripe.Invoice;
            await notifyAdmins({
              kind: "payment_succeeded",
              userEmail: userBefore.email,
              userName: userBefore.name,
              amountPence: invoice.amount_paid ?? 0,
              currency: invoice.currency ?? "gbp",
              tier: updateData.subscriptionTier ?? userBefore.subscriptionTier,
              isFirstPayment: userBefore.subscriptionPeriodStart === null,
            });
          } else if (status === "past_due") {
            await notifyAdmins({
              kind: "payment_failed",
              userEmail: userBefore.email,
              userName: userBefore.name,
              tier: userBefore.subscriptionTier,
            });
          } else if (status === "cancelled") {
            await notifyAdmins({
              kind: "subscription_cancelled",
              userEmail: userBefore.email,
              userName: userBefore.name,
              previousTier: userBefore.subscriptionTier,
            });
          }
        } catch (err) {
          console.error(`Failed to notify admins of ${status} event:`, err);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
