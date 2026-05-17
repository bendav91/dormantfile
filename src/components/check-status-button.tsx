"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

export type CheckStatusResult = {
  type: "accepted" | "rejected" | "processing" | "needs_attention";
  message: string;
};

interface CheckStatusButtonProps {
  filingId: string;
  // Outcome is lifted to the caller so it can render in the row's state
  // (meta) zone rather than crowding the action cluster.
  onResult?: (result: CheckStatusResult | null) => void;
}

export default function CheckStatusButton({ filingId, onResult }: CheckStatusButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCheckStatus() {
    setLoading(true);
    onResult?.(null);

    try {
      const res = await fetch("/api/file/check-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filingId }),
      });

      const data = await res.json();

      if (!res.ok) {
        onResult?.({
          type: "processing",
          message: data.error || "Unable to check status. Please try again.",
        });
        setLoading(false);
        return;
      }

      const status: string = data.status;

      if (status === "accepted") {
        onResult?.({ type: "accepted", message: "Filing accepted." });
        setTimeout(() => router.refresh(), 1500);
      } else if (status === "rejected") {
        onResult?.({
          type: "rejected",
          message: data.message || "Filing rejected. Please retry or contact support.",
        });
        setTimeout(() => router.refresh(), 1500);
      } else if (status === "needs_attention") {
        onResult?.({
          type: "needs_attention",
          message:
            "Submitted, but no confirmation from Companies House yet. Not a rejection — contact support if it doesn't clear.",
        });
        setTimeout(() => router.refresh(), 1500);
      } else {
        onResult?.({
          type: "processing",
          message: "Still being processed. Please check again later.",
        });
      }
    } catch {
      onResult?.({ type: "processing", message: "An unexpected error occurred. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
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
