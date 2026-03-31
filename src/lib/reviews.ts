import { prisma } from "@/lib/db";

const MIN_REVIEWS_THRESHOLD = 3;

export interface ReviewStats {
  avgRating: number;
  reviewCount: number;
}

export async function getReviewStats(): Promise<ReviewStats | null> {
  try {
    const result = await prisma.review.aggregate({
      _avg: { rating: true },
      _count: { rating: true },
      where: { approved: true, hiddenAt: null },
    });

    if (result._count.rating < MIN_REVIEWS_THRESHOLD) return null;

    return {
      avgRating: Math.round((result._avg.rating ?? 0) * 10) / 10,
      reviewCount: result._count.rating,
    };
  } catch {
    return null;
  }
}

export async function getPublishedReviews() {
  try {
    return await prisma.review.findMany({
      where: { approved: true, hiddenAt: null },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

export async function getRatingBreakdown() {
  try {
    const reviews = await prisma.review.findMany({
      where: { approved: true, hiddenAt: null },
      select: { rating: true },
    });

    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const r of reviews) {
      breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
    }
    return { breakdown, total: reviews.length };
  } catch {
    return { breakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }, total: 0 };
  }
}

export async function getPendingReviews() {
  return prisma.review.findMany({
    where: { approved: false, hiddenAt: null },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllReviewsAdmin() {
  return prisma.review.findMany({
    orderBy: { createdAt: "desc" },
  });
}
