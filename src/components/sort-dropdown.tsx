"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

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
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(!open)}
        className="focus-ring flex items-center gap-[5px] bg-card border border-border rounded-lg py-[7px] px-3 text-xs font-medium text-body cursor-pointer transition-colors duration-200"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ArrowUpDown size={12} strokeWidth={2} className="text-muted" />
        <span className="sort-dropdown-label">{currentLabel}</span>
        <ChevronDown size={10} strokeWidth={2.5} className="text-muted" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Sort options"
          className="absolute right-0 top-[calc(100%+4px)] bg-card border border-border rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-1 z-50 min-w-[160px]"
        >
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              role="option"
              aria-selected={currentSort === s.key}
              onClick={() => handleSelect(s.key)}
              className={cn(
                "block w-full text-left py-2 px-3 text-xs border-0 rounded-md cursor-pointer transition-colors duration-150 hover:bg-inset",
                currentSort === s.key
                  ? "font-semibold text-foreground bg-inset"
                  : "font-normal text-body bg-transparent",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
