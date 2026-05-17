"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { quietIcon } from "@/components/filing-ledger";
import { formatCivilDate, formatUkDate } from "@/lib/format-date";

interface CopyFilingSummaryProps {
  companyName: string;
  companyNumber: string;
  filingType: "accounts" | "ct600";
  periodStart: Date;
  periodEnd: Date;
  confirmedAt: Date | null;
}

// Period dates are statutory civil dates; confirmedAt (below) is an instant.
const fmtDate = formatCivilDate;

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
      confirmedAt ? `Date confirmed: ${formatUkDate(confirmedAt)}` : null,
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
      className={cn(quietIcon, copied && "text-success hover:text-success")}
    >
      {copied ? (
        <Check size={14} strokeWidth={2} />
      ) : (
        <Copy size={14} strokeWidth={2} />
      )}
    </button>
  );
}
