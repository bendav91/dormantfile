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

const resultClassNames: Record<string, { container: string }> = {
  accepted: {
    container: "bg-success-bg border-success-border text-success",
  },
  rejected: {
    container: "bg-danger-bg border-danger-border text-danger-deep",
  },
  processing: {
    container: "bg-warning-bg border-warning-border text-warning-deep",
  },
};

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

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleCheckStatus}
        disabled={loading}
        className={cn(
          "focus-ring inline-flex items-center gap-2 text-card py-2.5 px-5 rounded-lg font-semibold text-sm border-0 transition-all duration-200 self-start hover:opacity-90",
          loading ? "bg-disabled cursor-not-allowed" : "bg-primary cursor-pointer"
        )}
      >
        {loading ? (
          <Loader2 size={16} strokeWidth={2} className="animate-spin" />
        ) : (
          <RefreshCw size={16} strokeWidth={2} />
        )}
        {loading ? "Checking\u2026" : "Check status with HMRC"}
      </button>

      {result && (
        <div
          aria-live="polite"
          className={cn(
            "py-2.5 px-3.5 border rounded-lg text-sm font-medium",
            resultClassNames[result.type].container
          )}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
