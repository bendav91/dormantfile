import { SubscriptionStatus } from "@prisma/client";

export function getSubscriptionStatusFromEvent(eventType: string): SubscriptionStatus | null {
  switch (eventType) {
    case "invoice.paid":
      return SubscriptionStatus.active;
    case "invoice.payment_failed":
      return SubscriptionStatus.past_due;
    case "customer.subscription.updated":
      // Handled separately in the webhook (needs cancel_at_period_end check)
      return null;
    case "customer.subscription.deleted":
      return SubscriptionStatus.cancelled;
    default:
      return null;
  }
}
