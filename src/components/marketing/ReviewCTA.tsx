import { Star } from "lucide-react";
import Link from "next/link";

export function ReviewCTA() {
  return (
    <div className="text-center bg-card border border-border rounded-xl p-8">
      <div className="flex items-center justify-center gap-1 mb-2">
        <Star size={18} className="text-cta" fill="var(--color-cta)" />
        <Star size={18} className="text-cta" fill="var(--color-cta)" />
        <Star size={18} className="text-cta" fill="var(--color-cta)" />
        <Star size={18} className="text-cta" fill="var(--color-cta)" />
        <Star size={18} className="text-cta" fill="var(--color-cta)" />
      </div>
      <p className="text-sm font-semibold mb-1 text-foreground">
        Used DormantFile?
      </p>
      <p className="text-sm mb-4 text-secondary">
        We&apos;d love to hear how it went.
      </p>
      <Link
        href="/reviews#form"
        className="inline-flex items-center gap-1.5 text-sm font-medium rounded-lg transition-colors duration-150 text-primary px-4 py-2 border border-border bg-page no-underline"
      >
        Leave a review
      </Link>
    </div>
  );
}
