"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye } from "lucide-react";
import { cn } from "@/lib/cn";

interface SuppressButtonProps {
  companyId: string;
  periodEnd: string;
  isSuppressed: boolean;
  onRestore?: () => void;
}

export default function SuppressButton({
  companyId,
  periodEnd,
  isSuppressed,
  onRestore,
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
      if (isSuppressed && onRestore) onRestore();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title={isSuppressed ? "Restore this period" : "Suppress this period"}
      className={cn(
        "inline-flex items-center gap-[5px] py-[5px] px-2.5 rounded-md text-xs font-medium border border-border bg-inset text-secondary transition-opacity duration-200",
        loading ? "cursor-wait opacity-60" : "cursor-pointer opacity-100"
      )}
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
