"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

interface SyncButtonProps {
  companyId: string;
}

type ToastState =
  | { type: "success"; title: string; subtitle: string }
  | { type: "info"; title: string; subtitle: string }
  | { type: "error"; title: string; subtitle: string }
  | null;

const toastClassNames: Record<string, { container: string; title: string; subtitle: string }> = {
  success: {
    container: "bg-success-bg border-success-border",
    title: "text-[var(--color-success-deep,#166534)]",
    subtitle: "text-success",
  },
  info: {
    container: "bg-[var(--color-bg-secondary)] border-border",
    title: "text-foreground",
    subtitle: "text-secondary",
  },
  error: {
    container: "bg-danger-bg border-danger-border",
    title: "text-danger-deep",
    subtitle: "text-danger",
  },
};

export default function SyncButton({ companyId }: SyncButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(t: ToastState) {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSync() {
    setLoading(true);
    setToast(null);

    try {
      const res = await fetch("/api/company/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      if (!res.ok) {
        showToast({
          type: "error",
          title: res.status === 429 ? "Too many requests" : "Couldn\u2019t reach Companies House",
          subtitle: res.status === 429 ? "Try again in a few minutes" : "Try again later",
        });
        return;
      }

      const data = await res.json();

      if (data.newFilingsCount > 0) {
        showToast({
          type: "success",
          title: "Synced with Companies House",
          subtitle: `${data.newFilingsCount} new filing${data.newFilingsCount === 1 ? "" : "s"} detected`,
        });
      } else {
        showToast({
          type: "info",
          title: "Already up to date",
          subtitle: "No new filings found on Companies House",
        });
      }

      router.refresh();
    } catch {
      showToast({
        type: "error",
        title: "Couldn\u2019t reach Companies House",
        subtitle: "Try again later",
      });
    } finally {
      setLoading(false);
    }
  }

  const style = toast ? toastClassNames[toast.type] : null;

  return (
    <>
      <button
        onClick={handleSync}
        disabled={loading}
        className={cn(
          "focus-ring inline-flex items-center gap-1.5 py-2 px-3.5 text-[13px] font-medium border border-border rounded-lg transition-all duration-200 hover:opacity-80",
          loading
            ? "text-[var(--color-text-disabled)] bg-disabled cursor-not-allowed"
            : "text-secondary bg-card cursor-pointer"
        )}
      >
        {loading ? (
          <Loader2 size={15} strokeWidth={2} className="animate-spin" />
        ) : (
          <RefreshCw size={15} strokeWidth={2} />
        )}
        {loading ? "Syncing\u2026" : "Sync with CH"}
      </button>

      {toast && style && (
        <div
          aria-live="polite"
          className={cn(
            "fixed bottom-6 right-6 py-3.5 px-[18px] border rounded-[10px] z-[1000] max-w-[360px] shadow-[0_4px_12px_rgba(0,0,0,0.1)]",
            style.container
          )}
        >
          <div className={cn("text-[13px] font-semibold", style.title)}>{toast.title}</div>
          <div className={cn("text-xs mt-0.5", style.subtitle)}>
            {toast.subtitle}
          </div>
        </div>
      )}
    </>
  );
}
