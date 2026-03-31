"use client";

import { SubscriptionTier } from "@prisma/client";
import { CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";

interface PlanPickerProps {
  currentTier: SubscriptionTier;
  isUpgrade: boolean;
  disabled?: boolean;
}

const PLANS = [
  {
    tier: "basic" as SubscriptionTier,
    name: "Basic",
    price: 19,
    description: "1 dormant company",
    features: [
      "Both filings — accounts and CT600",
      "Automatic gap detection from incorporation",
      "Deadline reminders with penalty warnings",
      "Filing confirmation receipt",
    ],
  },
  {
    tier: "multi" as SubscriptionTier,
    name: "Multiple",
    price: 39,
    description: "Up to 10 companies",
    popular: true,
    features: [
      "Everything in Basic",
      "File for up to 10 dormant companies",
      "Portfolio dashboard with filtering and search",
      "All companies synced daily with Companies House",
    ],
  },
  {
    tier: "agent" as SubscriptionTier,
    name: "Agent",
    price: 49,
    description: "Up to 100 companies",
    features: [
      "Everything in Multiple",
      "File for up to 100 dormant companies",
      "File as agent on behalf of your clients",
      "Automatic gap detection per company",
    ],
  },
];

export default function PlanPicker({ currentTier, isUpgrade, disabled }: PlanPickerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<SubscriptionTier | null>(null);
  const [error, setError] = useState("");
  const [downgradeSuccess, setDowngradeSuccess] = useState("");

  async function handleSelect(tier: SubscriptionTier) {
    setLoading(tier);
    setError("");

    try {
      if (isUpgrade) {
        // Existing subscriber: update the subscription in place
        const res = await fetch("/api/stripe/upgrade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to change plan. Please try again.");
          setLoading(null);
          return;
        }

        const data = await res.json();
        if (data.effective === "next_period") {
          setDowngradeSuccess(
            `Your plan will change to ${PLANS.find((p) => p.tier === tier)?.name} at the end of your billing period.`,
          );
          setLoading(null);
          return;
        }

        router.push(tier === "agent" ? "/agent-setup" : "/dashboard");
      } else {
        // New subscriber: go through Stripe checkout
        const res = await fetch("/api/stripe/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        });

        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to start checkout. Please try again.");
          setLoading(null);
          return;
        }

        const { url } = await res.json();
        if (url) {
          location.assign(url);
        } else {
          setError("No checkout URL returned. Please try again.");
          setLoading(null);
        }
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(null);
    }
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="py-3 px-4 bg-danger-bg border border-danger-border rounded-lg text-sm text-danger text-center mb-6"
        >
          {error}
        </div>
      )}

      {downgradeSuccess && (
        <div
          role="status"
          className="py-3 px-4 bg-success-bg border border-success-border rounded-lg text-sm text-success-text text-center mb-6"
        >
          {downgradeSuccess}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isDowngrade =
            isUpgrade &&
            ((currentTier === "agent" && plan.tier !== "agent") ||
              (currentTier === "multi" && plan.tier === "basic"));
          const isDisabled = loading !== null || isCurrent || !!disabled;

          return (
            <div
              key={plan.tier}
              className={cn(
                "p-5 sm:p-7 bg-card rounded-xl flex flex-col relative",
                plan.popular
                  ? "border-2 border-primary"
                  : "border border-border",
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-card px-3.5 py-[3px] rounded-full text-xs font-semibold whitespace-nowrap">
                  Most popular
                </span>
              )}

              <p className="text-sm font-semibold text-primary m-0 mb-1">
                {plan.name}
              </p>
              <div className="mb-1">
                <span className="text-4xl font-bold text-foreground">
                  £{plan.price}
                </span>
                <span className="text-sm text-body ml-1">
                  /year
                </span>
              </div>
              <p className="text-sm text-body m-0 mb-6">
                {plan.description}
              </p>

              <ul className="list-none p-0 m-0 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 mb-2.5 text-sm text-body"
                  >
                    <span className="text-primary shrink-0 mt-0.5">
                      <CheckCircle size={16} color="currentColor" strokeWidth={2} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="py-2.5 px-5 rounded-lg font-semibold text-sm text-center bg-neutral-bg text-secondary">
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => handleSelect(plan.tier)}
                  disabled={isDisabled}
                  className={cn(
                    "focus-ring py-2.5 px-5 rounded-lg font-semibold text-sm border-0 transition-all duration-200 text-card flex items-center justify-center gap-2 hover:opacity-90 hover:-translate-y-px",
                    isDisabled ? "cursor-not-allowed" : "cursor-pointer",
                    isDowngrade
                      ? "bg-secondary"
                      : plan.popular
                        ? "bg-cta"
                        : "bg-primary",
                  )}
                >
                  {loading === plan.tier && (
                    <Loader2
                      size={16}
                      strokeWidth={2}
                      className="animate-spin"
                    />
                  )}
                  {isDowngrade ? "Downgrade" : isUpgrade ? "Upgrade" : "Select"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {disabled && (
        <p className="text-sm text-secondary text-center mt-5 font-medium">
          Plans will be available when filing goes live.
        </p>
      )}

      {isUpgrade && (
        <p className="text-[13px] text-muted text-center mt-5">
          Upgrades take effect immediately. Downgrades take effect at the end of your billing
          period.
        </p>
      )}
    </>
  );
}
