import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { TIER_PRICES } from "@/lib/subscription";
import type { SubscriptionTier } from "@prisma/client";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  return user?.isAdmin ? session : null;
}

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function getAttentionCounts() {
  const fiveMinAgo = new Date(Date.now() - FIVE_MINUTES_MS);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [stuckFilings, rejectedFilings, failedPayments, pendingReviews, unreadMessages] =
    await Promise.all([
      prisma.filing.count({
        where: {
          OR: [
            { status: "submitted", submittedAt: { lt: new Date(Date.now() - FIVE_MINUTES_MS) } },
            { status: "pending", updatedAt: { lt: fiveMinAgo } },
          ],
        },
      }),
      prisma.filing.count({
        where: {
          status: "rejected",
          confirmedAt: { lt: sevenDaysAgo },
        },
      }),
      prisma.user.count({
        where: { subscriptionStatus: "past_due" },
      }),
      prisma.review.count({
        where: { approved: false, hiddenAt: null },
      }),
      prisma.contactMessage.count({
        where: { readAt: null },
      }),
    ]);

  return { stuckFilings, rejectedFilings, failedPayments, pendingReviews, unreadMessages };
}

export async function getHealthStats() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [tierCounts, totalCompanies, filingsThisMonth] = await Promise.all([
    prisma.user.groupBy({
      by: ["subscriptionTier"],
      where: { subscriptionStatus: { in: ["active", "cancelling"] } },
      _count: true,
    }),
    prisma.company.count({ where: { deletedAt: null } }),
    prisma.filing.count({
      where: { status: "accepted", confirmedAt: { gte: startOfMonth } },
    }),
  ]);

  const tiers: Record<string, number> = { basic: 0, multi: 0, agent: 0 };
  let totalSubscribers = 0;
  for (const t of tierCounts) {
    if (t.subscriptionTier !== "none") {
      tiers[t.subscriptionTier] = t._count;
      totalSubscribers += t._count;
    }
  }

  const mrr = Math.round(
    Object.entries(tiers).reduce(
      (sum, [tier, count]) => sum + count * (TIER_PRICES[tier as SubscriptionTier] || 0),
      0,
    ) / 12,
  );

  return { tiers, totalSubscribers, totalCompanies, filingsThisMonth, mrr };
}

export async function getRecentActivity(limit = 10) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  const [newSignups, recentFilings, recentMessages] = await Promise.all([
    prisma.user.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { id: true, name: true, email: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.filing.findMany({
      where: {
        status: { in: ["submitted", "accepted", "rejected"] },
        OR: [
          { submittedAt: { gte: twoDaysAgo } },
          { confirmedAt: { gte: twoDaysAgo } },
        ],
      },
      select: {
        id: true,
        filingType: true,
        status: true,
        submittedAt: true,
        confirmedAt: true,
        company: {
          select: {
            companyName: true,
            user: { select: { id: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
    }),
    prisma.contactMessage.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  type ActivityItem = {
    type: "signup" | "filing" | "message";
    timestamp: Date;
    description: string;
    link: string;
  };

  const items: ActivityItem[] = [
    ...newSignups.map((u) => ({
      type: "signup" as const,
      timestamp: u.createdAt,
      description: `${u.name} signed up (${u.email})`,
      link: `/admin/customers/${u.id}`,
    })),
    ...recentFilings.map((f) => ({
      type: "filing" as const,
      timestamp: f.confirmedAt ?? f.submittedAt ?? new Date(),
      description: `${f.company.companyName} — ${f.filingType} ${f.status}`,
      link: `/admin/customers/${f.company.user.id}`,
    })),
    ...recentMessages.map((m) => ({
      type: "message" as const,
      timestamp: m.createdAt,
      description: `New message from ${m.name}`,
      link: "/admin/messages",
    })),
  ];

  items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return items.slice(0, limit);
}

const PAGE_SIZE = 20;

export async function getCustomerList(params: {
  q?: string;
  filter?: string;
  page?: number;
}) {
  const { q, filter, page = 1 } = params;
  const skip = (page - 1) * PAGE_SIZE;

  const where: Record<string, unknown> = {};

  if (filter === "active") {
    where.subscriptionStatus = { in: ["active", "cancelling"] };
  } else if (filter === "past_due") {
    where.subscriptionStatus = "past_due";
  } else if (filter === "cancelled") {
    where.subscriptionStatus = "cancelled";
  } else if (filter === "none") {
    where.subscriptionStatus = "none";
  }

  if (q) {
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      {
        companies: {
          some: {
            OR: [
              { companyName: { contains: q, mode: "insensitive" } },
              { companyRegistrationNumber: { contains: q, mode: "insensitive" } },
            ],
          },
        },
      },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        subscriptionTier: true,
        subscriptionStatus: true,
        createdAt: true,
        _count: {
          select: {
            companies: { where: { deletedAt: null } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.user.count({ where }),
  ]);

  // Get outstanding filing counts for these users
  const userIds = users.map((u) => u.id);
  const outstandingCounts = await prisma.filing.groupBy({
    by: ["companyId"],
    where: {
      status: "outstanding",
      company: { userId: { in: userIds }, deletedAt: null },
    },
    _count: true,
  });

  // Map company -> user for the outstanding counts
  const companies = await prisma.company.findMany({
    where: { userId: { in: userIds }, deletedAt: null },
    select: { id: true, userId: true },
  });
  const companyToUser = new Map(companies.map((c) => [c.id, c.userId]));

  const userOutstanding = new Map<string, number>();
  for (const oc of outstandingCounts) {
    const userId = companyToUser.get(oc.companyId);
    if (userId) {
      userOutstanding.set(userId, (userOutstanding.get(userId) || 0) + oc._count);
    }
  }

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      subscriptionTier: u.subscriptionTier,
      subscriptionStatus: u.subscriptionStatus,
      createdAt: u.createdAt.toISOString(),
      companyCount: u._count.companies,
      outstandingFilings: userOutstanding.get(u.id) || 0,
    })),
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

export async function getCustomerDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      stripeCustomerId: true,
      createdAt: true,
      remindersMuted: true,
      filingAsAgent: true,
      review: true,
      companies: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          companyName: true,
          companyRegistrationNumber: true,
          deletedAt: true,
          filings: {
            orderBy: { periodStart: "desc" },
            select: {
              id: true,
              filingType: true,
              periodStart: true,
              periodEnd: true,
              status: true,
              accountsDeadline: true,
              ct600Deadline: true,
              submittedAt: true,
              confirmedAt: true,
              correlationId: true,
            },
          },
        },
      },
    },
  });

  return user;
}

export async function getFilingsList(params: {
  status?: string;
  type?: string;
  deadline?: string;
  page?: number;
  sort?: string;
  order?: "asc" | "desc";
}) {
  const { status, type, deadline, page = 1, sort = "deadline", order = "asc" } = params;
  const skip = (page - 1) * PAGE_SIZE;
  const now = new Date();
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const fiveMinAgo = new Date(Date.now() - FIVE_MINUTES_MS);

  const conditions: Record<string, unknown>[] = [];

  if (status === "stuck") {
    conditions.push({
      OR: [
        { status: "submitted", submittedAt: { lt: new Date(Date.now() - FIVE_MINUTES_MS) } },
        { status: "pending", updatedAt: { lt: fiveMinAgo } },
      ],
    });
  } else if (status && status !== "all") {
    conditions.push({ status });
  }

  if (type && type !== "all") {
    conditions.push({ filingType: type });
  }

  if (deadline === "overdue") {
    conditions.push({
      OR: [
        { deadline: { lt: now }, status: "outstanding" },
        { accountsDeadline: { lt: now }, status: "outstanding" },
        { ct600Deadline: { lt: now }, status: "outstanding" },
      ],
    });
  } else if (deadline === "due_soon") {
    conditions.push({
      OR: [
        { deadline: { gte: now, lte: thirtyDays }, status: "outstanding" },
        { accountsDeadline: { gte: now, lte: thirtyDays }, status: "outstanding" },
        { ct600Deadline: { gte: now, lte: thirtyDays }, status: "outstanding" },
      ],
    });
  }

  const where = conditions.length > 0 ? { AND: conditions } : {};

  // Build orderBy
  let orderBy: Record<string, string>;
  if (sort === "status") {
    orderBy = { status: order };
  } else if (sort === "submitted") {
    orderBy = { submittedAt: order };
  } else {
    orderBy = { accountsDeadline: order };
  }

  const [filings, total] = await Promise.all([
    prisma.filing.findMany({
      where,
      select: {
        id: true,
        filingType: true,
        periodStart: true,
        periodEnd: true,
        startDate: true,
        endDate: true,
        status: true,
        accountsDeadline: true,
        ct600Deadline: true,
        deadline: true,
        submittedAt: true,
        confirmedAt: true,
        correlationId: true,
        company: {
          select: {
            companyName: true,
            companyRegistrationNumber: true,
            user: { select: { id: true, email: true } },
          },
        },
      },
      orderBy,
      skip,
      take: PAGE_SIZE,
    }),
    prisma.filing.count({ where }),
  ]);

  return {
    filings: filings.map((f) => ({
      id: f.id,
      filingType: f.filingType,
      periodStart: (f.startDate ?? f.periodStart).toISOString(),
      periodEnd: (f.endDate ?? f.periodEnd).toISOString(),
      status: f.status,
      deadline: (f.deadline ?? f.accountsDeadline ?? f.ct600Deadline)?.toISOString() ?? null,
      accountsDeadline: f.accountsDeadline?.toISOString() ?? null,
      ct600Deadline: f.ct600Deadline?.toISOString() ?? null,
      submittedAt: f.submittedAt?.toISOString() ?? null,
      confirmedAt: f.confirmedAt?.toISOString() ?? null,
      correlationId: f.correlationId,
      companyName: f.company.companyName,
      crn: f.company.companyRegistrationNumber,
      userId: f.company.user.id,
      userEmail: f.company.user.email,
    })),
    total,
    page,
    totalPages: Math.ceil(total / PAGE_SIZE),
  };
}

export async function getMessagesList() {
  return prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });
}
