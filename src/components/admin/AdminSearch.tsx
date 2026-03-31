"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useCallback } from "react";
import { Search } from "lucide-react";

interface AdminSearchProps {
  placeholder?: string;
}

export function AdminSearch({ placeholder = "Search..." }: AdminSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const value = e.target.value;

      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set("q", value);
        } else {
          params.delete("q");
        }
        params.delete("page");
        router.push(`?${params.toString()}`);
      }, 300);
    },
    [router, searchParams],
  );

  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
      />
      <input
        type="text"
        placeholder={placeholder}
        defaultValue={searchParams.get("q") || ""}
        onChange={handleChange}
        className="text-sm w-full pl-9 pr-3 py-2 rounded-lg outline-none bg-inset border border-border text-foreground"
      />
    </div>
  );
}
