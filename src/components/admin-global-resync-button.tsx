"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/cn";

interface ResyncResponse {
  total: number;
  processed: number;
  deletedOutstanding: number;
  recreated: number;
  failures: { companyId: string; crn: string; error: string }[];
}

export default function AdminGlobalResyncButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResyncResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    const ok = window.confirm(
      "Rebuild outstanding filings for ALL active companies?\n\n" +
        "This deletes every 'outstanding' filing row across the database and " +
        "re-creates them from the latest Companies House state. Accepted, " +
        "submitted, and filed-elsewhere rows are preserved.\n\n" +
        "Run only after deploying the latest period-generation logic.",
    );
    if (!ok) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/global-resync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status})`);
      }
      setResult((await res.json()) as ResyncResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 rounded-xl bg-card border border-border">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold text-foreground m-0">Rebuild outstanding filings</p>
          <p className="text-xs text-secondary mt-1 mb-0">
            Wipes every <code>outstanding</code> filing row and regenerates from Companies House.
            Use after deploying period-generation fixes.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-semibold text-[13px] border-0",
            "bg-cta text-card transition-opacity duration-200",
            loading ? "opacity-60 cursor-wait" : "cursor-pointer hover:opacity-90",
          )}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : undefined} />
          {loading ? "Running…" : "Rebuild now"}
        </button>
      </div>

      {error && (
        <p className="text-xs text-danger m-0 mt-2">Failed: {error}</p>
      )}

      {result && (
        <div className="text-xs text-secondary mt-2">
          <p className="m-0">
            <span className="font-semibold text-foreground">{result.processed}</span> /{" "}
            {result.total} companies processed ·{" "}
            <span className="font-semibold text-foreground">{result.deletedOutstanding}</span> rows
            deleted ·{" "}
            <span className="font-semibold text-foreground">{result.recreated}</span> rows recreated
          </p>
          {result.failures.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-danger">
                {result.failures.length} failures
              </summary>
              <ul className="mt-1.5 pl-4 m-0">
                {result.failures.map((f) => (
                  <li key={f.companyId} className="m-0">
                    {f.crn}: {f.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
