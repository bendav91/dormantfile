"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/cn";

interface Filing {
  id: string;
  filingType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  accountsDeadline: string | null;
  ct600Deadline: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  correlationId: string | null;
  companyName: string;
  crn: string;
  userId: string;
  userEmail: string;
}

export function AdminFilingsTable({ filings }: { filings: Filing[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const submittedFilings = filings.filter((f) => f.status === "submitted");
  const hasSelectable = submittedFilings.length > 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === submittedFilings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(submittedFilings.map((f) => f.id)));
    }
  }

  async function handleAction(id: string, action: "retry" | "reset") {
    setLoading(id);
    try {
      const res = await fetch("/api/admin/filings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleBulkRetry() {
    if (selected.size === 0) return;
    setLoading("bulk");
    try {
      const res = await fetch("/api/admin/filings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (filings.length === 0) {
    return (
      <p className="text-sm text-muted">
        No filings match the current filters.
      </p>
    );
  }

  return (
    <div>
      {hasSelectable && selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-muted">
            {selected.size} selected
          </span>
          <button
            onClick={handleBulkRetry}
            disabled={loading === "bulk"}
            className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 text-primary border border-primary-border bg-primary-bg"
          >
            Retry selected
          </button>
        </div>
      )}

      <div className="rounded-xl overflow-hidden bg-card border border-border">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2 text-xs font-medium text-muted border-b border-border">
          {hasSelectable && (
            <input
              type="checkbox"
              checked={selected.size === submittedFilings.length && submittedFilings.length > 0}
              onChange={toggleAll}
              className="cursor-pointer"
            />
          )}
          <span className="flex-1">Company</span>
          <span className="w-[80px]">Type</span>
          <span className="w-[180px]">Period</span>
          <span className="w-[90px]">Status</span>
          <span className="w-[90px]">Deadline</span>
          <span className="w-[90px]">Submitted</span>
          <span className="w-[100px]"></span>
        </div>

        {filings.map((filing, i) => {
          const deadline = filing.filingType === "accounts" ? filing.accountsDeadline : filing.ct600Deadline;
          const isOverdue = deadline && new Date(deadline) < new Date() && filing.status === "outstanding";
          const canRetry = filing.status === "submitted" || (filing.status === "failed" && filing.correlationId);
          const canReset = filing.status === "rejected" || filing.status === "failed";
          const isSelectable = filing.status === "submitted";

          return (
            <div
              key={filing.id}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-xs",
                i < filings.length - 1 && "border-b border-border"
              )}
            >
              {hasSelectable && (
                <input
                  type="checkbox"
                  checked={selected.has(filing.id)}
                  onChange={() => toggleSelect(filing.id)}
                  disabled={!isSelectable}
                  className="cursor-pointer disabled:opacity-30"
                />
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/customers/${filing.userId}`}
                  className="font-medium truncate block text-primary no-underline"
                >
                  {filing.companyName}
                </Link>
                <span className="text-muted">{filing.crn} · {filing.userEmail}</span>
              </div>
              <span className="w-[80px]">
                <StatusBadge status={filing.filingType} label={filing.filingType === "ct600" ? "CT600" : "Accounts"} />
              </span>
              <span className="w-[180px] text-body">
                {fmt(filing.periodStart)} — {fmt(filing.periodEnd)}
              </span>
              <span className="w-[90px]">
                <StatusBadge status={filing.status} />
              </span>
              <span className={cn("w-[90px]", isOverdue ? "text-danger" : "text-muted")}>
                {deadline ? fmt(deadline) : "—"}
              </span>
              <span className="w-[90px] text-muted">
                {filing.submittedAt ? fmt(filing.submittedAt) : "—"}
              </span>
              <div className="flex gap-1 w-[100px]">
                {canRetry && (
                  <button
                    onClick={() => handleAction(filing.id, "retry")}
                    disabled={loading === filing.id}
                    className="text-xs font-medium px-2 py-1 rounded cursor-pointer disabled:opacity-50 text-primary border border-primary-border bg-primary-bg"
                  >
                    Retry
                  </button>
                )}
                {canReset && (
                  <button
                    onClick={() => handleAction(filing.id, "reset")}
                    disabled={loading === filing.id}
                    className="text-xs font-medium px-2 py-1 rounded cursor-pointer disabled:opacity-50 text-secondary border border-border bg-transparent"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
