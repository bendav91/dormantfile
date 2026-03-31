"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="no-print"
      style={{
        backgroundColor: "var(--color-cta)",
        color: "var(--color-bg-card)",
        padding: "12px 24px",
        borderRadius: "8px",
        fontWeight: 600,
        fontSize: "14px",
        border: "none",
        cursor: "pointer",
        transition: "opacity 200ms",
        width: "100%",
        marginTop: "24px",
      }}
    >
      Print receipt
    </button>
  );
}
