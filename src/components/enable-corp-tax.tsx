"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDigit, Plus } from "lucide-react";

export default function EnableCorpTax({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [utr, setUtr] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = utr.trim();
    if (!/^\d{10}$/.test(trimmed)) {
      setError("UTR must be exactly 10 digits.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/company/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          registeredForCorpTax: true,
          uniqueTaxReference: trimmed,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to enable Corporation Tax.");
        setSaving(false);
        return;
      }

      setExpanded(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
      setSaving(false);
    }
  }

  if (!expanded) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          backgroundColor: "#F8FAFC",
          borderRadius: "8px",
        }}
      >
        <p style={{ fontSize: "13px", color: "#64748B", margin: 0 }}>
          Registered for Corporation Tax?
        </p>
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            backgroundColor: "transparent",
            color: "#2563EB",
            padding: "4px 10px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "12px",
            border: "1px solid #BFDBFE",
            cursor: "pointer",
            transition: "all 200ms",
          }}
        >
          <Plus size={13} strokeWidth={2.5} />
          Enable CT600
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "14px 16px",
        backgroundColor: "#F8FAFC",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <FileDigit size={14} color="#2563EB" strokeWidth={2} />
        <label htmlFor={`utr-${companyId}`} style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B" }}>
          Unique Tax Reference (UTR)
        </label>
      </div>
      <input
        id={`utr-${companyId}`}
        type="text"
        maxLength={10}
        value={utr}
        onChange={(e) => {
          setUtr(e.target.value);
          if (error) setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
        }}
        placeholder="e.g. 1234567890"
        autoFocus
        style={{
          width: "100%",
          padding: "10px 14px",
          border: error ? "1px solid #EF4444" : "1px solid #E2E8F0",
          borderRadius: "6px",
          fontSize: "14px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      {error && (
        <p style={{ fontSize: "13px", color: "#EF4444", margin: 0 }}>{error}</p>
      )}
      <p style={{ fontSize: "12px", color: "#64748B", margin: 0 }}>
        Your 10-digit UTR from HMRC. This will add CT600 filing to this company.
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            backgroundColor: saving ? "#CBD5E1" : "#2563EB",
            color: "#ffffff",
            padding: "6px 16px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "13px",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Enable CT600"}
        </button>
        <button
          onClick={() => {
            setExpanded(false);
            setUtr("");
            setError("");
          }}
          disabled={saving}
          style={{
            backgroundColor: "transparent",
            color: "#64748B",
            padding: "6px 16px",
            borderRadius: "6px",
            fontWeight: 600,
            fontSize: "13px",
            border: "1px solid #CBD5E1",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
