"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

export default function CompanySearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQuery = searchParams.get("q") || "";
  const [value, setValue] = useState(currentQuery);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(currentQuery);
  }, [currentQuery]);

  function navigate(query: string) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    const currentFilter = searchParams.get("filter");
    const currentSort = searchParams.get("sort");
    if (currentFilter) params.set("filter", currentFilter);
    if (currentSort) params.set("sort", currentSort);
    // Reset to page 1 on new search
    router.push(`/dashboard${params.toString() ? `?${params}` : ""}`);
  }

  function handleChange(newValue: string) {
    setValue(newValue);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate(newValue.trim()), 300);
  }

  function handleClear() {
    setValue("");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    navigate("");
  }

  return (
    <div className="relative flex-1">
      <Search
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none"
      />
      <input
        type="search"
        name="search"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={"Search\u2026"}
        aria-label="Search by company name or number"
        className="focus-ring-input w-full py-2.5 px-10 text-sm text-foreground bg-card border border-border rounded-lg box-border transition-colors duration-200"
      />
      {value && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          className="focus-ring absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-0 cursor-pointer p-1 rounded text-muted flex items-center transition-colors duration-200 hover:text-body hover:bg-inset"
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
