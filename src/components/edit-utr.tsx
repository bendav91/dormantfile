"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";

export default function EditUTR({
  companyId,
  currentUTR,
}: {
  companyId: string;
  currentUTR: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [utr, setUtr] = useState(currentUTR);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = utr.trim();
    if (!/^\d{10}$/.test(trimmed)) {
      setError("UTR must be exactly 10 digits.");
      return;
    }
    if (trimmed === currentUTR) {
      setEditing(false);
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
          uniqueTaxReference: trimmed,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update UTR.");
        setSaving(false);
        return;
      }

      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        title="Edit UTR"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          fontSize: "13px",
          color: "#94A3B8",
        }}
      >
        UTR: {currentUTR}
        <Pencil size={11} strokeWidth={2} />
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <span style={{ fontSize: "13px", color: "#94A3B8" }}>UTR:</span>
      <input
        type="text"
        maxLength={10}
        value={utr}
        onChange={(e) => {
          setUtr(e.target.value);
          if (error) setError("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") {
            setUtr(currentUTR);
            setEditing(false);
          }
        }}
        autoFocus
        style={{
          width: "90px",
          padding: "2px 6px",
          fontSize: "13px",
          color: "#1E293B",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: error ? "#EF4444" : "#94A3B8",
          borderRadius: "4px",
          outline: "none",
          boxSizing: "border-box",
        }}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        title="Save"
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: "2px",
          cursor: saving ? "not-allowed" : "pointer",
          color: "#16A34A",
        }}
      >
        <Check size={14} strokeWidth={2.5} />
      </button>
      <button
        onClick={() => {
          setUtr(currentUTR);
          setEditing(false);
          setError("");
        }}
        disabled={saving}
        title="Cancel"
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: "none",
          border: "none",
          padding: "2px",
          cursor: "pointer",
          color: "#94A3B8",
        }}
      >
        <X size={14} strokeWidth={2.5} />
      </button>
      {error && (
        <span style={{ fontSize: "12px", color: "#EF4444" }}>{error}</span>
      )}
    </span>
  );
}
