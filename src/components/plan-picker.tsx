"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import { SubscriptionTier } from "@prisma/client";

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
      "File any outstanding period",
      "Email deadline reminders",
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
      "Manage all from one dashboard",
      "Catch up on missed periods",
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
      "File as agent on behalf of clients",
      "Ideal for accountants",
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
          style={{
            padding: "12px 16px",
            backgroundColor: "var(--color-danger-bg)",
            border: "1px solid var(--color-danger-border)",
            borderRadius: "8px",
            fontSize: "14px",
            color: "var(--color-danger)",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {downgradeSuccess && (
        <div
          role="status"
          style={{
            padding: "12px 16px",
            backgroundColor: "var(--color-success-bg)",
            border: "1px solid var(--color-success-border)",
            borderRadius: "8px",
            fontSize: "14px",
            color: "var(--color-success-text)",
            marginBottom: "24px",
            textAlign: "center",
          }}
        >
          {downgradeSuccess}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
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
              style={{
                backgroundColor: "var(--color-bg-card)",
                borderRadius: "12px",
                padding: "28px",
                border: plan.popular
                  ? "2px solid var(--color-primary)"
                  : "1px solid var(--color-border)",
                display: "flex",
                flexDirection: "column",
                position: "relative",
              }}
            >
              {plan.popular && (
                <span
                  style={{
                    position: "absolute",
                    top: "-12px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    backgroundColor: "var(--color-primary)",
                    color: "var(--color-bg-card)",
                    padding: "3px 14px",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  Most popular
                </span>
              )}

              <p
                style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--color-primary)",
                  margin: "0 0 4px 0",
                }}
              >
                {plan.name}
              </p>
              <div style={{ marginBottom: "4px" }}>
                <span
                  style={{ fontSize: "36px", fontWeight: 700, color: "var(--color-text-primary)" }}
                >
                  £{plan.price}
                </span>
                <span
                  style={{ fontSize: "14px", color: "var(--color-text-body)", marginLeft: "4px" }}
                >
                  /year
                </span>
              </div>
              <p
                style={{ fontSize: "14px", color: "var(--color-text-body)", margin: "0 0 24px 0" }}
              >
                {plan.description}
              </p>

              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0", flex: 1 }}>
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "8px",
                      marginBottom: "10px",
                      fontSize: "14px",
                      color: "var(--color-text-body)",
                    }}
                  >
                    <span style={{ color: "var(--color-primary)", flexShrink: 0, marginTop: 2 }}>
                      <CheckCircle size={16} color="currentColor" strokeWidth={2} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "14px",
                    textAlign: "center",
                    backgroundColor: "var(--color-neutral-bg)",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => handleSelect(plan.tier)}
                  disabled={isDisabled}
                  className="focus-ring"
                  style={{
                    padding: "10px 20px",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "14px",
                    border: "none",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    transition: "opacity 200ms, transform 200ms",
                    backgroundColor: isDowngrade
                      ? "var(--color-text-secondary)"
                      : plan.popular
                        ? "var(--color-cta)"
                        : "var(--color-primary)",
                    color: "var(--color-bg-card)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                  onMouseEnter={(e) => {
                    if (!isDisabled) {
                      (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                    (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                  }}
                >
                  {loading === plan.tier && (
                    <Loader2
                      size={16}
                      strokeWidth={2}
                      style={{ animation: "spin 1s linear infinite" }}
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
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            textAlign: "center",
            marginTop: "20px",
            fontWeight: 500,
          }}
        >
          Plans will be available when filing goes live.
        </p>
      )}

      {isUpgrade && (
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-text-muted)",
            textAlign: "center",
            marginTop: "20px",
          }}
        >
          Upgrades take effect immediately. Downgrades take effect at the end of your billing
          period.
        </p>
      )}

      <style>{`
        @media (max-width: 640px) {
          div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
