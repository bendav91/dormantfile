import type { ButtonHTMLAttributes } from "react";

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
      className="focus-ring w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      style={{
        backgroundColor: isPrimary ? "var(--color-primary)" : "transparent",
        color: isPrimary ? "#fff" : "var(--color-primary)",
        borderWidth: isPrimary ? "0" : "1px",
        borderStyle: "solid",
        borderColor: isPrimary ? "transparent" : "var(--color-border)",
        minHeight: "44px",
        ...(isPrimary && !disabled && !loading ? {} : {}),
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading && isPrimary) {
          e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
        }
      }}
      onMouseLeave={(e) => {
        if (isPrimary) {
          e.currentTarget.style.backgroundColor = "var(--color-primary)";
        }
      }}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ flexShrink: 0 }}
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
