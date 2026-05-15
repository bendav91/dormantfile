"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { UserCog } from "lucide-react";

export function ImpersonateButton({
  userId,
  name,
}: {
  userId: string;
  name: string | null;
}) {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = name ?? "this customer";

  async function handleImpersonate() {
    const ok = window.confirm(
      `Impersonate ${label}? You will act as this customer with full access, ` +
        `including real HMRC and Companies House submissions.`,
    );
    if (!ok) return;

    setLoading(true);
    setError(null);
    try {
      const next = await update({ impersonate: userId });
      if (next?.impersonating) {
        window.location.href = "/dashboard";
        return;
      }
      setError("Could not start impersonation.");
    } catch {
      setError("Could not start impersonation.");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleImpersonate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 text-primary border border-primary-border bg-primary-bg"
      >
        <UserCog size={12} />
        {loading ? "Starting…" : "Impersonate"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
