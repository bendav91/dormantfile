"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyEmailPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  // Confirmation mode state
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Waiting mode state
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Confirmation mode: verify on mount when token is present
  useEffect(() => {
    if (!token) return;

    async function verify() {
      setVerifying(true);
      setVerifyError("");
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setVerifyError(data.error ?? "Verification failed. The link may have expired.");
        } else {
          await update();
          router.push("/dashboard");
        }
      } catch {
        setVerifyError("Something went wrong. Please try again.");
      } finally {
        setVerifying(false);
      }
    }

    verify();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cooldown ticker
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function handleResend() {
    setSending(true);
    setSent(false);
    try {
      await fetch("/api/auth/resend-verification", { method: "POST" });
      setSent(true);
      setCooldown(60);
    } finally {
      setSending(false);
    }
  }

  // --- Confirmation mode ---
  if (token) {
    return (
      <div className="text-center">
        {verifying ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Verifying your email&hellip;
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Just a moment.</p>
          </>
        ) : verifyError ? (
          <>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              Verification failed
            </h1>
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 mb-6">
              {verifyError}
            </p>
            <button
              onClick={handleResend}
              disabled={sending || cooldown > 0}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {sending
                ? "Sending\u2026"
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend verification email"}
            </button>
          </>
        ) : null}
      </div>
    );
  }

  // --- Waiting mode ---
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Check your inbox</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          We sent a verification link to
        </p>
        {session?.user?.email && (
          <p className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
            {session.user.email}
          </p>
        )}
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Click the link in the email to verify your account.
        </p>
      </div>

      {sent && (
        <p className="mb-4 text-center text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg px-4 py-2.5">
          Email sent!
        </p>
      )}

      <button
        onClick={handleResend}
        disabled={sending || cooldown > 0}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {sending ? "Sending\u2026" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
      </button>

      <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Wrong email? Sign out
        </button>
      </p>
    </>
  );
}
