"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDigit, Plus } from "lucide-react";
import { cn } from "@/lib/cn";

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
      <div className="flex items-center justify-between py-2 px-2.5 bg-inset rounded-md">
        <p className="text-xs text-body m-0">
          Registered for Corporation Tax?
        </p>
        <button
          onClick={() => setExpanded(true)}
          className="focus-ring hoverable-pill inline-flex items-center gap-1.5 bg-transparent text-primary py-1.5 px-3 rounded-[5px] font-semibold text-xs border border-primary-border cursor-pointer transition-colors duration-200"
        >
          <Plus size={13} strokeWidth={2.5} />
          Enable CT600
        </button>
      </div>
    );
  }

  return (
    <div className="p-2.5 bg-inset rounded-md flex flex-col gap-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-primary">
          <FileDigit size={14} color="currentColor" strokeWidth={2} />
        </span>
        <label
          htmlFor={`utr-${companyId}`}
          className="text-xs font-semibold text-foreground"
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
        className={cn(
          "focus-ring-input w-full py-2.5 px-3.5 text-foreground border border-solid rounded-md text-sm box-border",
          error ? "border-danger" : "border-muted"
        )}
      />
      {error && (
        <p className="text-[13px] text-danger m-0">{error}</p>
      )}
      <p className="text-xs text-body m-0">
        Your 10-digit UTR from HMRC. This will add CT600 filing to this company.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            "focus-ring text-card py-1.5 px-3 rounded-[5px] font-semibold text-xs border-0",
            saving ? "bg-disabled cursor-not-allowed" : "bg-primary cursor-pointer"
          )}
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
          className="focus-ring bg-transparent text-body py-1.5 px-3 rounded-[5px] font-semibold text-xs border border-disabled cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
