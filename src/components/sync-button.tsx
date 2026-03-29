"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

interface SyncButtonProps {
  companyId: string;
}

type ToastState =
  | { type: "success"; title: string; subtitle: string }
  | { type: "info"; title: string; subtitle: string }
  | { type: "error"; title: string; subtitle: string }
  | null;

const toastStyles: Record<string, { bg: string; border: string; title: string; subtitle: string }> =
  {
    success: {
      bg: "var(--color-success-bg)",
      border: "var(--color-success-border)",
      title: "var(--color-success-deep, #166534)",
      subtitle: "var(--color-success, #16a34a)",
    },
    info: {
      bg: "var(--color-bg-secondary)",
      border: "var(--color-border)",
      title: "var(--color-text-primary)",
      subtitle: "var(--color-text-secondary)",
    },
    error: {
      bg: "var(--color-danger-bg)",
      border: "var(--color-danger-border)",
      title: "var(--color-danger-deep)",
      subtitle: "var(--color-danger)",
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

  const style = toast ? toastStyles[toast.type] : null;

  return (
    <>
      <button
        onClick={handleSync}
        disabled={loading}
        className="focus-ring"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          fontSize: "13px",
          fontWeight: 500,
          color: loading ? "var(--color-text-disabled)" : "var(--color-text-secondary)",
          backgroundColor: loading ? "var(--color-bg-disabled)" : "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "opacity 200ms, background-color 200ms",
        }}
        onMouseEnter={(e) => {
          if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        {loading ? (
          <Loader2 size={15} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <RefreshCw size={15} strokeWidth={2} />
        )}
        {loading ? "Syncing\u2026" : "Sync with CH"}
      </button>

      {toast && style && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "14px 18px",
            backgroundColor: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: "10px",
            zIndex: 1000,
            maxWidth: "360px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, color: style.title }}>{toast.title}</div>
          <div style={{ fontSize: "12px", color: style.subtitle, marginTop: "2px" }}>
            {toast.subtitle}
          </div>
        </div>
      )}
    </>
  );
}
