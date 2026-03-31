import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Prisma
vi.mock("@/lib/db", () => ({
  prisma: {
    filing: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    user: { count: vi.fn(), groupBy: vi.fn(), findMany: vi.fn() },
    review: { count: vi.fn() },
    contactMessage: { count: vi.fn(), findMany: vi.fn() },
    company: { count: vi.fn(), findMany: vi.fn() },
  },
}));

// Mock auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

import { prisma } from "@/lib/db";
import { getAttentionCounts, getHealthStats } from "@/lib/admin";

describe("getAttentionCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all zero counts when nothing needs attention", async () => {
    vi.mocked(prisma.filing.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.review.count).mockResolvedValue(0);
    vi.mocked(prisma.contactMessage.count).mockResolvedValue(0);

    const result = await getAttentionCounts();

    expect(result).toEqual({
      stuckFilings: 0,
      rejectedFilings: 0,
      failedPayments: 0,
      pendingReviews: 0,
      unreadMessages: 0,
    });
  });

  it("returns correct counts when items need attention", async () => {
    vi.mocked(prisma.filing.count)
      .mockResolvedValueOnce(3)  // stuck filings
      .mockResolvedValueOnce(1); // rejected filings
    vi.mocked(prisma.user.count).mockResolvedValue(2);
    vi.mocked(prisma.review.count).mockResolvedValue(5);
    vi.mocked(prisma.contactMessage.count).mockResolvedValue(4);

    const result = await getAttentionCounts();

    expect(result.stuckFilings).toBe(3);
    expect(result.rejectedFilings).toBe(1);
    expect(result.failedPayments).toBe(2);
    expect(result.pendingReviews).toBe(5);
    expect(result.unreadMessages).toBe(4);
  });
});

describe("getHealthStats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates MRR from annual tier prices", async () => {
    vi.mocked(prisma.user.groupBy).mockResolvedValue([
      { subscriptionTier: "basic", _count: 10 },
      { subscriptionTier: "multi", _count: 5 },
      { subscriptionTier: "agent", _count: 2 },
    ] as never);
    vi.mocked(prisma.company.count).mockResolvedValue(20);
    vi.mocked(prisma.filing.count).mockResolvedValue(8);

    const result = await getHealthStats();

    // MRR = (10*19 + 5*39 + 2*49) / 12 = (190 + 195 + 98) / 12 = 483/12 = 40.25 ≈ 40
    expect(result.mrr).toBe(40);
    expect(result.tiers).toEqual({ basic: 10, multi: 5, agent: 2 });
    expect(result.totalSubscribers).toBe(17);
    expect(result.totalCompanies).toBe(20);
    expect(result.filingsThisMonth).toBe(8);
  });

  it("returns zeros when no subscribers", async () => {
    vi.mocked(prisma.user.groupBy).mockResolvedValue([] as never);
    vi.mocked(prisma.company.count).mockResolvedValue(0);
    vi.mocked(prisma.filing.count).mockResolvedValue(0);

    const result = await getHealthStats();

    expect(result.mrr).toBe(0);
    expect(result.totalSubscribers).toBe(0);
    expect(result.tiers).toEqual({ basic: 0, multi: 0, agent: 0 });
  });
});
