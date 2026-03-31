import { StarRating } from "@/components/marketing/StarRating";
import { getReviewStats } from "@/lib/reviews";
import Link from "next/link";

interface AggregateRatingProps {
  variant: "inline" | "centered";
}

export async function AggregateRating({ variant }: AggregateRatingProps) {
  const stats = await getReviewStats();
  if (!stats) return null;

  const content = (
    <>
      <StarRating rating={stats.avgRating} size={variant === "centered" ? 18 : 14} />
      <span>
        Rated {stats.avgRating}/5 by {stats.reviewCount} customer{stats.reviewCount !== 1 ? "s" : ""}
      </span>
    </>
  );

  if (variant === "centered") {
    return (
      <Link
        href="/reviews"
        className="flex items-center justify-center gap-2 text-sm transition-opacity duration-150 hover:opacity-80"
        style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}
      >
        {content}
      </Link>
    );
  }

  return (
    <Link
      href="/reviews"
      className="inline-flex items-center gap-1.5 transition-opacity duration-150 hover:opacity-80"
      style={{ fontSize: "12px", color: "var(--color-text-muted)", textDecoration: "none" }}
    >
      {content}
    </Link>
  );
}
