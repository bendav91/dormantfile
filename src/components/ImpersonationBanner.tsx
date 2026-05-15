"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);

  if (!session?.impersonating) return null;

  async function handleStop() {
    setLoading(true);
    try {
      await update({ stopImpersonating: true });
      window.location.href = "/admin";
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium bg-danger-bg text-danger border-b border-danger-border">
      <span>Impersonating {session.impersonatedName ?? "customer"}</span>
      <button
        type="button"
        onClick={handleStop}
        disabled={loading}
        className="text-xs font-semibold px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-50 text-danger border border-danger-border bg-card"
      >
        {loading ? "Stopping…" : "Stop"}
      </button>
    </div>
  );
}
