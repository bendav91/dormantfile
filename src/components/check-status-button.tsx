"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

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
        setResult({ type: "accepted", message: "Filing accepted." });
        setTimeout(() => router.refresh(), 1500);
      } else if (status === "rejected") {
        setResult({
          type: "rejected",
          message: data.message || "Filing rejected. Please retry or contact support.",
        });
        setTimeout(() => router.refresh(), 1500);
      } else {
        setResult({
          type: "processing",
          message: "Still being processed. Please check again later.",
        });
      }
    } catch {
      setResult({ type: "processing", message: "An unexpected error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {result && (
        <span
          aria-live="polite"
          className={cn(
            "text-xs font-medium",
            result.type === "accepted" && "text-success",
            result.type === "rejected" && "text-danger-deep",
            result.type === "processing" && "text-warning-deep"
          )}
        >
          {result.message}
        </span>
      )}

      <button
        onClick={handleCheckStatus}
        disabled={loading}
        className={cn(
          "focus-ring inline-flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold text-xs border transition-all duration-200",
          loading
            ? "bg-inset text-secondary border-border cursor-not-allowed"
            : "bg-card text-foreground border-border cursor-pointer hover:bg-inset"
        )}
      >
        {loading ? (
          <Loader2 size={13} strokeWidth={2} className="animate-spin" />
        ) : (
          <RefreshCw size={13} strokeWidth={2} />
        )}
        {loading ? "Checking\u2026" : "Check status"}
      </button>
    </>
  );
}
