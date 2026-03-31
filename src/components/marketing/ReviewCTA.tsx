import { Star } from "lucide-react";
import Link from "next/link";

export function ReviewCTA() {
  return (
    <div
      className="text-center"
      style={{
        backgroundColor: "var(--color-bg-card)",
        border: "1px solid var(--color-border)",
        borderRadius: "12px",
        padding: "2rem",
      }}
    >
      <div className="flex items-center justify-center gap-1 mb-2">
        <Star size={18} style={{ color: "var(--color-cta)" }} fill="var(--color-cta)" />
        <Star size={18} style={{ color: "var(--color-cta)" }} fill="var(--color-cta)" />
        <Star size={18} style={{ color: "var(--color-cta)" }} fill="var(--color-cta)" />
        <Star size={18} style={{ color: "var(--color-cta)" }} fill="var(--color-cta)" />
        <Star size={18} style={{ color: "var(--color-cta)" }} fill="var(--color-cta)" />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>
        Used DormantFile?
      </p>
      <p className="text-sm mb-4" style={{ color: "var(--color-text-secondary)" }}>
        We&apos;d love to hear how it went.
      </p>
      <Link
        href="/reviews#form"
        className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg transition-colors duration-150"
        style={{
          color: "var(--color-primary)",
          padding: "8px 16px",
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-bg-page)",
          textDecoration: "none",
        }}
      >
        Leave a review
      </Link>
    </div>
  );
}
