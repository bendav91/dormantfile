import type { ButtonHTMLAttributes } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export function AuthButton({
  children,
  loading,
  loadingText,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className="hoverable-btn focus-ring w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        backgroundColor: "var(--color-primary)",
        color: "#fff",
      }}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  );
}
