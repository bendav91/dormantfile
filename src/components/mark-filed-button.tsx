"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MarkFiledButtonProps {
  companyId: string;
  periodEnd: string;
}

export default function MarkFiledButton({ companyId, periodEnd }: MarkFiledButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/file/mark-filed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, periodEnd, filingType: "ct600" }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <button
          onClick={handleConfirm}
          disabled={loading}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--color-bg-card)",
            backgroundColor: "var(--color-text-secondary)",
            border: "none",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Saving…" : "Yes, mark as filed"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          style={{
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 500,
            color: "var(--color-text-secondary)",
            backgroundColor: "transparent",
            border: "1px solid var(--color-border)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        padding: "6px 12px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: 500,
        color: "var(--color-text-secondary)",
        backgroundColor: "transparent",
        border: "1px solid var(--color-border)",
        cursor: "pointer",
        transition: "opacity 200ms",
      }}
    >
      Filed elsewhere?
    </button>
  );
}
