"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

interface ArdMismatchBannerProps {
  companyId: string;
  currentArdMonth: number;
  currentArdDay: number;
  newArdMonth: number;
  newArdDay: number;
}

function formatArdDate(month: number, day: number): string {
  return new Date(2000, month - 1, day).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
  });
}

export default function ArdMismatchBanner({
  companyId,
  currentArdMonth,
  currentArdDay,
  newArdMonth,
  newArdDay,
}: ArdMismatchBannerProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function handleConfirm(confirmed: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/company/confirm-ard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, confirmed }),
      });
      if (res.ok) {
        setDismissed(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 bg-warning-bg border border-warning-border rounded-xl mb-6">
      <div className="flex items-center gap-2.5">
        <span className="text-warning shrink-0">
          <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
        </span>
        <p className="text-sm text-warning-text m-0 font-medium">
          Your accounting reference date appears to have changed at Companies House.
          Your current year end is {formatArdDate(currentArdMonth, currentArdDay)} but
          Companies House shows {formatArdDate(newArdMonth, newArdDay)}.
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => handleConfirm(true)}
          disabled={saving}
          className="focus-ring bg-warning text-card py-2 px-[18px] rounded-lg font-semibold text-sm border-0 cursor-pointer transition-all duration-200 whitespace-nowrap hover:opacity-90"
        >
          {saving ? "Updating\u2026" : "Update periods"}
        </button>
        <button
          onClick={() => handleConfirm(false)}
          disabled={saving}
          className="bg-transparent border border-warning-border py-2 px-[18px] rounded-lg font-semibold text-sm cursor-pointer transition-all duration-200 whitespace-nowrap text-warning-text hover:opacity-90"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
