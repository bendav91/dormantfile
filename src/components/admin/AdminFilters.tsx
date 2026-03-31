"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface FilterOption {
  value: string;
  label: string;
}

interface AdminFiltersProps {
  paramName: string;
  options: FilterOption[];
}

export function AdminFilters({ paramName, options }: AdminFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) || options[0]?.value || "";

  function handleClick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === options[0]?.value) {
      params.delete(paramName);
    } else {
      params.set(paramName, value);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((opt) => {
        const isActive = current === opt.value || (!searchParams.get(paramName) && opt.value === options[0]?.value);
        return (
          <button
            key={opt.value}
            onClick={() => handleClick(opt.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors duration-150"
            style={{
              backgroundColor: isActive ? "var(--color-primary-bg)" : "transparent",
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
              border: `1px solid ${isActive ? "var(--color-primary-border)" : "var(--color-border)"}`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
