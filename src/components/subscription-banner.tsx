"use client";

import { AlertTriangle } from "lucide-react";
import { SubscriptionStatus } from "@prisma/client";
import { isFilingLive } from "@/lib/launch-mode";

interface SubscriptionBannerProps {
  status: SubscriptionStatus;
}

export default function SubscriptionBanner({ status }: SubscriptionBannerProps) {
  if (!isFilingLive()) return null;

  if (status === "active" || status === "cancelling") {
    if (status === "cancelling") {
      return (
        <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-warning-bg border border-warning-border rounded-xl mb-6">
          <div className="flex items-center gap-2.5">
            <span className="text-warning shrink-0">
              <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
            </span>
            <p className="text-sm text-warning-text m-0 font-medium">
              Your subscription is set to cancel at the end of your billing period. You can still
              file until then.
            </p>
          </div>
          <button
            onClick={handlePortal}
            className="focus-ring bg-warning text-card py-2 px-[18px] rounded-lg font-semibold text-sm border-0 cursor-pointer transition-all duration-200 whitespace-nowrap shrink-0 hover:opacity-90"
          >
            Undo cancellation
          </button>
        </div>
      );
    }
    return null;
  }

  function handleCheckout() {
    window.location.href = "/choose-plan";
  }

  async function handlePortal() {
    const res = await fetch("/api/stripe/create-portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      if (url) window.location.href = url;
    }
  }

  if (status === "none") {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-warning-bg border border-warning-border rounded-xl mb-6">
        <div className="flex items-center gap-2.5">
          <span className="text-warning shrink-0">
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="text-sm text-warning-text m-0 font-medium">
            You haven&apos;t completed your subscription yet. Choose a plan to start filing.
          </p>
        </div>
        <button
          onClick={handleCheckout}
          className="focus-ring bg-cta text-card py-2 px-[18px] rounded-lg font-semibold text-sm border-0 cursor-pointer transition-all duration-200 whitespace-nowrap shrink-0 hover:opacity-90"
        >
          Choose a plan
        </button>
      </div>
    );
  }

  if (status === "past_due") {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-danger-bg border border-danger-border rounded-xl mb-6">
        <div className="flex items-center gap-2.5">
          <span className="text-danger shrink-0">
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="text-sm text-danger-text m-0 font-medium">
            Your payment is past due. Please update your billing details to keep your subscription
            active.
          </p>
        </div>
        <button
          onClick={handlePortal}
          className="focus-ring bg-danger text-card py-2 px-[18px] rounded-lg font-semibold text-sm border-0 cursor-pointer transition-all duration-200 whitespace-nowrap shrink-0 hover:opacity-90"
        >
          Update billing
        </button>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-page border border-disabled rounded-xl mb-6">
        <div className="flex items-center gap-2.5">
          <span className="text-secondary shrink-0">
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="text-sm text-body m-0 font-medium">
            Your subscription has been cancelled. Resubscribe to continue filing with HMRC.
          </p>
        </div>
        <button
          onClick={handleCheckout}
          className="focus-ring bg-body text-card py-2 px-[18px] rounded-lg font-semibold text-sm border-0 cursor-pointer transition-all duration-200 whitespace-nowrap shrink-0 hover:opacity-90"
        >
          Resubscribe
        </button>
      </div>
    );
  }

  return null;
}
