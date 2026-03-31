"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

interface StarRatingProps {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}

export function StarRating({ rating, size = 16, interactive = false, onChange }: StarRatingProps) {
  return (
    <span className="inline-flex items-center gap-0.5" role={interactive ? "radiogroup" : undefined} aria-label={interactive ? "Rating" : `${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= Math.round(rating);
        return interactive ? (
          <button
            key={value}
            type="button"
            onClick={() => onChange?.(value)}
            aria-label={`${value} star${value !== 1 ? "s" : ""}`}
            role="radio"
            aria-checked={value === Math.round(rating)}
            className="cursor-pointer transition-transform duration-150 hover:scale-110 bg-none border-none p-0.5 leading-none"
          >
            <Star
              size={size}
              fill={filled ? "var(--color-cta)" : "none"}
              strokeWidth={1.5}
              className={cn(filled ? "text-cta" : "text-muted")}
            />
          </button>
        ) : (
          <Star
            key={value}
            size={size}
            fill={filled ? "var(--color-cta)" : "none"}
            strokeWidth={1.5}
            className={cn(filled ? "text-cta" : "text-muted")}
            aria-hidden="true"
          />
        );
      })}
    </span>
  );
}
