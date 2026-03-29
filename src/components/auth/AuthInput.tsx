import type { InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
}

export function AuthInput({ label, helperText, id, ...props }: AuthInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1"
        style={{ color: "var(--color-text-body)" }}
      >
        {label}
      </label>
      <input
        id={id}
        className="auth-input w-full rounded-lg px-4 py-2.5 text-sm focus-ring-input"
        style={{
          color: "var(--color-text-primary)",
          backgroundColor: "var(--color-input-bg)",
          borderWidth: "1px",
          borderColor: "var(--color-input-border)",
        }}
        {...props}
      />
      {helperText && (
        <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
