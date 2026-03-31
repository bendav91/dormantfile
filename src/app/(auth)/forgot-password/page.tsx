"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthInput, AuthButton, AuthError } from "@/components/auth";

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
        setError("Too many requests. Please wait a minute and try again.");
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

  if (submitted) {
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
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>
        <h1
          className="text-2xl font-bold mb-2 text-center"
          style={{ color: "var(--color-text-primary)" }}
        >
          Check your email
        </h1>
        <p
          className="text-sm mb-8 text-center leading-relaxed"
          style={{ color: "var(--color-text-secondary)" }}
        >
          If an account exists for{" "}
          <strong style={{ color: "var(--color-text-primary)" }}>{email}</strong>, we&apos;ve sent a
          password reset link. It expires in 1 hour.
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
          Back to sign in
        </Link>
        <p className="mt-4 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
          Didn&apos;t receive it? Check your spam folder or try again.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Reset your password
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        Enter your email and we&apos;ll send you a reset link
      </p>

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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

      <p className="mt-8 text-center text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline focus-ring rounded"
          style={{ color: "var(--color-primary)" }}
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
