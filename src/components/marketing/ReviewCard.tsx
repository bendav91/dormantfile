import { CheckCircle } from "lucide-react";
import { StarRating } from "@/components/marketing/StarRating";

interface ReviewCardProps {
  rating: number;
  text: string | null;
  name: string;
  verified: boolean;
  createdAt: Date;
}

function relativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  }
  const years = Math.floor(diffDays / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

export function ReviewCard({ rating, text, name, verified, createdAt }: ReviewCardProps) {
  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-3">
        <StarRating rating={rating} size={16} />
        <span className="text-xs text-muted">
          {relativeDate(createdAt)}
        </span>
      </div>

      {text && (
        <p className="text-sm leading-relaxed mb-3 text-body">
          &ldquo;{text}&rdquo;
        </p>
      )}

      <div className="flex items-center gap-2">
        <p className="text-sm font-semibold text-foreground m-0">
          {name}
        </p>
        {verified && (
          <span className="inline-flex items-center gap-1 text-xs text-success">
            <CheckCircle size={13} strokeWidth={2} />
            Verified customer
          </span>
        )}
      </div>
    </div>
  );
}
