"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, Loader2 } from "lucide-react";

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
    <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
      <h1
        style={{
          fontSize: "28px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: "0 0 8px 0",
          letterSpacing: "-0.02em",
        }}
      >
        Welcome to the Agent plan
      </h1>
      <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", margin: "0 0 32px 0" }}>
        Will you be filing on behalf of clients as an accountant or agent?
      </p>

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            backgroundColor: "var(--color-danger-bg)",
            border: "1px solid var(--color-danger-border)",
            borderRadius: "8px",
            fontSize: "14px",
            color: "var(--color-danger)",
            marginBottom: "24px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <button
          onClick={() => handleChoice(true)}
          disabled={loading}
          className="focus-ring"
          style={{
            padding: "24px 20px",
            borderRadius: "12px",
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg-card)",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            transition: "border-color 200ms",
          }}
          onMouseEnter={(e) => {
            if (!loading)
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
          }}
        >
          <span style={{ color: "var(--color-primary)", display: "flex" }}>
            <Briefcase size={28} color="currentColor" />
          </span>
          <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
            Yes, I&apos;m an agent
          </span>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
            I&apos;ll file CT600 returns on behalf of client companies using my agent Government
            Gateway credentials.
          </span>
          {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
        </button>

        <button
          onClick={() => handleChoice(false)}
          disabled={loading}
          className="focus-ring"
          style={{
            padding: "24px 20px",
            borderRadius: "12px",
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-bg-card)",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            transition: "border-color 200ms",
          }}
          onMouseEnter={(e) => {
            if (!loading)
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-border)";
          }}
        >
          <span style={{ color: "var(--color-primary)", display: "flex" }}>
            <Building2 size={28} color="currentColor" />
          </span>
          <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-primary)" }}>
            No, I just need more companies
          </span>
          <span style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>
            I&apos;ll file as a company director for each of my own companies.
          </span>
          {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
        </button>
      </div>

      <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginTop: "24px" }}>
        You can change this anytime in Settings.
      </p>
    </div>
  );
}
