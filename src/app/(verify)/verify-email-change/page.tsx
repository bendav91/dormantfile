"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailChangePage() {
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Confirming your new email&hellip;
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Just a moment.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Email change failed
        </h1>
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2.5 mb-6">
          {error}
        </p>
        <Link
          href="/settings"
          className="inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Back to settings
        </Link>
      </div>
    );
  }

  return null;
}
