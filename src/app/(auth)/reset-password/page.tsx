"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BrandPanel,
  BrandPanelMobile,
  FormPanel,
  AuthInput,
  AuthButton,
  AuthError,
} from "@/components/auth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <FormPanel>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Invalid link
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
          This password reset link is invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="hoverable-btn focus-ring block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
        >
          Request a new link
        </Link>
      </FormPanel>
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
        setError(data.error || "Something went wrong.");
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
      <FormPanel>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Password reset
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
          Your password has been reset successfully.
        </p>
        <Link
          href="/login"
          className="hoverable-btn focus-ring block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
        >
          Sign in
        </Link>
      </FormPanel>
    );
  }

  return (
    <FormPanel>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ color: "var(--color-text-primary)" }}
      >
        Set a new password
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        Choose a new password for your account
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          id="password"
          label="New password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          helperText="Must include at least one letter and one number"
        />

        <AuthError message={error} />

        <AuthButton type="submit" loading={loading} loadingText="Resetting…">
          Reset password
        </AuthButton>
      </form>
    </FormPanel>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <BrandPanel variant="returning" />
      <div className="flex flex-col" style={{ backgroundColor: "var(--color-bg-card)" }}>
        <BrandPanelMobile />
        <Suspense
          fallback={
            <FormPanel>
              <div className="flex items-center justify-center py-12">
                <div
                  className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "var(--color-border)",
                    borderTopColor: "var(--color-primary)",
                  }}
                />
              </div>
            </FormPanel>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  );
}
