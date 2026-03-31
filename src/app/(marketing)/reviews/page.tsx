import { ReviewCard } from "@/components/marketing/ReviewCard";
import { ReviewForm } from "@/components/marketing/ReviewForm";
import { StarRating } from "@/components/marketing/StarRating";
import { ReviewListJsonLd } from "@/lib/content/json-ld";
import { getPublishedReviews, getRatingBreakdown, getReviewStats } from "@/lib/reviews";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export const metadata: Metadata = {
  title: "Reviews — DormantFile",
  description:
    "See what customers say about DormantFile. Read reviews from companies who have filed their dormant accounts and CT600 returns.",
  alternates: { canonical: `${BASE_URL}/reviews` },
};

export default async function ReviewsPage() {
  const [reviews, stats, { breakdown, total }, session] = await Promise.all([
    getPublishedReviews(),
    getReviewStats(),
    getRatingBreakdown(),
    getServerSession(authOptions),
  ]);

  let existingReview = null;
  let userName: string | undefined;

  if (session?.user?.id) {
    const userWithReview = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, review: { select: { rating: true, text: true } } },
    });
    existingReview = userWithReview?.review ?? null;
    userName = userWithReview?.name;
  }

  return (
    <>
      {stats && (
        <ReviewListJsonLd
          reviews={reviews.map((r) => ({
            name: r.name,
            rating: r.rating,
            text: r.text,
            createdAt: r.createdAt,
          }))}
          avgRating={stats.avgRating}
          reviewCount={stats.reviewCount}
        />
      )}

      {/* Header */}
      <div className="text-center mb-12">
        <h1
          className="text-3xl font-bold tracking-tight mb-3"
          style={{ color: "var(--color-text-primary)" }}
        >
          Customer reviews
        </h1>
        <p className="text-base" style={{ color: "var(--color-text-secondary)" }}>
          Hear from companies who&apos;ve filed with DormantFile.
        </p>
      </div>

      {/* Aggregate summary */}
      {stats && total > 0 && (
        <div
          className="mb-10 p-8 text-center"
          style={{
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
          }}
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <span
              className="text-4xl font-bold"
              style={{ color: "var(--color-text-primary)" }}
            >
              {stats.avgRating}
            </span>
            <div>
              <StarRating rating={stats.avgRating} size={22} />
              <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
                from {stats.reviewCount} review{stats.reviewCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Bar breakdown */}
          <div className="max-w-xs mx-auto mt-6 space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = breakdown[star] || 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span
                    className="w-8 text-right font-medium"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    {star}★
                  </span>
                  <div
                    className="flex-1 h-2 rounded-full overflow-hidden"
                    style={{ backgroundColor: "var(--color-bg-inset)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: "var(--color-cta)",
                      }}
                    />
                  </div>
                  <span
                    className="w-8 text-left"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Review form */}
      <div className="mb-10">
        <ReviewForm
          isAuthenticated={!!session?.user?.id}
          existingReview={existingReview}
          userName={userName}
        />
      </div>

      {/* Review list */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              rating={review.rating}
              text={review.text}
              name={review.name}
              verified={review.verified}
              createdAt={review.createdAt}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p
            className="text-base font-medium mb-2"
            style={{ color: "var(--color-text-primary)" }}
          >
            No reviews yet
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
            Be the first to review DormantFile. Filed your dormant accounts with us? We&apos;d love
            to hear how it went.
          </p>
        </div>
      )}
    </>
  );
}
