"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/marketing/StarRating";
import { CheckCircle } from "lucide-react";

interface AdminReview {
  id: string;
  rating: number;
  name: string;
  text: string | null;
  verified: boolean;
  approved: boolean;
  hiddenAt: string | null;
  createdAt: string;
}

function ReviewStatus({ review }: { review: AdminReview }) {
  if (review.hiddenAt) {
    return (
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "rgba(220, 38, 38, 0.08)", color: "var(--color-danger)" }}
      >
        Hidden
      </span>
    );
  }
  if (!review.approved) {
    return (
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{ backgroundColor: "rgba(202, 138, 4, 0.08)", color: "var(--color-warning)" }}
      >
        Pending
      </span>
    );
  }
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: "rgba(21, 128, 61, 0.08)", color: "var(--color-success)" }}
    >
      Published
    </span>
  );
}

export function AdminReviewsTable({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(id: string, action: "approve" | "hide" | "unhide") {
    setLoading(id);
    try {
      const response = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });

      if (response.ok) {
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="flex items-start justify-between gap-4 p-4 rounded-xl"
          style={{
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <StarRating rating={review.rating} size={14} />
              <ReviewStatus review={review} />
            </div>

            {review.text && (
              <p
                className="text-sm mb-2 leading-relaxed"
                style={{ color: "var(--color-text-body)" }}
              >
                {review.text.length > 200
                  ? `${review.text.slice(0, 200)}\u2026`
                  : review.text}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
              <span className="font-medium" style={{ color: "var(--color-text-secondary)" }}>
                {review.name}
              </span>
              {review.verified && (
                <span className="inline-flex items-center gap-1" style={{ color: "var(--color-success)" }}>
                  <CheckCircle size={12} /> Verified
                </span>
              )}
              <span>{new Date(review.createdAt).toLocaleDateString("en-GB")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {!review.approved && !review.hiddenAt && (
              <button
                onClick={() => handleAction(review.id, "approve")}
                disabled={loading === review.id}
                className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 transition-colors duration-150"
                style={{
                  backgroundColor: "rgba(21, 128, 61, 0.08)",
                  color: "var(--color-success)",
                  border: "1px solid rgba(21, 128, 61, 0.2)",
                }}
              >
                Approve
              </button>
            )}
            {!review.hiddenAt ? (
              <button
                onClick={() => handleAction(review.id, "hide")}
                disabled={loading === review.id}
                className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 transition-colors duration-150"
                style={{
                  backgroundColor: "rgba(220, 38, 38, 0.08)",
                  color: "var(--color-danger)",
                  border: "1px solid rgba(220, 38, 38, 0.2)",
                }}
              >
                Hide
              </button>
            ) : (
              <button
                onClick={() => handleAction(review.id, "unhide")}
                disabled={loading === review.id}
                className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 transition-colors duration-150"
                style={{
                  color: "var(--color-text-secondary)",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "transparent",
                }}
              >
                Unhide
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
