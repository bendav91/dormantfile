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
        style={{
          position: "absolute",
          left: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "#94A3B8",
          pointerEvents: "none",
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search by company name or number\u2026"
        aria-label="Search by company name or number"
        className="focus-ring-input"
        style={{
          width: "100%",
          padding: "10px 40px 10px 40px",
          fontSize: "14px",
          color: "#1E293B",
          backgroundColor: "#ffffff",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "#E2E8F0",
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
          style={{
            position: "absolute",
            right: "10px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "#94A3B8",
            display: "flex",
            alignItems: "center",
          }}
        >
          <X size={16} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
