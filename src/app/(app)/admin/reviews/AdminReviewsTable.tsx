"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StarRating } from "@/components/marketing/StarRating";
import { StatusBadge } from "@/components/admin/StatusBadge";
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
          className="flex items-start justify-between gap-4 p-4 rounded-xl bg-card border border-border"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <StarRating rating={review.rating} size={14} />
              <StatusBadge status={review.hiddenAt ? "hidden" : review.approved ? "published" : "pending"} />
            </div>

            {review.text && (
              <p className="text-sm mb-2 leading-relaxed text-body">
                {review.text.length > 200
                  ? `${review.text.slice(0, 200)}\u2026`
                  : review.text}
              </p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="font-medium text-secondary">
                {review.name}
              </span>
              {review.verified && (
                <span className="inline-flex items-center gap-1 text-success">
                  <CheckCircle size={12} /> Verified
                </span>
              )}
              <span>{new Date(review.createdAt).toLocaleDateString("en-GB")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!review.approved && !review.hiddenAt && (
              <button
                onClick={() => handleAction(review.id, "approve")}
                disabled={loading === review.id}
                className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 transition-colors duration-150 bg-success-bg text-success border border-success-border"
              >
                Approve
              </button>
            )}
            {!review.hiddenAt ? (
              <button
                onClick={() => handleAction(review.id, "hide")}
                disabled={loading === review.id}
                className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 transition-colors duration-150 bg-danger-bg text-danger border border-danger-border"
              >
                Hide
              </button>
            ) : (
              <button
                onClick={() => handleAction(review.id, "unhide")}
                disabled={loading === review.id}
                className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 transition-colors duration-150 text-secondary border border-border bg-transparent"
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
