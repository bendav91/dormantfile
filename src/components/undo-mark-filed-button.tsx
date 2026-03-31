"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";

interface UndoMarkFiledButtonProps {
  filingId: string;
}

export default function UndoMarkFiledButton({ filingId }: UndoMarkFiledButtonProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch("/api/file/undo-mark-filed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filingId }),
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
      <span className="inline-flex items-center gap-1.5">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={cn(
            "py-1 px-2.5 rounded-md text-xs font-semibold text-card bg-danger border-0",
            loading ? "cursor-wait opacity-60" : "cursor-pointer opacity-100"
          )}
        >
          {loading ? "Undoing\u2026" : "Yes, undo"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={loading}
          className="py-1 px-2.5 rounded-md text-xs font-medium text-secondary bg-transparent border border-border cursor-pointer"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="py-1 px-2.5 rounded-md text-xs font-medium text-secondary bg-transparent border border-border cursor-pointer transition-opacity duration-200"
    >
      Undo
    </button>
  );
}
