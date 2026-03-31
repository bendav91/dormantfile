"use client";

import { Suspense, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthError } from "@/components/auth";

export default function VerifyEmailChangePage() {
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
      <VerifyEmailChangeContent />
    </Suspense>
  );
}

function VerifyEmailChangeContent() {
  const { update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "error" | "done">(token ? "loading" : "error");
  const [error, setError] = useState(token ? "" : "No verification token provided.");

  useEffect(() => {
    if (!token) return;

    async function verify() {
      try {
        const res = await fetch("/api/account/verify-email-change", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "The link is invalid or has expired.");
          setStatus("error");
        } else {
          await update();
          setStatus("done");
          router.push("/settings");
        }
      } catch {
        setError("Something went wrong. Please try again.");
        setStatus("error");
      }
    }

    verify();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") {
    return (
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--color-primary-bg)" }}
          >
            <div
              className="w-5 h-5 border-2 rounded-full animate-spin"
              style={{
                borderColor: "var(--color-primary-border)",
                borderTopColor: "var(--color-primary)",
              }}
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--color-text-primary)" }}>
          Confirming your new email&hellip;
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Just a moment.
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center">
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
        <h1 className="text-2xl font-bold mb-3" style={{ color: "var(--color-text-primary)" }}>
          Email change failed
        </h1>
        <div className="mb-6">
          <AuthError message={error} />
        </div>
        <Link
          href="/settings"
          className="text-sm font-semibold hover:underline focus-ring rounded px-1"
          style={{ color: "var(--color-primary)" }}
        >
          Back to settings
        </Link>
      </div>
    );
  }

  return null;
}
