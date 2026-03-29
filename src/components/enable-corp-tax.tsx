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
          padding: "8px 10px",
          backgroundColor: "var(--color-bg-inset)",
          borderRadius: "6px",
        }}
      >
        <p style={{ fontSize: "12px", color: "var(--color-text-body)", margin: 0 }}>
          Registered for Corporation Tax?
        </p>
        <button
          onClick={() => setExpanded(true)}
          className="focus-ring hoverable-pill"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "transparent",
            color: "var(--color-primary)",
            padding: "6px 12px",
            borderRadius: "5px",
            fontWeight: 600,
            fontSize: "12px",
            border: "1px solid var(--color-primary-border)",
            cursor: "pointer",
            transition: "background-color 200ms, color 200ms",
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
        padding: "10px",
        backgroundColor: "var(--color-bg-inset)",
        borderRadius: "6px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ color: "var(--color-primary)" }}>
          <FileDigit size={14} color="currentColor" strokeWidth={2} />
        </span>
        <label
          htmlFor={`utr-${companyId}`}
          style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}
        >
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
        autoComplete="off"
        spellCheck={false}
        className="focus-ring-input"
        style={{
          width: "100%",
          padding: "10px 14px",
          color: "var(--color-text-primary)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: error ? "var(--color-danger)" : "var(--color-text-muted)",
          borderRadius: "6px",
          fontSize: "14px",
          boxSizing: "border-box",
        }}
      />
      {error && (
        <p style={{ fontSize: "13px", color: "var(--color-danger)", margin: 0 }}>{error}</p>
      )}
      <p style={{ fontSize: "12px", color: "var(--color-text-body)", margin: 0 }}>
        Your 10-digit UTR from HMRC. This will add CT600 filing to this company.
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="focus-ring"
          style={{
            backgroundColor: saving ? "var(--color-bg-disabled)" : "var(--color-primary)",
            color: "var(--color-bg-card)",
            padding: "6px 12px",
            borderRadius: "5px",
            fontWeight: 600,
            fontSize: "12px",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving\u2026" : "Enable CT600"}
        </button>
        <button
          onClick={() => {
            setExpanded(false);
            setUtr("");
            setError("");
          }}
          disabled={saving}
          className="focus-ring"
          style={{
            backgroundColor: "transparent",
            color: "var(--color-text-body)",
            padding: "6px 12px",
            borderRadius: "5px",
            fontWeight: 600,
            fontSize: "12px",
            border: "1px solid var(--color-bg-disabled)",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
