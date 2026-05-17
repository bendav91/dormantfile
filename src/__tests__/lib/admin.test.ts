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
import { getAttentionCounts, getHealthStats, getFilingsList } from "@/lib/admin";

describe("getAttentionCounts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all zero counts when nothing needs attention", async () => {
    vi.mocked(prisma.filing.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.review.count).mockResolvedValue(0);
    vi.mocked(prisma.contactMessage.count).mockResolvedValue(0);
    vi.mocked(prisma.company.count).mockResolvedValue(0);

    const result = await getAttentionCounts();

    expect(result).toEqual({
      stuckFilings: 0,
      rejectedFilings: 0,
      failedPayments: 0,
      pendingReviews: 0,
      unreadMessages: 0,
      atRiskUncovered: 0,
    });
  });

  it("returns correct counts when items need attention", async () => {
    vi.mocked(prisma.filing.count)
      .mockResolvedValueOnce(3)  // stuck filings
      .mockResolvedValueOnce(1); // rejected filings
    vi.mocked(prisma.user.count).mockResolvedValue(2);
    vi.mocked(prisma.review.count).mockResolvedValue(5);
    vi.mocked(prisma.contactMessage.count).mockResolvedValue(4);
    vi.mocked(prisma.company.count).mockResolvedValue(7);

    const result = await getAttentionCounts();

    expect(result.stuckFilings).toBe(3);
    expect(result.rejectedFilings).toBe(1);
    expect(result.failedPayments).toBe(2);
    expect(result.pendingReviews).toBe(5);
    expect(result.unreadMessages).toBe(4);
    expect(result.atRiskUncovered).toBe(7);
  });

  it("at-risk metric counts non-deleted, non-Covered companies with a live outstanding obligation", async () => {
    vi.mocked(prisma.filing.count).mockResolvedValue(0);
    vi.mocked(prisma.user.count).mockResolvedValue(0);
    vi.mocked(prisma.review.count).mockResolvedValue(0);
    vi.mocked(prisma.contactMessage.count).mockResolvedValue(0);
    vi.mocked(prisma.company.count).mockResolvedValue(9);

    await getAttentionCounts();

    const [arg] = (
      prisma.company.count as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    // Non-deleted only (deleted = Stop, intentionally silenced — not at risk).
    expect(arg.where.deletedAt).toBeNull();
    // Classification ≠ Covered ⇒ user not in the Covered statuses.
    expect(arg.where.user.subscriptionStatus.notIn).toEqual([
      "active",
      "cancelling",
    ]);
    // Has at least one live obligation: an outstanding filing with a deadline.
    expect(arg.where.filings.some).toMatchObject({
      status: "outstanding",
      deadline: { not: null },
    });
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

describe("getFilingsList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.filing.findMany).mockResolvedValue([]);
    vi.mocked(prisma.filing.count).mockResolvedValue(0);
  });

  function whereArg() {
    const [arg] = (
      prisma.filing.findMany as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    return arg.where as { AND: Record<string, unknown>[] };
  }

  const NON_DORMANTFILE = {
    NOT: { submittedAt: null, status: { in: ["accepted", "filed_elsewhere"] } },
  };

  it("always excludes imported CH history / filed-elsewhere rows (no submittedAt)", async () => {
    await getFilingsList({});
    expect(whereArg().AND).toContainEqual(NON_DORMANTFILE);
  });

  it("keeps the exclusion alongside an explicit status filter", async () => {
    await getFilingsList({ status: "accepted" });
    const and = whereArg().AND;
    expect(and).toContainEqual(NON_DORMANTFILE);
    expect(and).toContainEqual({ status: "accepted" });
  });

  it("applies the same where to the count query for consistent pagination", async () => {
    await getFilingsList({ type: "ct600" });
    const [findArg] = (
      prisma.filing.findMany as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    const [countArg] = (
      prisma.filing.count as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];
    expect(countArg.where).toEqual(findArg.where);
  });
});
