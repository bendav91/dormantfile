"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export default function AgentSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChoice(filingAsAgent: boolean) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/account/agent-preference", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filingAsAgent }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[600px] mx-auto text-center">
      <h1 className="text-[28px] font-bold text-foreground mb-2 tracking-[-0.02em]">
        Welcome to the Agent plan
      </h1>
      <p className="text-base text-secondary mb-8">
        Will you be filing on behalf of clients as an accountant or agent?
      </p>

      {error && (
        <div
          role="alert"
          className="px-4 py-3 bg-danger-bg border border-danger-border rounded-lg text-sm text-danger mb-6"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => handleChoice(true)}
          disabled={loading}
          className={cn(
            "focus-ring py-6 px-5 rounded-xl border border-border bg-card flex flex-col items-center gap-3 transition-colors duration-200",
            loading ? "cursor-not-allowed" : "cursor-pointer hover:border-primary"
          )}
        >
          <span className="text-primary flex">
            <Briefcase size={28} color="currentColor" />
          </span>
          <span className="text-base font-semibold text-foreground">
            Yes, I&apos;m an agent
          </span>
          <span className="text-[13px] text-secondary">
            I&apos;ll file CT600 returns on behalf of client companies using my agent Government
            Gateway credentials.
          </span>
          {loading && <Loader2 size={16} className="animate-spin" />}
        </button>

        <button
          onClick={() => handleChoice(false)}
          disabled={loading}
          className={cn(
            "focus-ring py-6 px-5 rounded-xl border border-border bg-card flex flex-col items-center gap-3 transition-colors duration-200",
            loading ? "cursor-not-allowed" : "cursor-pointer hover:border-primary"
          )}
        >
          <span className="text-primary flex">
            <Building2 size={28} color="currentColor" />
          </span>
          <span className="text-base font-semibold text-foreground">
            No, I just need more companies
          </span>
          <span className="text-[13px] text-secondary">
            I&apos;ll file as a company director for each of my own companies.
          </span>
          {loading && <Loader2 size={16} className="animate-spin" />}
        </button>
      </div>

      <p className="text-[13px] text-muted mt-6">
        You can change this anytime in Settings.
      </p>
    </div>
  );
}
