"use client";

import { useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
}

export function AuthInput({ label, helperText, error, id, type, ...props }: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  const helperId = helperText ? `${id}-helper` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1.5 text-body"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={inputType}
          aria-describedby={describedBy}
          aria-invalid={error ? "true" : undefined}
          className={cn(
            "auth-input w-full rounded-lg px-4 py-2.5 text-sm focus-ring-input transition-colors text-foreground bg-input border border-solid",
            error ? "border-danger" : "border-input-border",
            isPassword && "pr-11",
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-0 top-0 h-full px-3 flex items-center focus-ring rounded-r-lg text-muted"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        )}
      </div>
      {helperText && !error && (
        <p
          id={helperId}
          className="text-xs mt-1.5 text-secondary"
        >
          {helperText}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs mt-1.5 font-medium text-danger-text"
        >
          {error}
        </p>
      )}
    </div>
  );
}
