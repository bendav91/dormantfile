"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye } from "lucide-react";

interface SuppressButtonProps {
  companyId: string;
  periodEnd: string;
  isSuppressed: boolean;
}

export default function SuppressButton({
  companyId,
  periodEnd,
  isSuppressed,
}: SuppressButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    try {
      if (isSuppressed) {
        await fetch(
          `/api/company/suppress?companyId=${encodeURIComponent(companyId)}&periodEnd=${encodeURIComponent(periodEnd)}`,
          { method: "DELETE" },
        );
      } else {
        await fetch("/api/company/suppress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, periodEnd }),
        });
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={isSuppressed ? "Restore this period" : "Suppress this period"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "5px 10px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: 500,
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-inset)",
        color: "var(--color-text-secondary)",
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.6 : 1,
        transition: "opacity 200ms",
      }}
    >
      {isSuppressed ? (
        <>
          <Eye size={13} strokeWidth={2} />
          Restore
        </>
      ) : (
        <>
          <EyeOff size={13} strokeWidth={2} />
          Suppress
        </>
      )}
    </button>
  );
}
