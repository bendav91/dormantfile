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
          color: "#1E293B",
          margin: "0 0 8px 0",
          letterSpacing: "-0.02em",
        }}
      >
        Welcome to the Agent plan
      </h1>
      <p style={{ fontSize: "16px", color: "#64748B", margin: "0 0 32px 0" }}>
        Will you be filing on behalf of clients as an accountant or agent?
      </p>

      {error && (
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#DC2626",
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
          style={{
            padding: "24px 20px",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            backgroundColor: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            transition: "all 200ms",
          }}
          onMouseEnter={(e) => {
            if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = "#2563EB";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#E2E8F0";
          }}
        >
          <Briefcase size={28} color="#2563EB" />
          <span style={{ fontSize: "16px", fontWeight: 600, color: "#1E293B" }}>
            Yes, I&apos;m an agent
          </span>
          <span style={{ fontSize: "13px", color: "#64748B" }}>
            I&apos;ll file CT600 returns on behalf of client companies using my agent Government Gateway credentials.
          </span>
          {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
        </button>

        <button
          onClick={() => handleChoice(false)}
          disabled={loading}
          style={{
            padding: "24px 20px",
            borderRadius: "12px",
            border: "1px solid #E2E8F0",
            backgroundColor: "#ffffff",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
            transition: "all 200ms",
          }}
          onMouseEnter={(e) => {
            if (!loading) (e.currentTarget as HTMLButtonElement).style.borderColor = "#2563EB";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#E2E8F0";
          }}
        >
          <Building2 size={28} color="#2563EB" />
          <span style={{ fontSize: "16px", fontWeight: 600, color: "#1E293B" }}>
            No, I just need more companies
          </span>
          <span style={{ fontSize: "13px", color: "#64748B" }}>
            I&apos;ll file as a company director for each of my own companies.
          </span>
          {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
        </button>
      </div>

      <p style={{ fontSize: "13px", color: "#94A3B8", marginTop: "24px" }}>
        You can change this anytime in Settings.
      </p>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
