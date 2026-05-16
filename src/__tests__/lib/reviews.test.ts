import { describe, expect, it, vi, beforeEach } from "vitest";

const findMany = vi.fn();
const aggregate = vi.fn();

vi.mock("@/lib/db", () => ({
  prisma: {
    review: {
      findMany: (...args: unknown[]) => findMany(...args),
      aggregate: (...args: unknown[]) => aggregate(...args),
    },
  },
}));

import {
  getPublishedReviews,
  getReviewStats,
  getRatingBreakdown,
  getPendingReviews,
  getAllReviewsAdmin,
} from "@/lib/reviews";

const PUBLIC_WHERE = {
  approved: true,
  hiddenAt: null,
  rating: { gte: 4 },
};

beforeEach(() => {
  findMany.mockReset();
  aggregate.mockReset();
});

describe("public reviews are floored at 4 stars", () => {
  it("getPublishedReviews filters approved + not hidden + rating >= 4", async () => {
    findMany.mockResolvedValue([]);
    await getPublishedReviews();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: PUBLIC_WHERE }),
    );
  });

  it("getReviewStats aggregates only over rating >= 4", async () => {
    aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 10 } });
    await getReviewStats();
    expect(aggregate).toHaveBeenCalledWith(
      expect.objectContaining({ where: PUBLIC_WHERE }),
    );
  });

  it("getReviewStats still returns null below the minimum review threshold", async () => {
    aggregate.mockResolvedValue({ _avg: { rating: 5 }, _count: { rating: 2 } });
    expect(await getReviewStats()).toBeNull();
  });

  it("getRatingBreakdown filters rating >= 4 and only charts 4 and 5", async () => {
    findMany.mockResolvedValue([
      { rating: 5 },
      { rating: 5 },
      { rating: 4 },
    ]);
    const { breakdown, total } = await getRatingBreakdown();
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: PUBLIC_WHERE }),
    );
    expect(Object.keys(breakdown).sort()).toEqual(["4", "5"]);
    expect(breakdown).toEqual({ 5: 2, 4: 1 });
    expect(total).toBe(3);
  });

  it("getRatingBreakdown returns only 4/5 keys on query failure", async () => {
    findMany.mockRejectedValue(new Error("db down"));
    const { breakdown, total } = await getRatingBreakdown();
    expect(Object.keys(breakdown).sort()).toEqual(["4", "5"]);
    expect(total).toBe(0);
  });
});

describe("admin reviews are not floored", () => {
  it("getPendingReviews where clause has no rating floor", async () => {
    findMany.mockResolvedValue([]);
    await getPendingReviews();
    const arg = findMany.mock.calls[0][0] as { where: Record<string, unknown> };
    expect(arg.where).not.toHaveProperty("rating");
    expect(arg.where).toMatchObject({ approved: false, hiddenAt: null });
  });

  it("getAllReviewsAdmin returns every review with no where filter", async () => {
    findMany.mockResolvedValue([]);
    await getAllReviewsAdmin();
    const arg = findMany.mock.calls[0][0] as { where?: unknown };
    expect(arg.where).toBeUndefined();
  });
});
