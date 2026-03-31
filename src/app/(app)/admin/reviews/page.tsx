import { getAllReviewsAdmin } from "@/lib/reviews";
import { AdminReviewsTable } from "./AdminReviewsTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Manage Reviews — Admin",
};

export default async function AdminReviewsPage() {
  const reviews = await getAllReviewsAdmin();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6 text-foreground">
        Reviews
      </h2>

      {reviews.length === 0 ? (
        <p className="text-sm text-secondary">
          No reviews yet.
        </p>
      ) : (
        <AdminReviewsTable
          reviews={reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            name: r.name,
            text: r.text,
            verified: r.verified,
            approved: r.approved,
            hiddenAt: r.hiddenAt?.toISOString() ?? null,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
