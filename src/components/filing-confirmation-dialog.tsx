"use client";

import { useEffect, useCallback } from "react";
import { AlertTriangle } from "lucide-react";

interface FilingConfirmationDialogProps {
  filingType: "accounts" | "ct600";
  companyName: string;
  periodStart: string;
  periodEnd: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FilingConfirmationDialog({
  filingType,
  companyName,
  periodStart,
  periodEnd,
  onConfirm,
  onCancel,
}: FilingConfirmationDialogProps) {
  const filingLabel = filingType === "accounts" ? "annual accounts" : "CT600";
  const authority = filingType === "accounts" ? "Companies House" : "HMRC";

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="max-w-[520px] w-[calc(100%-32px)] bg-card rounded-xl p-8 shadow-[0_8px_30px_rgba(0,0,0,0.18),0_2px_8px_rgba(0,0,0,0.08)] relative">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-12 h-12 rounded-full bg-warning-bg flex items-center justify-center">
            <AlertTriangle size={24} color="var(--color-warning)" strokeWidth={2} />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-foreground mt-0 mb-3 mx-0 text-center tracking-tight">
          Confirm filing submission
        </h2>

        {/* Body */}
        <p className="text-[15px] text-body mt-0 mb-7 mx-0 leading-relaxed text-center">
          You are about to submit <strong>{filingLabel}</strong> for{" "}
          <strong>{companyName}</strong> for the period{" "}
          <strong>{periodStart}</strong> to <strong>{periodEnd}</strong> to{" "}
          <strong>{authority}</strong>. This is a legal filing and cannot be undone.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="focus-ring flex-1 py-3 px-6 rounded-lg font-semibold text-base border border-border bg-transparent text-secondary cursor-pointer transition-all duration-200 inline-flex items-center justify-center hover:opacity-80"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="focus-ring flex-1 py-3 px-6 rounded-lg font-semibold text-base border-0 bg-cta text-card cursor-pointer transition-all duration-200 inline-flex items-center justify-center hover:opacity-90 hover:-translate-y-px"
          >
            Yes, submit filing
          </button>
        </div>
      </div>
    </div>
  );
}
