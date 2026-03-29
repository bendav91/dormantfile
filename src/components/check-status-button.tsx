"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

interface CheckStatusButtonProps {
  filingId: string;
}

type ResultState =
  | { type: "accepted"; message: string }
  | { type: "rejected"; message: string }
  | { type: "processing"; message: string }
  | null;

export default function CheckStatusButton({ filingId }: CheckStatusButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultState>(null);

  async function handleCheckStatus() {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/file/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResult({
          type: "processing",
          message: data.error || "Unable to check status. Please try again.",
        });
        setLoading(false);
        return;
      }

      const status: string = data.status;

      if (status === "accepted") {
        setResult({ type: "accepted", message: "Filing accepted by HMRC." });
        setTimeout(() => router.refresh(), 1500);
      } else if (status === "rejected") {
        setResult({
          type: "rejected",
          message: "Filing rejected by HMRC. Please contact support.",
        });
        setTimeout(() => router.refresh(), 1500);
      } else {
        setResult({
          type: "processing",
          message: "Your filing is still being processed by HMRC. Please check again later.",
        });
      }
    } catch {
      setResult({ type: "processing", message: "An unexpected error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const resultColors: Record<string, { bg: string; text: string; border: string }> = {
    accepted: {
      bg: "var(--color-success-bg)",
      text: "var(--color-success)",
      border: "var(--color-success-border)",
    },
    rejected: {
      bg: "var(--color-danger-bg)",
      text: "var(--color-danger-deep)",
      border: "var(--color-danger-border)",
    },
    processing: {
      bg: "var(--color-warning-bg)",
      text: "var(--color-warning-deep)",
      border: "var(--color-warning-border)",
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <button
        onClick={handleCheckStatus}
        disabled={loading}
        className="focus-ring"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          backgroundColor: loading ? "var(--color-bg-disabled)" : "var(--color-primary)",
          color: "var(--color-bg-card)",
          padding: "10px 20px",
          borderRadius: "8px",
          fontWeight: 600,
          fontSize: "14px",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "opacity 200ms, background-color 200ms",
          alignSelf: "flex-start",
        }}
        onMouseEnter={(e) => {
          if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        {loading ? (
          <Loader2 size={16} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <RefreshCw size={16} strokeWidth={2} />
        )}
        {loading ? "Checking\u2026" : "Check status with HMRC"}
      </button>

      {result && (
        <div
          aria-live="polite"
          style={{
            padding: "10px 14px",
            backgroundColor: resultColors[result.type].bg,
            border: `1px solid ${resultColors[result.type].border}`,
            borderRadius: "8px",
            fontSize: "14px",
            color: resultColors[result.type].text,
            fontWeight: 500,
          }}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
