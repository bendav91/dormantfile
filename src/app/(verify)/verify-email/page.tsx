"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthButton, AuthError, AuthSuccess } from "@/components/auth";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 rounded-full animate-spin border-border border-t-primary" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
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
        {verifying && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-bg">
                <div className="w-5 h-5 border-2 rounded-full animate-spin border-primary-border border-t-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-2 text-foreground">
              Verifying your email&hellip;
            </h1>
            <p className="text-sm text-secondary">
              Just a moment.
            </p>
          </>
        )}

        {!verifying && verifyError && (
          <>
            <div className="mb-6 flex justify-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-danger-bg">
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
                  className="text-danger"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
            </div>
            <h1 className="text-2xl font-bold mb-3 text-foreground">
              Verification failed
            </h1>
            <div className="mb-6">
              <AuthError message={verifyError} />
            </div>
            <AuthButton
              onClick={handleResend}
              disabled={sending || cooldown > 0}
              loading={sending}
              loadingText="Sending…"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
            </AuthButton>
          </>
        )}
      </div>
    );
  }

  // --- Waiting mode ---
  return (
    <>
      <div className="mb-8 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-primary-bg">
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
              className="text-primary"
            >
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">
          Check your inbox
        </h1>
        <p className="text-sm text-secondary">
          We sent a verification link to
        </p>
        {session?.user?.email && (
          <p className="mt-1 text-sm font-semibold text-foreground">
            {session.user.email}
          </p>
        )}
        <p className="mt-3 text-sm text-muted">
          Click the link in the email to verify your account.
        </p>
      </div>

      {sent && (
        <div className="mb-4">
          <AuthSuccess message="Verification email sent!" />
        </div>
      )}

      <AuthButton
        onClick={handleResend}
        disabled={sending || cooldown > 0}
        loading={sending}
        loadingText="Sending…"
      >
        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
      </AuthButton>

      <div className="mt-6 text-center">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-sm font-medium hover:underline focus-ring rounded px-1 text-primary"
        >
          Wrong email? Sign out
        </button>
      </div>
    </>
  );
}
