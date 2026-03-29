"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BrandPanel,
  BrandPanelMobile,
  FormPanel,
  AuthInput,
  AuthButton,
  AuthError,
} from "@/components/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError("Too many requests. Please try again in a minute.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BrandPanel variant="returning" />
      <div className="flex flex-col" style={{ backgroundColor: "var(--color-bg-card)" }}>
        <BrandPanelMobile />
        <FormPanel>
          {submitted ? (
            <>
              <h1
                className="text-2xl font-bold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                Check your email
              </h1>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
                If an account exists with that email, we have sent a password reset link. It expires
                in 1 hour.
              </p>
              <Link
                href="/login"
                className="hoverable-btn focus-ring block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1
                className="text-2xl font-bold mb-1"
                style={{ color: "var(--color-text-primary)" }}
              >
                Reset your password
              </h1>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
                We&apos;ll send you a reset link
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <AuthInput
                  id="email"
                  label="Email address"
                  type="email"
                  required
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                <AuthError message={error} />

                <AuthButton type="submit" loading={loading} loadingText="Sending…">
                  Send reset link
                </AuthButton>
              </form>

              <p
                className="mt-6 text-center text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-medium hover:underline"
                  style={{ color: "var(--color-primary)" }}
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </FormPanel>
      </div>
    </>
  );
}
