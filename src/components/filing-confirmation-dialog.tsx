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

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.5)",
};

const cardStyle: React.CSSProperties = {
  maxWidth: "520px",
  width: "calc(100% - 32px)",
  backgroundColor: "var(--color-bg-card)",
  borderRadius: "12px",
  padding: "32px",
  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08)",
  position: "relative",
};

const cancelButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px 24px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "16px",
  border: "1px solid var(--color-border)",
  backgroundColor: "transparent",
  color: "var(--color-text-secondary)",
  cursor: "pointer",
  transition: "opacity 200ms, transform 200ms",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const confirmButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px 24px",
  borderRadius: "8px",
  fontWeight: 600,
  fontSize: "16px",
  border: "none",
  backgroundColor: "var(--color-cta)",
  color: "var(--color-bg-card)",
  cursor: "pointer",
  transition: "opacity 200ms, transform 200ms",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

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
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div style={cardStyle}>
        {/* Icon */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: "var(--color-warning-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertTriangle size={24} color="var(--color-warning)" strokeWidth={2} />
          </div>
        </div>

        {/* Title */}
        <h2
          style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 12px 0",
            textAlign: "center",
            letterSpacing: "-0.01em",
          }}
        >
          Confirm filing submission
        </h2>

        {/* Body */}
        <p
          style={{
            fontSize: "15px",
            color: "var(--color-text-body)",
            margin: "0 0 28px 0",
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          You are about to submit <strong>{filingLabel}</strong> for{" "}
          <strong>{companyName}</strong> for the period{" "}
          <strong>{periodStart}</strong> to <strong>{periodEnd}</strong> to{" "}
          <strong>{authority}</strong>. This is a legal filing and cannot be undone.
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onCancel}
            className="focus-ring"
            style={cancelButtonStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="focus-ring"
            style={confirmButtonStyle}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            }}
          >
            Yes, submit filing
          </button>
        </div>
      </div>
    </div>
  );
}
