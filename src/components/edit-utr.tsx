"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";

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
        aria-label="Edit UTR"
        className="focus-ring inline-flex items-center gap-1 bg-none border-0 p-0 cursor-pointer text-[13px] text-muted"
      >
        UTR: {currentUTR}
        <Pencil size={11} strokeWidth={2} />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[13px] text-muted">UTR:</span>
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
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "focus-ring-input w-[90px] px-1.5 py-0.5 text-[13px] text-foreground border border-solid rounded-[4px] box-border",
          error ? "border-danger" : "border-muted"
        )}
      />
      <button
        onClick={handleSave}
        disabled={saving}
        title="Save"
        aria-label="Save"
        className={cn(
          "focus-ring inline-flex items-center bg-none border-0 p-0.5 text-success",
          saving ? "cursor-not-allowed" : "cursor-pointer"
        )}
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
        aria-label="Cancel"
        className="focus-ring inline-flex items-center bg-none border-0 p-0.5 cursor-pointer text-muted"
      >
        <X size={14} strokeWidth={2.5} />
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
