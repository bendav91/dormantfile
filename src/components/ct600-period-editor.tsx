"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { validateCtapChain } from "@/lib/ctap";
import { cn } from "@/lib/cn";
import { X, Plus, Scissors, AlertTriangle } from "lucide-react";

interface Row {
  startISO: string;
  endISO: string;
}

interface Ct600PeriodEditorProps {
  companyId: string;
  accountsPeriodStartISO: string;
  accountsPeriodEndISO: string;
  suggested: { startISO: string; endISO: string }[];
  immutable: { startISO: string; endISO: string; status: string }[];
  onClose: () => void;
}

function formatISO(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

/** mid = start + 12 months - 1 day if the row exceeds 12 months, else the row's midpoint. */
function splitMidISO(startISO: string, endISO: string): string {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const twelveMonths = new Date(start);
  twelveMonths.setUTCFullYear(twelveMonths.getUTCFullYear() + 1);
  twelveMonths.setUTCDate(twelveMonths.getUTCDate() - 1);
  if (end.getTime() > twelveMonths.getTime()) {
    return twelveMonths.toISOString().split("T")[0];
  }
  const mid = new Date(
    start.getTime() + Math.floor((end.getTime() - start.getTime()) / 2),
  );
  return mid.toISOString().split("T")[0];
}

export default function Ct600PeriodEditor({
  companyId,
  accountsPeriodStartISO,
  accountsPeriodEndISO,
  suggested,
  immutable,
  onClose,
}: Ct600PeriodEditorProps) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(
    suggested.map((s) => ({ startISO: s.startISO, endISO: s.endISO })),
  );
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const errors = useMemo(
    () =>
      validateCtapChain({
        accountsPeriodStart: new Date(accountsPeriodStartISO),
        accountsPeriodEnd: new Date(accountsPeriodEndISO),
        periods: rows.map((r) => ({
          start: new Date(r.startISO),
          end: new Date(r.endISO),
        })),
      }),
    [rows, accountsPeriodStartISO, accountsPeriodEndISO],
  );

  const isValid = errors.length === 0;

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  }

  function deleteRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function splitRow(index: number) {
    setRows((prev) => {
      const r = prev[index];
      const mid = splitMidISO(r.startISO, r.endISO);
      const first: Row = { startISO: r.startISO, endISO: mid };
      const second: Row = { startISO: addDaysISO(mid, 1), endISO: r.endISO };
      return [...prev.slice(0, index), first, second, ...prev.slice(index + 1)];
    });
  }

  function addRow() {
    setRows((prev) => {
      if (prev.length === 0) {
        return [
          { startISO: accountsPeriodStartISO, endISO: accountsPeriodEndISO },
        ];
      }
      const last = prev[prev.length - 1];
      const nextStart = addDaysISO(last.endISO, 1);
      return [...prev, { startISO: nextStart, endISO: accountsPeriodEndISO }];
    });
  }

  function reset() {
    setServerError(null);
    setRows(suggested.map((s) => ({ startISO: s.startISO, endISO: s.endISO })));
  }

  async function handleSave() {
    if (!isValid || saving) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await fetch("/api/company/ct600-periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          accountsPeriodStartISO,
          accountsPeriodEndISO,
          periods: rows.map((r) => ({
            startISO: r.startISO,
            endISO: r.endISO,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.refresh();
        onClose();
        return;
      }
      setServerError(data.error || "Could not save periods. Please try again.");
    } catch {
      setServerError("Could not save periods. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Manage CT600 accounting periods"
        className="bg-card rounded-xl shadow-card border border-border w-full max-w-2xl my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground m-0">
              Manage CT600 periods
            </h2>
            <p
              className="text-xs text-secondary mt-1 m-0"
              data-testid="accounts-period-header"
            >
              Period of accounts: {formatISO(accountsPeriodStartISO)} &ndash;{" "}
              {formatISO(accountsPeriodEndISO)}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border text-secondary transition-colors duration-200"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <p className="text-xs text-secondary m-0 bg-inset rounded-lg px-3 py-2.5">
            A Corporation Tax accounting period cannot exceed 12 months. When a
            period of accounts is longer than 12 months it must be split into
            two or more CT600 periods that join end-to-end with no gaps or
            overlaps.
          </p>

          {/* Immutable (already filed) rows */}
          {immutable.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-[13px] font-semibold text-foreground m-0">
                Already filed (locked)
              </p>
              {immutable.map((r, i) => (
                <div
                  key={`imm-${i}`}
                  data-testid="ctap-immutable-row"
                  className="flex items-center justify-between gap-3 px-3 py-2.5 bg-inset rounded-lg border border-border"
                >
                  <span className="text-[13px] text-foreground">
                    {formatISO(r.startISO)} &ndash; {formatISO(r.endISO)}
                  </span>
                  <span className="text-xs font-semibold text-secondary capitalize">
                    {r.status.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Editable rows */}
          <div className="flex flex-col gap-2">
            <p className="text-[13px] font-semibold text-foreground m-0">
              CT600 periods
            </p>
            {rows.length === 0 && (
              <p className="text-xs text-secondary m-0">
                No periods. Add at least one.
              </p>
            )}
            {rows.map((row, i) => (
              <div
                key={i}
                data-testid="ctap-row"
                className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-inset rounded-lg border border-border"
              >
                <span className="text-xs font-semibold text-secondary w-5 shrink-0">
                  {i + 1}
                </span>
                <input
                  type="date"
                  aria-label={`Period ${i + 1} start`}
                  value={row.startISO}
                  onChange={(e) =>
                    updateRow(i, { startISO: e.target.value })
                  }
                  className="bg-card text-foreground text-[13px] border border-border rounded-md px-2 py-1"
                />
                <span className="text-secondary text-xs">&ndash;</span>
                <input
                  type="date"
                  aria-label={`Period ${i + 1} end`}
                  value={row.endISO}
                  onChange={(e) => updateRow(i, { endISO: e.target.value })}
                  className="bg-card text-foreground text-[13px] border border-border rounded-md px-2 py-1"
                />
                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => splitRow(i)}
                    className="inline-flex items-center gap-1 text-secondary border border-border px-2 py-1 rounded-md text-xs font-semibold transition-colors duration-200"
                  >
                    <Scissors size={12} strokeWidth={2} />
                    Split
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete period ${i + 1}`}
                    onClick={() => deleteRow(i)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border text-secondary transition-colors duration-200"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addRow}
              className="inline-flex items-center gap-1.5 self-start text-primary border border-primary-border px-3 py-1.5 rounded-md font-semibold text-[13px] transition-colors duration-200"
            >
              <Plus size={14} strokeWidth={2} />
              Add period
            </button>
          </div>

          {/* Live validation summary */}
          {errors.length > 0 && (
            <div className="flex flex-col gap-1 bg-inset rounded-lg px-3 py-2.5 border border-border">
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-danger">
                <AlertTriangle size={14} strokeWidth={2} />
                Fix before saving
              </span>
              <ul className="m-0 pl-5 list-disc">
                {errors.map((e, i) => (
                  <li key={i} className="text-xs text-danger">
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {serverError && (
            <p className="text-[13px] font-semibold text-danger m-0 bg-inset rounded-lg px-3 py-2.5 border border-border">
              {serverError}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          <button
            type="button"
            onClick={reset}
            className="text-secondary text-[13px] font-semibold transition-colors duration-200"
          >
            Reset to suggested
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-secondary border border-border px-3.5 py-1.5 rounded-md font-semibold text-[13px] transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid || saving}
              className={cn(
                "inline-flex items-center gap-1.5 bg-primary text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] transition-opacity duration-200",
                (!isValid || saving) && "opacity-50 cursor-not-allowed",
              )}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
