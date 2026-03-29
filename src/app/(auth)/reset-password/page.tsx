"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">Invalid link</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
          This password reset link is invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full text-center bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Request new link
        </Link>
      </div>
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
      <div>
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">Password reset</h1>
        <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
          Your password has been reset successfully.
        </p>
        <Link
          href="/login"
          className="block w-full text-center bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100 mb-2">Set new password</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-6">
        Enter your new password below.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
            autoComplete="new-password"
            className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus-visible:border-blue-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 dark:bg-slate-800"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Must include at least one letter and one number.</p>
        </div>
        {error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {loading ? "Resetting\u2026" : "Reset password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-gray-500 dark:text-gray-400">Loading\u2026</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
