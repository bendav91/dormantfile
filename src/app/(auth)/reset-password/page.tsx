"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthInput, AuthButton, AuthError } from "@/components/auth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <>
        <div className="mb-6 flex justify-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--color-danger-bg)" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ color: "var(--color-danger)" }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
        </div>
        <h1
          className="text-2xl font-bold mb-2 text-center"
          style={{ color: "var(--color-text-primary)" }}
        >
          Invalid link
        </h1>
        <p
          className="text-sm mb-8 text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          This password reset link is invalid or has expired.
        </p>
        <Link
          href="/forgot-password"
          className="focus-ring block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary)";
          }}
        >
          Request a new link
        </Link>
      </>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <>
        <div className="mb-6 flex justify-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--color-success-bg)" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ color: "var(--color-success)" }}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
        </div>
        <h1
          className="text-2xl font-bold mb-2 text-center"
          style={{ color: "var(--color-text-primary)" }}
        >
          Password updated
        </h1>
        <p
          className="text-sm mb-8 text-center"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Your password has been reset successfully.
        </p>
        <Link
          href="/login"
          className="focus-ring block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{
            backgroundColor: "var(--color-primary)",
            color: "#fff",
            minHeight: "44px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary-hover)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-primary)";
          }}
        >
          Sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ color: "var(--color-text-primary)" }}
      >
        Set a new password
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        Choose a new password for your account
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        <AuthInput
          id="password"
          label="New password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a new password"
          helperText="At least 8 characters with a letter and a number"
        />

        <AuthError message={error} />

        <AuthButton type="submit" loading={loading} loadingText="Resetting…">
          Reset password
        </AuthButton>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: "var(--color-border)",
              borderTopColor: "var(--color-primary)",
            }}
          />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
