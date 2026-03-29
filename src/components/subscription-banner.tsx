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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: "14px 20px",
            backgroundColor: "var(--color-warning-bg)",
            border: "1px solid var(--color-warning-border)",
            borderRadius: "12px",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "var(--color-warning)", flexShrink: 0 }}>
              <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
            </span>
            <p
              style={{
                fontSize: "14px",
                color: "var(--color-warning-text)",
                margin: 0,
                fontWeight: 500,
              }}
            >
              Your subscription is set to cancel at the end of your billing period. You can still
              file until then.
            </p>
          </div>
          <button
            onClick={handlePortal}
            className="focus-ring"
            style={{
              backgroundColor: "var(--color-warning)",
              color: "var(--color-bg-card)",
              padding: "8px 18px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              border: "none",
              cursor: "pointer",
              transition: "opacity 200ms, background-color 200ms",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "14px 20px",
          backgroundColor: "var(--color-warning-bg)",
          border: "1px solid var(--color-warning-border)",
          borderRadius: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "var(--color-warning)", flexShrink: 0 }}>
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-warning-text)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            You haven&apos;t completed your subscription yet. Choose a plan to start filing.
          </p>
        </div>
        <button
          onClick={handleCheckout}
          className="focus-ring"
          style={{
            backgroundColor: "var(--color-cta)",
            color: "var(--color-bg-card)",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            transition: "opacity 200ms, background-color 200ms",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          Choose a plan
        </button>
      </div>
    );
  }

  if (status === "past_due") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "14px 20px",
          backgroundColor: "var(--color-danger-bg)",
          border: "1px solid var(--color-danger-border)",
          borderRadius: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "var(--color-danger)", flexShrink: 0 }}>
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-danger-text)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            Your payment is past due. Please update your billing details to keep your subscription
            active.
          </p>
        </div>
        <button
          onClick={handlePortal}
          className="focus-ring"
          style={{
            backgroundColor: "var(--color-danger)",
            color: "var(--color-bg-card)",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            transition: "opacity 200ms, background-color 200ms",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          Update billing
        </button>
      </div>
    );
  }

  if (status === "cancelled") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          padding: "14px 20px",
          backgroundColor: "var(--color-bg-page)",
          border: "1px solid var(--color-bg-disabled)",
          borderRadius: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "var(--color-text-secondary)", flexShrink: 0 }}>
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-body)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            Your subscription has been cancelled. Resubscribe to continue filing with HMRC.
          </p>
        </div>
        <button
          onClick={handleCheckout}
          className="focus-ring"
          style={{
            backgroundColor: "var(--color-text-body)",
            color: "var(--color-bg-card)",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            transition: "opacity 200ms, background-color 200ms",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
        >
          Resubscribe
        </button>
      </div>
    );
  }

  return null;
}
