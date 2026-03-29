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
    <div style={{ position: "relative", marginBottom: "24px" }}>
      <Search
        size={16}
        strokeWidth={2}
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--color-text-muted)",
          pointerEvents: "none",
        }}
      />
      <input
        type="search"
        name="search"
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search by company name or number\u2026"
        aria-label="Search by company name or number"
        className="focus-ring-input"
        style={{
          width: "100%",
          padding: "10px 40px 10px 40px",
          fontSize: "14px",
          color: "var(--color-text-primary)",
          backgroundColor: "var(--color-bg-card)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--color-border)",
          borderRadius: "8px",
          boxSizing: "border-box",
          transition: "border-color 200ms",
        }}
      />
      {value && (
        <button
          onClick={handleClear}
          aria-label="Clear search"
          className="focus-ring"
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--color-text-body)";
            e.currentTarget.style.backgroundColor = "var(--color-bg-inset)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--color-text-muted)";
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            borderRadius: "4px",
            color: "var(--color-text-muted)",
            display: "flex",
            alignItems: "center",
            transition: "color 200ms, background-color 200ms",
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
