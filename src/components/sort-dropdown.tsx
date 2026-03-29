"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronDown } from "lucide-react";

const SORT_OPTIONS = [
  { key: "most-overdue", label: "Most Overdue" },
  { key: "most-outstanding", label: "Most Outstanding" },
  { key: "name-asc", label: "A\u2013Z" },
  { key: "date-added-newest", label: "Newest first" },
  { key: "date-added-oldest", label: "Oldest first" },
] as const;

export type SortType = (typeof SORT_OPTIONS)[number]["key"];

export default function SortDropdown({ currentSort }: { currentSort: SortType }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentLabel = SORT_OPTIONS.find((s) => s.key === currentSort)?.label ?? "Most Overdue";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSelect(key: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (key === "most-overdue") {
      params.delete("sort");
    } else {
      params.set("sort", key);
    }
    params.delete("page");
    router.push(`/dashboard${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        className="focus-ring"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "7px 12px",
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--color-text-body)",
          cursor: "pointer",
          transition: "border-color 200ms",
        }}
      >
        <ArrowUpDown size={12} strokeWidth={2} style={{ color: "var(--color-text-muted)" }} />
        <span className="sort-dropdown-label">{currentLabel}</span>
        <ChevronDown size={10} strokeWidth={2.5} style={{ color: "var(--color-text-muted)" }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Sort options"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            padding: "4px",
            zIndex: 50,
            minWidth: "160px",
          }}
        >
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              role="option"
              aria-selected={currentSort === s.key}
              onClick={() => handleSelect(s.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: currentSort === s.key ? 600 : 400,
                color: currentSort === s.key ? "var(--color-text-primary)" : "var(--color-text-body)",
                background: currentSort === s.key ? "var(--color-bg-inset)" : "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "background-color 150ms",
              }}
              onMouseEnter={(e) => {
                if (currentSort !== s.key) e.currentTarget.style.backgroundColor = "var(--color-bg-inset)";
              }}
              onMouseLeave={(e) => {
                if (currentSort !== s.key) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
