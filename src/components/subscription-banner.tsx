"use client";

import { AlertTriangle } from "lucide-react";
import { SubscriptionStatus } from "@prisma/client";

interface SubscriptionBannerProps {
  status: SubscriptionStatus;
}

export default function SubscriptionBanner({ status }: SubscriptionBannerProps) {
  if (status === "active") {
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
          backgroundColor: "#FEFCE8",
          border: "1px solid #FDE047",
          borderRadius: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle size={18} color="#CA8A04" strokeWidth={2} style={{ flexShrink: 0 }} />
          <p style={{ fontSize: "14px", color: "#713F12", margin: 0, fontWeight: 500 }}>
            You haven&apos;t completed your subscription yet. Choose a plan to start filing.
          </p>
        </div>
        <button
          onClick={handleCheckout}
          style={{
            backgroundColor: "#F97316",
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            transition: "all 200ms",
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
          backgroundColor: "#FEF2F2",
          border: "1px solid #FECACA",
          borderRadius: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle size={18} color="#DC2626" strokeWidth={2} style={{ flexShrink: 0 }} />
          <p style={{ fontSize: "14px", color: "#7F1D1D", margin: 0, fontWeight: 500 }}>
            Your payment is past due. Please update your billing details to keep your subscription active.
          </p>
        </div>
        <button
          onClick={handlePortal}
          style={{
            backgroundColor: "#DC2626",
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            transition: "all 200ms",
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
          backgroundColor: "#F8FAFC",
          border: "1px solid #CBD5E1",
          borderRadius: "12px",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <AlertTriangle size={18} color="#64748B" strokeWidth={2} style={{ flexShrink: 0 }} />
          <p style={{ fontSize: "14px", color: "#475569", margin: 0, fontWeight: 500 }}>
            Your subscription has been cancelled. Resubscribe to continue filing with HMRC.
          </p>
        </div>
        <button
          onClick={handleCheckout}
          style={{
            backgroundColor: "#475569",
            color: "#ffffff",
            padding: "8px 18px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "14px",
            border: "none",
            cursor: "pointer",
            transition: "all 200ms",
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
