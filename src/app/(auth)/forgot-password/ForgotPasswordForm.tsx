"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthInput, AuthButton, AuthError } from "@/components/auth";

export default function ForgotPasswordForm() {
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
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-success-bg">
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
              className="text-success"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center text-foreground">
          Check your email
        </h1>
        <h2 className="text-sm mb-8 text-center leading-relaxed text-secondary">
          If an account exists for{" "}
          <strong className="text-foreground">{email}</strong>, we&apos;ve sent a
          password reset link. It expires in 1 hour.
        </h2>
        <Link
          href="/login"
          className="focus-ring block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors bg-primary text-white min-h-[44px] flex items-center justify-center hover:bg-primary-hover"
        >
          Back to sign in
        </Link>
        <p className="mt-4 text-center text-xs text-muted">
          Didn&apos;t receive it? Check your spam folder or try again.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold mb-1 text-foreground">
        Reset your password
      </h1>
      <h2 className="text-sm mb-8 text-secondary">
        Enter your email and we&apos;ll send you a reset link
      </h2>

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

      <p className="mt-8 text-center text-sm text-secondary">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold hover:underline focus-ring rounded text-primary"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
