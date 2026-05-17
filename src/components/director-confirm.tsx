"use client";

import { cn } from "@/lib/cn";
import { UserCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Director {
  name: string;
  appointedOn: string | null;
}

const MANUAL = "__manual__";

/**
 * Pre-file director confirmation gate.
 *
 * Pulls the company's active directors from Companies House so the person
 * filing ticks the actual director rather than silently filing in the
 * account holder's name (wrong when an agent manages other people's
 * companies). Always offers a manual entry fallback for when CH is
 * unavailable, the director isn't listed yet, or the name needs adjusting.
 *
 * Calls `onChange` with the resolved director name (trimmed) or `null`
 * when nothing valid is selected — the parent gates "Continue" on a
 * non-null value.
 */
export default function DirectorConfirm({
  companyId,
  onChangeAction,
}: {
  companyId: string;
  onChangeAction: (name: string | null) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [directors, setDirectors] = useState<Director[]>([]);
  const [chError, setChError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const onChangeRef = useRef(onChangeAction);
  onChangeRef.current = onChangeAction;

  // Load directors + any previously confirmed name once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/company/directors?companyId=${encodeURIComponent(companyId)}`,
        );
        const data = await res.json();
        if (cancelled) return;

        const list: Director[] = Array.isArray(data.directors) ? data.directors : [];
        const saved: string | null = data.saved ?? null;
        setDirectors(list);
        setChError(!!data.chError);

        const match = saved
          ? list.find((d) => d.name.toLowerCase() === saved.toLowerCase())
          : undefined;

        if (match) {
          setSelected(match.name);
        } else if (saved) {
          // Previously confirmed name that isn't in the CH list — keep it,
          // pre-filled in manual entry so it's confirmed again, not lost.
          setSelected(MANUAL);
          setManualName(saved);
        } else if (list.length === 1) {
          setSelected(list[0].name);
        }
      } catch {
        if (!cancelled) setChError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // Report the resolved name up whenever the selection changes.
  useEffect(() => {
    let resolved: string | null = null;
    if (selected === MANUAL) {
      resolved = manualName.trim() || null;
    } else if (selected) {
      resolved = selected;
    }
    onChangeRef.current(resolved);
  }, [selected, manualName]);

  const labelClass =
    "flex items-start gap-3 px-4 py-3 border rounded-lg cursor-pointer transition-colors duration-150";

  return (
    <div className="mb-7">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-primary">
          <UserCheck size={16} color="currentColor" strokeWidth={2} />
        </span>
        <h3 className="text-sm font-semibold text-foreground m-0">Who is filing as director?</h3>
      </div>
      <p className="text-[13px] text-body m-0 mb-3.5 leading-relaxed">
        This name is used as the director signing the accounts (and the Corporation Tax
        declaration). Confirm the correct director — it is not assumed to be the account holder.
      </p>

      {loading ? (
        <div className="flex items-center gap-2.5 text-sm text-muted px-4 py-3">
          <div className="w-4 h-4 rounded-full border-2 border-border border-t-primary animate-spin" />
          Loading directors from Companies House…
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {directors.map((d) => (
            <label
              key={d.name}
              className={cn(
                labelClass,
                selected === d.name
                  ? "border-primary bg-primary-bg"
                  : "border-border bg-card hover:border-muted",
              )}
            >
              <input
                type="radio"
                name="filing-director"
                className="mt-0.5 accent-[var(--color-primary)]"
                checked={selected === d.name}
                onChange={() => setSelected(d.name)}
              />
              <span>
                <span className="block text-[15px] font-medium text-foreground">{d.name}</span>
                <span className="block text-[12px] text-muted mt-0.5">
                  Active director at Companies House
                </span>
              </span>
            </label>
          ))}

          <label
            className={cn(
              labelClass,
              selected === MANUAL
                ? "border-primary bg-primary-bg"
                : "border-border bg-card hover:border-muted",
            )}
          >
            <input
              type="radio"
              name="filing-director"
              className="mt-0.5 accent-[var(--color-primary)]"
              checked={selected === MANUAL}
              onChange={() => setSelected(MANUAL)}
            />
            <span className="flex-1">
              <span className="block text-[15px] font-medium text-foreground">
                {directors.length > 0 ? "A different director" : "Enter the director's name"}
              </span>
              <span className="block text-[12px] text-muted mt-0.5">
                Enter the full name of the director filing this return.
              </span>
            </span>
          </label>

          {selected === MANUAL && (
            <input
              type="text"
              autoFocus
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="e.g. Jane Smith"
              spellCheck={false}
              className={cn(
                "focus-ring-input w-full px-4 py-2.5 border border-muted rounded-lg text-[15px] text-foreground bg-card transition-colors duration-200 box-border ml-0",
                "focus:border-primary",
              )}
            />
          )}

          {chError && (
            <p className="text-[12px] text-muted m-0 mt-1 leading-relaxed">
              We couldn&apos;t reach Companies House to list directors. Enter the director&apos;s
              full name above to continue.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
