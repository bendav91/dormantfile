"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Ledger primitives for the company filing tabs.
 *
 * The filing tabs present a dated worklist of statutory obligations — that is a
 * statement/ledger, not a gallery of cards. These primitives render one framing
 * surface with hairline-divided rows (single container depth, never card-in-card)
 * and reflow from a two-column row to a stacked block on narrow screens.
 */

/**
 * Unified quiet treatment for secondary row actions. Borderless, low-contrast
 * text/icons so a single primary action stays dominant — two weight tiers, not
 * five competing chip styles.
 */
export const quietAction =
  "focus-ring inline-flex items-center gap-1 rounded-md border-0 bg-transparent p-0 text-xs font-medium text-secondary transition-colors duration-200 hover:text-foreground cursor-pointer disabled:cursor-wait disabled:opacity-60";

export const quietIcon =
  "focus-ring inline-flex h-7 w-7 items-center justify-center rounded-md border-0 bg-transparent text-secondary transition-colors duration-200 hover:text-foreground cursor-pointer";

export function LedgerList({ children }: { children: ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden divide-y divide-border">
      {children}
    </div>
  );
}

export function LedgerRow({
  eyebrow,
  title,
  tag,
  meta,
  actions,
  dimmed,
}: {
  eyebrow?: string;
  title: ReactNode;
  tag?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  dimmed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5",
        dimmed && "opacity-60",
      )}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="m-0 mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-primary">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h2 className="m-0 text-[15px] font-semibold text-foreground">{title}</h2>
          {tag}
        </div>
        {meta && <div className="mt-1 flex flex-col gap-0.5 text-xs">{meta}</div>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:shrink-0 sm:justify-end">
          {actions}
        </div>
      )}
    </div>
  );
}

export function LedgerEmpty({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-card rounded-xl border border-border px-5 py-12 text-center">
      <p className="m-0 mb-1 text-base font-semibold text-foreground">{title}</p>
      <p className="m-0 text-sm text-secondary">{body}</p>
    </div>
  );
}

export function LedgerTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: ReadonlyArray<{ key: T; label: string; count: number }>;
  active: T;
  onChange: (key: T) => void;
}) {
  return (
    <div className="mb-5 flex items-center gap-5 overflow-x-auto border-b border-border sm:gap-6">
      {tabs.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "-mb-px cursor-pointer whitespace-nowrap border-0 border-b-2 bg-transparent pb-2.5 text-[13px] transition-colors duration-200",
              isActive
                ? "border-foreground font-semibold text-foreground"
                : "border-transparent font-medium text-secondary hover:text-foreground",
            )}
          >
            {t.label}{" "}
            <span className={cn("font-normal", isActive ? "text-secondary" : "text-muted")}>
              ({t.count})
            </span>
          </button>
        );
      })}
    </div>
  );
}
