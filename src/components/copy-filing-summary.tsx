"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyFilingSummaryProps {
  companyName: string;
  companyNumber: string;
  filingType: "accounts" | "ct600";
  periodStart: Date;
  periodEnd: Date;
  confirmedAt: Date | null;
}

function fmtDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function CopyFilingSummary({
  companyName,
  companyNumber,
  filingType,
  periodStart,
  periodEnd,
  confirmedAt,
}: CopyFilingSummaryProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const lines = [
      "Filing Confirmation",
      `Company: ${companyName}`,
      `CRN: ${companyNumber}`,
      `Filing: ${filingType === "accounts" ? "Annual Accounts" : "CT600"}`,
      `Period: ${fmtDate(periodStart)} to ${fmtDate(periodEnd)}`,
      "Status: Accepted",
      confirmedAt ? `Date confirmed: ${fmtDate(confirmedAt)}` : null,
      "Filed via dormantfile.co.uk",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API requires secure context — silent fail in dev
    }
  }

  return (
    <button
      onClick={handleCopy}
      title="Copy filing summary"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "28px",
        height: "28px",
        borderRadius: "6px",
        border: "1px solid var(--color-border)",
        backgroundColor: "transparent",
        cursor: "pointer",
        color: copied ? "var(--color-success)" : "var(--color-text-secondary)",
        transition: "color 200ms, border-color 200ms",
      }}
    >
      {copied ? (
        <Check size={14} strokeWidth={2} />
      ) : (
        <Copy size={14} strokeWidth={2} />
      )}
    </button>
  );
}
