import { describe, it, expect } from "vitest";
import { getSubscriptionStatusFromEvent } from "@/lib/stripe/helpers";

describe("getSubscriptionStatusFromEvent", () => {
  it('maps "invoice.paid" to "active"', () => {
    expect(getSubscriptionStatusFromEvent("invoice.paid")).toBe("active");
  });

  it('maps "invoice.payment_failed" to "past_due"', () => {
    expect(getSubscriptionStatusFromEvent("invoice.payment_failed")).toBe("past_due");
  });

  it('maps "customer.subscription.deleted" to "cancelled"', () => {
    expect(getSubscriptionStatusFromEvent("customer.subscription.deleted")).toBe("cancelled");
  });

  it("returns null for an unknown event type", () => {
    expect(getSubscriptionStatusFromEvent("some.unknown.event")).toBeNull();
  });
});
