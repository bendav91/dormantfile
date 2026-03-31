import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary";
}

export function AuthButton({
  children,
  loading,
  loadingText,
  disabled,
  variant = "primary",
  ...props
}: AuthButtonProps) {
  const isPrimary = variant === "primary";

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "focus-ring w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] border-solid",
        isPrimary
          ? "bg-primary text-white border-0 hover:bg-primary-hover"
          : "bg-transparent text-primary border border-border",
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin shrink-0"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
          <path
            d="M12 2a10 10 0 0 1 10 10"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      )}
      <span>{loading ? loadingText : children}</span>
    </button>
  );
}
