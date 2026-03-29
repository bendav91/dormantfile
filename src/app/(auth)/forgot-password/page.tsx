"use client";

import { useState } from "react";
import Link from "next/link";

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

  if (submitted) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">Check your email</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
          If an account exists with that email, we have sent a password reset link. It expires in 1 hour.
        </p>
        <Link
          href="/login"
          className="block w-full text-center bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">Reset your password</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
        Enter your email address and we will send you a link to reset your password.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
            spellCheck={false}
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:bg-slate-800"
          />
        </div>
        {error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {loading ? "Sending\u2026" : "Send reset link"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
        <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Back to sign in</Link>
      </p>
    </div>
  );
}
