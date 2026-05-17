"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, Eye } from "lucide-react";
import { quietAction } from "@/components/filing-ledger";

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
      className={quietAction}
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
