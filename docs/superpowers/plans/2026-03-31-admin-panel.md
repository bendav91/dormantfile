# Admin Panel Expansion — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a centralised admin operations hub with dashboard, customer lookup, filings monitor, and contact messages inbox.

**Architecture:** Server-rendered Next.js pages with URL-param-driven filters/pagination. Client components only for interactive elements (search debounce, row actions, bulk operations). All admin API routes share a `requireAdmin()` guard extracted to a shared module.

**Tech Stack:** Next.js 16 App Router, Prisma 7 + PostgreSQL, NextAuth v4, Tailwind CSS v4, CSS custom properties, Vitest.

**Spec:** `docs/superpowers/specs/2026-03-31-admin-panel-design.md`

---

## File Map

### New Files

| File | Responsibility |
|---|---|
| `src/lib/admin.ts` | Shared `requireAdmin()` guard + admin data query helpers |
| `src/components/admin/StatusBadge.tsx` | Reusable coloured status badge |
| `src/components/admin/AdminPagination.tsx` | Server component, prev/next links with page indicator |
| `src/components/admin/AdminSearch.tsx` | Client component, debounced search updating URL params |
| `src/components/admin/AdminFilters.tsx` | Client component, filter tabs updating URL params |
| `src/app/(app)/admin/AdminNav.tsx` | Client component for admin nav with active state + unread badge |
| `src/app/api/admin/stats/route.ts` | Dashboard attention counts + health stats |
| `src/app/api/admin/customers/route.ts` | Customer list with search/filter/pagination |
| `src/app/api/admin/customers/[userId]/route.ts` | Customer detail (companies, filings, review) |
| `src/app/api/admin/filings/route.ts` | Filings list + retry/reset actions |
| `src/app/api/admin/filings/bulk/route.ts` | Bulk retry for polling_timeout filings |
| `src/app/api/admin/messages/route.ts` | Contact messages list |
| `src/app/api/admin/messages/[id]/route.ts` | Mark message as read |
| `src/app/(app)/admin/customers/page.tsx` | Customer list page |
| `src/app/(app)/admin/customers/[userId]/page.tsx` | Customer detail page |
| `src/app/(app)/admin/customers/[userId]/AdminCustomerDetail.tsx` | Client component for filing actions |
| `src/app/(app)/admin/filings/page.tsx` | Filings monitor page |
| `src/app/(app)/admin/filings/AdminFilingsTable.tsx` | Client component for row/bulk actions |
| `src/app/(app)/admin/messages/page.tsx` | Messages page |
| `src/app/(app)/admin/messages/AdminMessageList.tsx` | Client component for expand/mark-read |
| `src/__tests__/lib/admin.test.ts` | Tests for admin query helpers |

### Modified Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ContactMessage` model + `updatedAt` on Filing |
| `src/app/(app)/admin/layout.tsx` | Extend nav, add active state, add unread count |
| `src/app/(app)/admin/page.tsx` | Replace redirect with dashboard |
| `src/app/api/contact/route.ts` | Also persist `ContactMessage` |
| `src/app/api/admin/reviews/route.ts` | Import `requireAdmin` from shared module |
| `src/app/(app)/admin/reviews/AdminReviewsTable.tsx` | Use shared `StatusBadge` |

---

## Task 1: Database Schema Changes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `updatedAt` to Filing model**

In `prisma/schema.prisma`, add `updatedAt` field to the Filing model after the `createdAt` line (line 106):

```prisma
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt
```

- [ ] **Step 2: Add ContactMessage model**

Add at the end of `prisma/schema.prisma`, after the Review model:

```prisma
model ContactMessage {
  id        String    @id @default(cuid())
  name      String
  email     String
  message   String
  readAt    DateTime?
  createdAt DateTime  @default(now())
}
```

- [ ] **Step 3: Run migration**

```bash
npx prisma migrate dev --name admin-panel-schema
```

Expected: Migration creates `ContactMessage` table and adds `updatedAt` column to `Filing`.

- [ ] **Step 4: Generate client**

```bash
npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add prisma/
git commit -m "feat: add ContactMessage model and Filing updatedAt for admin panel"
```

---

## Task 2: Shared Admin Library

**Files:**
- Create: `src/lib/admin.ts`
- Create: `src/__tests__/lib/admin.test.ts`
- Modify: `src/app/api/admin/reviews/route.ts`

- [ ] **Step 1: Create shared admin helpers**

Create `src/lib/admin.ts`:

```typescript
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
            { status: "polling_timeout" },
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
        { status: "polling_timeout" },
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
        { accountsDeadline: { lt: now }, status: "outstanding" },
        { ct600Deadline: { lt: now }, status: "outstanding" },
      ],
    });
  } else if (deadline === "due_soon") {
    conditions.push({
      OR: [
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
        status: true,
        accountsDeadline: true,
        ct600Deadline: true,
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
      periodStart: f.periodStart.toISOString(),
      periodEnd: f.periodEnd.toISOString(),
      status: f.status,
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
```

- [ ] **Step 2: Update reviews API route to use shared requireAdmin**

In `src/app/api/admin/reviews/route.ts`, replace the inline `requireAdmin` function (lines 1-17):

Replace:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  return user?.isAdmin ? session : null;
}
```

With:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
```

- [ ] **Step 3: Create admin tests**

Create `src/__tests__/lib/admin.test.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests**

```bash
npm test -- src/__tests__/lib/admin.test.ts
```

Expected: All tests pass.

- [ ] **Step 5: Verify build**

```bash
npx next build
```

Expected: Build passes. No import errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin.ts src/__tests__/lib/admin.test.ts src/app/api/admin/reviews/route.ts
git commit -m "feat: extract requireAdmin and add admin query helpers with tests"
```

---

## Task 3: Shared Admin Components

**Files:**
- Create: `src/components/admin/StatusBadge.tsx`
- Create: `src/components/admin/AdminPagination.tsx`
- Create: `src/components/admin/AdminSearch.tsx`
- Create: `src/components/admin/AdminFilters.tsx`

- [ ] **Step 1: Create StatusBadge**

Create `src/components/admin/StatusBadge.tsx`:

```tsx
const COLOURS: Record<string, { bg: string; text: string }> = {
  // Filing status
  accepted: { bg: "rgba(21, 128, 61, 0.08)", text: "var(--color-success)" },
  rejected: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
  failed: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
  polling_timeout: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
  stuck: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
  pending: { bg: "rgba(202, 138, 4, 0.08)", text: "var(--color-warning)" },
  submitted: { bg: "rgba(202, 138, 4, 0.08)", text: "var(--color-warning)" },
  outstanding: { bg: "rgba(100, 116, 139, 0.08)", text: "var(--color-text-muted)" },
  // Subscription status
  active: { bg: "rgba(21, 128, 61, 0.08)", text: "var(--color-success)" },
  cancelling: { bg: "rgba(202, 138, 4, 0.08)", text: "var(--color-warning)" },
  cancelled: { bg: "rgba(100, 116, 139, 0.08)", text: "var(--color-text-muted)" },
  past_due: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
  none: { bg: "rgba(100, 116, 139, 0.08)", text: "var(--color-text-muted)" },
  // Review status
  published: { bg: "rgba(21, 128, 61, 0.08)", text: "var(--color-success)" },
  hidden: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
};

const LABELS: Record<string, string> = {
  polling_timeout: "Polling timeout",
  past_due: "Past due",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colours = COLOURS[status] || COLOURS.outstanding;
  const displayLabel = label || LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: colours.bg, color: colours.text }}
    >
      {displayLabel}
    </span>
  );
}
```

- [ ] **Step 2: Create AdminPagination**

Create `src/components/admin/AdminPagination.tsx`:

```tsx
import Link from "next/link";

interface AdminPaginationProps {
  page: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
}

export function AdminPagination({ page, totalPages, baseUrl, searchParams = {} }: AdminPaginationProps) {
  if (totalPages <= 1) return null;

  function buildUrl(targetPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(targetPage));
    return `${baseUrl}?${params.toString()}`;
  }

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildUrl(page - 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
            style={{
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              textDecoration: "none",
            }}
          >
            Previous
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildUrl(page + 1)}
            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
            style={{
              color: "var(--color-text-secondary)",
              border: "1px solid var(--color-border)",
              textDecoration: "none",
            }}
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create AdminSearch**

Create `src/components/admin/AdminSearch.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useCallback } from "react";
import { Search } from "lucide-react";

interface AdminSearchProps {
  placeholder?: string;
}

export function AdminSearch({ placeholder = "Search..." }: AdminSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const value = e.target.value;

      timerRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set("q", value);
        } else {
          params.delete("q");
        }
        params.delete("page");
        router.push(`?${params.toString()}`);
      }, 300);
    },
    [router, searchParams],
  );

  return (
    <div className="relative">
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: "var(--color-text-muted)" }}
      />
      <input
        type="text"
        placeholder={placeholder}
        defaultValue={searchParams.get("q") || ""}
        onChange={handleChange}
        className="text-sm w-full pl-9 pr-3 py-2 rounded-lg outline-none"
        style={{
          backgroundColor: "var(--color-bg-inset)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-primary)",
        }}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create AdminFilters**

Create `src/components/admin/AdminFilters.tsx`:

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface FilterOption {
  value: string;
  label: string;
}

interface AdminFiltersProps {
  paramName: string;
  options: FilterOption[];
}

export function AdminFilters({ paramName, options }: AdminFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(paramName) || options[0]?.value || "";

  function handleClick(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === options[0]?.value) {
      params.delete(paramName);
    } else {
      params.set(paramName, value);
    }
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {options.map((opt) => {
        const isActive = current === opt.value || (!searchParams.get(paramName) && opt.value === options[0]?.value);
        return (
          <button
            key={opt.value}
            onClick={() => handleClick(opt.value)}
            className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer transition-colors duration-150"
            style={{
              backgroundColor: isActive ? "var(--color-primary-bg)" : "transparent",
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
              border: `1px solid ${isActive ? "var(--color-primary-border)" : "var(--color-border)"}`,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/
git commit -m "feat: add shared admin components (StatusBadge, Pagination, Search, Filters)"
```

---

## Task 4: Admin Layout Update

**Files:**
- Modify: `src/app/(app)/admin/layout.tsx`

- [ ] **Step 1: Update admin layout with extended nav and active state**

Replace the entire contents of `src/app/(app)/admin/layout.tsx`:

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { LayoutDashboard, Users, FileText, Mail, Star } from "lucide-react";
import { AdminNav } from "./AdminNav";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/filings", label: "Filings", icon: FileText },
  { href: "/admin/messages", label: "Messages", icon: Mail, showBadge: true },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    notFound();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    notFound();
  }

  let unreadCount = 0;
  try {
    unreadCount = await prisma.contactMessage.count({ where: { readAt: null } });
  } catch {
    // Table may not exist yet
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-8">
        <h1
          className="text-xl font-bold"
          style={{ color: "var(--color-text-primary)" }}
        >
          Admin
        </h1>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: "var(--color-primary-bg)",
            color: "var(--color-primary)",
          }}
        >
          Admin
        </span>
      </div>

      <AdminNav items={adminNavItems} unreadCount={unreadCount} />

      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create AdminNav client component for active state**

Create `src/app/(app)/admin/AdminNav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  showBadge?: boolean;
}

interface AdminNavProps {
  items: NavItem[];
  unreadCount: number;
}

export function AdminNav({ items, unreadCount }: AdminNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 mb-8 flex-wrap">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
            style={{
              color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
              backgroundColor: isActive ? "var(--color-primary-bg)" : "transparent",
              border: `1px solid ${isActive ? "var(--color-primary-border)" : "var(--color-border)"}`,
              textDecoration: "none",
            }}
          >
            <Icon size={14} />
            {item.label}
            {item.showBadge && unreadCount > 0 && (
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded-full leading-none"
                style={{
                  backgroundColor: "var(--color-warning)",
                  color: "#fff",
                  fontSize: "10px",
                }}
              >
                {unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/admin/layout.tsx src/app/\(app\)/admin/AdminNav.tsx
git commit -m "feat: update admin nav with all sections and active state"
```

---

## Task 5: Contact API — Persist Messages

**Files:**
- Modify: `src/app/api/contact/route.ts`

- [ ] **Step 1: Add ContactMessage persistence**

Replace `src/app/api/contact/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/client";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { name, email, message } = await request.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  try {
    await Promise.all([
      sendEmail({
        to: "hello@dormantfile.co.uk",
        replyTo: email,
        subject: `Contact form: ${name}`,
        text: `From: ${name} (${email})\n\n${message}`,
      }),
      prisma.contactMessage.create({
        data: { name, email, message },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/contact/route.ts
git commit -m "feat: persist contact form messages to database"
```

---

## Task 6: Dashboard Stats API + Page

**Files:**
- Create: `src/app/api/admin/stats/route.ts`
- Modify: `src/app/(app)/admin/page.tsx`

- [ ] **Step 1: Create stats API route**

Create `src/app/api/admin/stats/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAdmin, getAttentionCounts, getHealthStats, getRecentActivity } from "@/lib/admin";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [attention, health, activity] = await Promise.all([
    getAttentionCounts(),
    getHealthStats(),
    getRecentActivity(),
  ]);

  return NextResponse.json({ attention, health, activity });
}
```

- [ ] **Step 2: Replace admin page with dashboard**

Replace `src/app/(app)/admin/page.tsx`:

```tsx
import Link from "next/link";
import { getAttentionCounts, getHealthStats, getRecentActivity } from "@/lib/admin";
import {
  AlertTriangle,
  XCircle,
  CreditCard,
  MessageSquare,
  Star,
  UserPlus,
  FileText,
  Mail,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Admin",
};

export default async function AdminDashboardPage() {
  const [attention, health, activity] = await Promise.all([
    getAttentionCounts(),
    getHealthStats(),
    getRecentActivity(),
  ]);

  const attentionCards = [
    {
      label: "Stuck filings",
      count: attention.stuckFilings,
      href: "/admin/filings?status=stuck",
      icon: AlertTriangle,
      severity: "red" as const,
    },
    {
      label: "Rejected filings",
      count: attention.rejectedFilings,
      href: "/admin/filings?status=rejected",
      icon: XCircle,
      severity: "red" as const,
    },
    {
      label: "Failed payments",
      count: attention.failedPayments,
      href: "/admin/customers?filter=past_due",
      icon: CreditCard,
      severity: "yellow" as const,
    },
    {
      label: "Pending reviews",
      count: attention.pendingReviews,
      href: "/admin/reviews",
      icon: Star,
      severity: "yellow" as const,
    },
    {
      label: "Unread messages",
      count: attention.unreadMessages,
      href: "/admin/messages",
      icon: MessageSquare,
      severity: "yellow" as const,
    },
  ];

  const severityColours = {
    red: { bg: "var(--color-danger-bg)", text: "var(--color-danger)", border: "rgba(220, 38, 38, 0.2)" },
    yellow: { bg: "var(--color-warning-bg)", text: "var(--color-warning)", border: "rgba(202, 138, 4, 0.2)" },
    none: { bg: "var(--color-bg-card)", text: "var(--color-text-muted)", border: "var(--color-border)" },
  };

  const activityIcons: Record<string, typeof UserPlus> = {
    signup: UserPlus,
    filing: FileText,
    message: Mail,
  };

  return (
    <div>
      {/* Attention Cards */}
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Needs attention
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
        {attentionCards.map((card) => {
          const Icon = card.icon;
          const colours = card.count > 0 ? severityColours[card.severity] : severityColours.none;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="p-4 rounded-xl transition-colors duration-150"
              style={{
                backgroundColor: colours.bg,
                border: `1px solid ${colours.border}`,
                textDecoration: "none",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color: colours.text }} />
                <span className="text-xs font-medium" style={{ color: colours.text }}>
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: colours.text }}>
                {card.count}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Health Stats */}
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Overview
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            Active subscribers
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {health.totalSubscribers}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {health.tiers.basic} basic, {health.tiers.multi} multi, {health.tiers.agent} agent
          </p>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            Total companies
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {health.totalCompanies}
          </p>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            Filed this month
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {health.filingsThisMonth}
          </p>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            MRR
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            &pound;{health.mrr}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Recent activity
      </h2>
      {activity.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No recent activity.
        </p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          {activity.map((item, i) => {
            const Icon = activityIcons[item.type] || FileText;
            return (
              <Link
                key={`${item.type}-${i}`}
                href={item.link}
                className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hoverable-subtle"
                style={{
                  borderBottom: i < activity.length - 1 ? "1px solid var(--color-border)" : "none",
                  textDecoration: "none",
                }}
              >
                <Icon size={14} style={{ color: "var(--color-text-muted)" }} />
                <span className="text-sm flex-1" style={{ color: "var(--color-text-body)" }}>
                  {item.description}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {formatRelative(item.timestamp)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

- [ ] **Step 3: Verify build**

```bash
npx next build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/stats/ src/app/\(app\)/admin/page.tsx
git commit -m "feat: add admin dashboard with attention cards, health stats, and activity feed"
```

---

## Task 7: Customer List API + Page

**Files:**
- Create: `src/app/api/admin/customers/route.ts`
- Create: `src/app/(app)/admin/customers/page.tsx`

- [ ] **Step 1: Create customer list API route**

Create `src/app/api/admin/customers/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getCustomerList } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;

  const result = await getCustomerList({
    q: searchParams.get("q") || undefined,
    filter: searchParams.get("filter") || undefined,
    page: Number(searchParams.get("page")) || 1,
  });

  return NextResponse.json(result);
}
```

- [ ] **Step 2: Create customer list page**

Create `src/app/(app)/admin/customers/page.tsx`:

```tsx
import Link from "next/link";
import { getCustomerList } from "@/lib/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminSearch } from "@/components/admin/AdminSearch";
import { AdminFilters } from "@/components/admin/AdminFilters";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers — Admin",
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "cancelled", label: "Cancelled" },
  { value: "none", label: "No subscription" },
];

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const result = await getCustomerList({
    q: params.q,
    filter: params.filter,
    page: Number(params.page) || 1,
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>
        Customers
      </h2>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1">
          <AdminSearch placeholder="Search by name, email, company name or CRN..." />
        </div>
        <AdminFilters paramName="filter" options={FILTER_OPTIONS} />
      </div>

      {result.users.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No customers found.
        </p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          {result.users.map((user, i) => (
            <Link
              key={user.id}
              href={`/admin/customers/${user.id}`}
              className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hoverable-subtle"
              style={{
                borderBottom: i < result.users.length - 1 ? "1px solid var(--color-border)" : "none",
                textDecoration: "none",
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                  {user.name}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
                  {user.email}
                </p>
              </div>
              <StatusBadge status={user.subscriptionStatus} label={`${user.subscriptionTier !== "none" ? user.subscriptionTier + " — " : ""}${user.subscriptionStatus}`} />
              <div className="text-right hidden sm:block" style={{ minWidth: "80px" }}>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {user.companyCount} {user.companyCount === 1 ? "company" : "companies"}
                </p>
                {user.outstandingFilings > 0 && (
                  <p className="text-xs" style={{ color: "var(--color-warning)" }}>
                    {user.outstandingFilings} outstanding
                  </p>
                )}
              </div>
              <span className="text-xs hidden sm:block" style={{ color: "var(--color-text-muted)", minWidth: "60px", textAlign: "right" }}>
                {formatRelative(user.createdAt)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        baseUrl="/admin/customers"
        searchParams={params}
      />
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "Today";
  if (days === 1) return "1d ago";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/customers/route.ts src/app/\(app\)/admin/customers/
git commit -m "feat: add admin customer list with search, filters, and pagination"
```

---

## Task 8: Customer Detail API + Page

**Files:**
- Create: `src/app/api/admin/customers/[userId]/route.ts`
- Create: `src/app/(app)/admin/customers/[userId]/page.tsx`
- Create: `src/app/(app)/admin/customers/[userId]/AdminCustomerDetail.tsx`

- [ ] **Step 1: Create customer detail API route**

Create `src/app/api/admin/customers/[userId]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAdmin, getCustomerDetail } from "@/lib/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const user = await getCustomerDetail(userId);

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ user });
}
```

- [ ] **Step 2: Create customer detail page**

Create `src/app/(app)/admin/customers/[userId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getCustomerDetail } from "@/lib/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AdminCustomerDetail } from "./AdminCustomerDetail";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customer Detail — Admin",
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await getCustomerDetail(userId);

  if (!user) {
    notFound();
  }

  return (
    <div>
      <Link
        href="/admin/customers"
        className="text-xs mb-4 inline-block"
        style={{ color: "var(--color-text-muted)", textDecoration: "none" }}
      >
        &larr; Back to customers
      </Link>

      {/* Header */}
      <div
        className="p-5 rounded-xl mb-6"
        style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {user.name}
            </h2>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              {user.email}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
              Signed up {new Date(user.createdAt).toLocaleDateString("en-GB")}
              {user.remindersMuted && " · Reminders muted"}
              {user.filingAsAgent && " · Agent filing"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={user.subscriptionStatus} />
            {user.subscriptionTier !== "none" && (
              <StatusBadge status={user.subscriptionTier} label={user.subscriptionTier} />
            )}
            {user.stripeCustomerId && (
              <a
                href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: "var(--color-primary)", textDecoration: "none" }}
              >
                Stripe <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Companies + Filings (interactive) */}
      <AdminCustomerDetail
        companies={user.companies.map((c) => ({
          id: c.id,
          companyName: c.companyName,
          crn: c.companyRegistrationNumber,
          isDeleted: !!c.deletedAt,
          filings: c.filings.map((f) => ({
            id: f.id,
            filingType: f.filingType,
            periodStart: f.periodStart.toISOString(),
            periodEnd: f.periodEnd.toISOString(),
            status: f.status,
            accountsDeadline: f.accountsDeadline?.toISOString() ?? null,
            ct600Deadline: f.ct600Deadline?.toISOString() ?? null,
            submittedAt: f.submittedAt?.toISOString() ?? null,
            confirmedAt: f.confirmedAt?.toISOString() ?? null,
            hasCorrelationId: !!f.correlationId,
          })),
        }))}
        review={
          user.review
            ? {
                id: user.review.id,
                rating: user.review.rating,
                name: user.review.name,
                text: user.review.text,
                verified: user.review.verified,
                approved: user.review.approved,
                hiddenAt: user.review.hiddenAt?.toISOString() ?? null,
                createdAt: user.review.createdAt.toISOString(),
              }
            : null
        }
      />
    </div>
  );
}
```

- [ ] **Step 3: Create AdminCustomerDetail client component**

Create `src/app/(app)/admin/customers/[userId]/AdminCustomerDetail.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StarRating } from "@/components/marketing/StarRating";
import { ChevronDown, ChevronRight } from "lucide-react";

interface Filing {
  id: string;
  filingType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  accountsDeadline: string | null;
  ct600Deadline: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  hasCorrelationId: boolean;
}

interface Company {
  id: string;
  companyName: string;
  crn: string;
  isDeleted: boolean;
  filings: Filing[];
}

interface Review {
  id: string;
  rating: number;
  name: string;
  text: string | null;
  verified: boolean;
  approved: boolean;
  hiddenAt: string | null;
  createdAt: string;
}

interface AdminCustomerDetailProps {
  companies: Company[];
  review: Review | null;
}

export function AdminCustomerDetail({ companies, review }: AdminCustomerDetailProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<string | null>(null);

  function toggleCompany(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFilingAction(filingId: string, action: "retry" | "reset") {
    setLoading(filingId);
    try {
      const res = await fetch("/api/admin/filings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: filingId, action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleReviewAction(reviewId: string, action: "approve" | "hide" | "unhide") {
    setLoading(reviewId);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reviewId, action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div>
      {/* Companies */}
      <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
        Companies ({companies.length})
      </h3>
      <div className="space-y-2 mb-8">
        {companies.map((company) => {
          const isOpen = expanded.has(company.id);
          return (
            <div
              key={company.id}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: "var(--color-bg-card)",
                border: "1px solid var(--color-border)",
                opacity: company.isDeleted ? 0.5 : 1,
              }}
            >
              <button
                onClick={() => toggleCompany(company.id)}
                className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left"
                style={{ background: "none", border: "none" }}
              >
                {isOpen ? (
                  <ChevronDown size={14} style={{ color: "var(--color-text-muted)" }} />
                ) : (
                  <ChevronRight size={14} style={{ color: "var(--color-text-muted)" }} />
                )}
                <span className="text-sm font-medium flex-1" style={{ color: "var(--color-text-primary)" }}>
                  {company.companyName}
                  {company.isDeleted && " (deleted)"}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {company.crn}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {company.filings.length} filings
                </span>
              </button>

              {isOpen && company.filings.length > 0 && (
                <div style={{ borderTop: "1px solid var(--color-border)" }}>
                  {company.filings.map((filing) => {
                    const deadline = filing.filingType === "accounts" ? filing.accountsDeadline : filing.ct600Deadline;
                    const isOverdue = deadline && new Date(deadline) < new Date() && filing.status === "outstanding";
                    const canRetry = filing.status === "polling_timeout" || (filing.status === "failed" && filing.hasCorrelationId);
                    const canReset = filing.status === "rejected" || filing.status === "failed";

                    return (
                      <div
                        key={filing.id}
                        className="flex items-center gap-3 px-4 py-2.5 text-xs"
                        style={{ borderBottom: "1px solid var(--color-border)" }}
                      >
                        <StatusBadge status={filing.filingType} label={filing.filingType === "ct600" ? "CT600" : "Accounts"} />
                        <span style={{ color: "var(--color-text-body)" }}>
                          {fmt(filing.periodStart)} — {fmt(filing.periodEnd)}
                        </span>
                        <StatusBadge status={filing.status} />
                        {deadline && (
                          <span style={{ color: isOverdue ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                            Due {fmt(deadline)}
                          </span>
                        )}
                        {filing.submittedAt && (
                          <span style={{ color: "var(--color-text-muted)" }}>
                            Submitted {fmt(filing.submittedAt)}
                          </span>
                        )}
                        <div className="ml-auto flex gap-1">
                          {canRetry && (
                            <button
                              onClick={() => handleFilingAction(filing.id, "retry")}
                              disabled={loading === filing.id}
                              className="text-xs font-medium px-2 py-1 rounded cursor-pointer disabled:opacity-50"
                              style={{ color: "var(--color-primary)", border: "1px solid var(--color-primary-border)", backgroundColor: "var(--color-primary-bg)" }}
                            >
                              Retry
                            </button>
                          )}
                          {canReset && (
                            <button
                              onClick={() => handleFilingAction(filing.id, "reset")}
                              disabled={loading === filing.id}
                              className="text-xs font-medium px-2 py-1 rounded cursor-pointer disabled:opacity-50"
                              style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", backgroundColor: "transparent" }}
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Review */}
      {review && (
        <>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--color-text-primary)" }}>
            Review
          </h3>
          <div
            className="p-4 rounded-xl mb-8"
            style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <StarRating rating={review.rating} size={14} />
              <StatusBadge status={review.hiddenAt ? "hidden" : review.approved ? "published" : "pending"} />
            </div>
            {review.text && (
              <p className="text-sm mb-2" style={{ color: "var(--color-text-body)" }}>{review.text}</p>
            )}
            <div className="flex gap-2 mt-3">
              {!review.approved && !review.hiddenAt && (
                <button
                  onClick={() => handleReviewAction(review.id, "approve")}
                  disabled={loading === review.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "rgba(21, 128, 61, 0.08)", color: "var(--color-success)", border: "1px solid rgba(21, 128, 61, 0.2)" }}
                >
                  Approve
                </button>
              )}
              {!review.hiddenAt ? (
                <button
                  onClick={() => handleReviewAction(review.id, "hide")}
                  disabled={loading === review.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "rgba(220, 38, 38, 0.08)", color: "var(--color-danger)", border: "1px solid rgba(220, 38, 38, 0.2)" }}
                >
                  Hide
                </button>
              ) : (
                <button
                  onClick={() => handleReviewAction(review.id, "unhide")}
                  disabled={loading === review.id}
                  className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50"
                  style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", backgroundColor: "transparent" }}
                >
                  Unhide
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/admin/customers/ src/app/\(app\)/admin/customers/
git commit -m "feat: add admin customer detail with filing actions and review management"
```

---

## Task 9: Filings Monitor API + Page

**Files:**
- Create: `src/app/api/admin/filings/route.ts`
- Create: `src/app/api/admin/filings/bulk/route.ts`
- Create: `src/app/(app)/admin/filings/page.tsx`
- Create: `src/app/(app)/admin/filings/AdminFilingsTable.tsx`

- [ ] **Step 1: Create filings API route (GET + PATCH)**

Create `src/app/api/admin/filings/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getFilingsList } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;

  const result = await getFilingsList({
    status: searchParams.get("status") || undefined,
    type: searchParams.get("type") || undefined,
    deadline: searchParams.get("deadline") || undefined,
    page: Number(searchParams.get("page")) || 1,
    sort: searchParams.get("sort") || undefined,
    order: (searchParams.get("order") as "asc" | "desc") || undefined,
  });

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await req.json();

  if (!id || !["retry", "reset"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const filing = await prisma.filing.findUnique({ where: { id } });
  if (!filing) {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }

  if (action === "retry") {
    // Set back to submitted so the cron picks it up on next run
    if (filing.status !== "polling_timeout" && filing.status !== "failed") {
      return NextResponse.json({ error: "Can only retry polling_timeout or failed filings" }, { status: 400 });
    }
    await prisma.filing.update({
      where: { id },
      data: { status: "submitted", responsePayload: null },
    });
  } else if (action === "reset") {
    if (filing.status !== "rejected" && filing.status !== "failed") {
      return NextResponse.json({ error: "Can only reset rejected or failed filings" }, { status: 400 });
    }
    await prisma.filing.update({
      where: { id },
      data: {
        status: "outstanding",
        correlationId: null,
        responsePayload: null,
        irmark: null,
        pollInterval: null,
        submittedAt: null,
        confirmedAt: null,
      },
    });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Create bulk retry API route**

Create `src/app/api/admin/filings/bulk/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No filing IDs provided" }, { status: 400 });
  }

  const result = await prisma.filing.updateMany({
    where: {
      id: { in: ids },
      status: "polling_timeout",
    },
    data: { status: "submitted", responsePayload: null },
  });

  return NextResponse.json({ updated: result.count });
}
```

- [ ] **Step 3: Create filings monitor page**

Create `src/app/(app)/admin/filings/page.tsx`:

```tsx
import { getFilingsList } from "@/lib/admin";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminFilters } from "@/components/admin/AdminFilters";
import { AdminFilingsTable } from "./AdminFilingsTable";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Filings — Admin",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "outstanding", label: "Outstanding" },
  { value: "pending", label: "Pending" },
  { value: "submitted", label: "Submitted" },
  { value: "polling_timeout", label: "Polling timeout" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "failed", label: "Failed" },
  { value: "stuck", label: "Stuck" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "accounts", label: "Accounts" },
  { value: "ct600", label: "CT600" },
];

const DEADLINE_OPTIONS = [
  { value: "all", label: "All deadlines" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due within 30 days" },
];

export default async function AdminFilingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const result = await getFilingsList({
    status: params.status,
    type: params.type,
    deadline: params.deadline,
    page: Number(params.page) || 1,
    sort: params.sort,
    order: params.order as "asc" | "desc",
  });

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>
        Filings
      </h2>

      <div className="flex flex-col gap-3 mb-6">
        <AdminFilters paramName="status" options={STATUS_OPTIONS} />
        <div className="flex gap-3 flex-wrap">
          <AdminFilters paramName="type" options={TYPE_OPTIONS} />
          <AdminFilters paramName="deadline" options={DEADLINE_OPTIONS} />
        </div>
      </div>

      <AdminFilingsTable filings={result.filings} />

      <AdminPagination
        page={result.page}
        totalPages={result.totalPages}
        baseUrl="/admin/filings"
        searchParams={params}
      />
    </div>
  );
}
```

- [ ] **Step 4: Create AdminFilingsTable client component**

Create `src/app/(app)/admin/filings/AdminFilingsTable.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/StatusBadge";

interface Filing {
  id: string;
  filingType: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  accountsDeadline: string | null;
  ct600Deadline: string | null;
  submittedAt: string | null;
  confirmedAt: string | null;
  correlationId: string | null;
  companyName: string;
  crn: string;
  userId: string;
  userEmail: string;
}

export function AdminFilingsTable({ filings }: { filings: Filing[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const pollingTimeoutFilings = filings.filter((f) => f.status === "polling_timeout");
  const hasSelectable = pollingTimeoutFilings.length > 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === pollingTimeoutFilings.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pollingTimeoutFilings.map((f) => f.id)));
    }
  }

  async function handleAction(id: string, action: "retry" | "reset") {
    setLoading(id);
    try {
      const res = await fetch("/api/admin/filings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (res.ok) router.refresh();
    } finally {
      setLoading(null);
    }
  }

  async function handleBulkRetry() {
    if (selected.size === 0) return;
    setLoading("bulk");
    try {
      const res = await fetch("/api/admin/filings/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      if (res.ok) {
        setSelected(new Set());
        router.refresh();
      }
    } finally {
      setLoading(null);
    }
  }

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  if (filings.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        No filings match the current filters.
      </p>
    );
  }

  return (
    <div>
      {hasSelectable && selected.size > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
            {selected.size} selected
          </span>
          <button
            onClick={handleBulkRetry}
            disabled={loading === "bulk"}
            className="text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50"
            style={{ color: "var(--color-primary)", border: "1px solid var(--color-primary-border)", backgroundColor: "var(--color-primary-bg)" }}
          >
            Retry selected
          </button>
        </div>
      )}

      <div
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
      >
        {/* Header row */}
        <div
          className="flex items-center gap-3 px-4 py-2 text-xs font-medium"
          style={{ color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}
        >
          {hasSelectable && (
            <input
              type="checkbox"
              checked={selected.size === pollingTimeoutFilings.length && pollingTimeoutFilings.length > 0}
              onChange={toggleAll}
              className="cursor-pointer"
            />
          )}
          <span className="flex-1">Company</span>
          <span style={{ width: "80px" }}>Type</span>
          <span style={{ width: "180px" }}>Period</span>
          <span style={{ width: "90px" }}>Status</span>
          <span style={{ width: "90px" }}>Deadline</span>
          <span style={{ width: "90px" }}>Submitted</span>
          <span style={{ width: "100px" }}></span>
        </div>

        {filings.map((filing, i) => {
          const deadline = filing.filingType === "accounts" ? filing.accountsDeadline : filing.ct600Deadline;
          const isOverdue = deadline && new Date(deadline) < new Date() && filing.status === "outstanding";
          const canRetry = filing.status === "polling_timeout" || (filing.status === "failed" && filing.correlationId);
          const canReset = filing.status === "rejected" || filing.status === "failed";
          const isSelectable = filing.status === "polling_timeout";

          return (
            <div
              key={filing.id}
              className="flex items-center gap-3 px-4 py-2.5 text-xs"
              style={{ borderBottom: i < filings.length - 1 ? "1px solid var(--color-border)" : "none" }}
            >
              {hasSelectable && (
                <input
                  type="checkbox"
                  checked={selected.has(filing.id)}
                  onChange={() => toggleSelect(filing.id)}
                  disabled={!isSelectable}
                  className="cursor-pointer disabled:opacity-30"
                />
              )}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/admin/customers/${filing.userId}`}
                  className="font-medium truncate block"
                  style={{ color: "var(--color-primary)", textDecoration: "none" }}
                >
                  {filing.companyName}
                </Link>
                <span style={{ color: "var(--color-text-muted)" }}>{filing.crn} · {filing.userEmail}</span>
              </div>
              <span style={{ width: "80px" }}>
                <StatusBadge status={filing.filingType} label={filing.filingType === "ct600" ? "CT600" : "Accounts"} />
              </span>
              <span style={{ width: "180px", color: "var(--color-text-body)" }}>
                {fmt(filing.periodStart)} — {fmt(filing.periodEnd)}
              </span>
              <span style={{ width: "90px" }}>
                <StatusBadge status={filing.status} />
              </span>
              <span style={{ width: "90px", color: isOverdue ? "var(--color-danger)" : "var(--color-text-muted)" }}>
                {deadline ? fmt(deadline) : "—"}
              </span>
              <span style={{ width: "90px", color: "var(--color-text-muted)" }}>
                {filing.submittedAt ? fmt(filing.submittedAt) : "—"}
              </span>
              <div className="flex gap-1" style={{ width: "100px" }}>
                {canRetry && (
                  <button
                    onClick={() => handleAction(filing.id, "retry")}
                    disabled={loading === filing.id}
                    className="text-xs font-medium px-2 py-1 rounded cursor-pointer disabled:opacity-50"
                    style={{ color: "var(--color-primary)", border: "1px solid var(--color-primary-border)", backgroundColor: "var(--color-primary-bg)" }}
                  >
                    Retry
                  </button>
                )}
                {canReset && (
                  <button
                    onClick={() => handleAction(filing.id, "reset")}
                    disabled={loading === filing.id}
                    className="text-xs font-medium px-2 py-1 rounded cursor-pointer disabled:opacity-50"
                    style={{ color: "var(--color-text-secondary)", border: "1px solid var(--color-border)", backgroundColor: "transparent" }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/filings/ src/app/\(app\)/admin/filings/
git commit -m "feat: add filings monitor with filters, row actions, and bulk retry"
```

---

## Task 10: Messages API + Page

**Files:**
- Create: `src/app/api/admin/messages/route.ts`
- Create: `src/app/api/admin/messages/[id]/route.ts`
- Create: `src/app/(app)/admin/messages/page.tsx`
- Create: `src/app/(app)/admin/messages/AdminMessageList.tsx`

- [ ] **Step 1: Create messages list API route**

Create `src/app/api/admin/messages/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAdmin, getMessagesList } from "@/lib/admin";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const messages = await getMessagesList();
  return NextResponse.json({ messages });
}
```

- [ ] **Step 2: Create mark-as-read API route**

Create `src/app/api/admin/messages/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.contactMessage.update({
    where: { id },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Create messages page**

Create `src/app/(app)/admin/messages/page.tsx`:

```tsx
import { getMessagesList } from "@/lib/admin";
import { AdminMessageList } from "./AdminMessageList";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Messages — Admin",
};

export default async function AdminMessagesPage() {
  const messages = await getMessagesList();

  return (
    <div>
      <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--color-text-primary)" }}>
        Messages
      </h2>

      {messages.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No messages yet.
        </p>
      ) : (
        <AdminMessageList
          messages={messages.map((m) => ({
            id: m.id,
            name: m.name,
            email: m.email,
            message: m.message,
            readAt: m.readAt?.toISOString() ?? null,
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create AdminMessageList client component**

Create `src/app/(app)/admin/messages/AdminMessageList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, ExternalLink } from "lucide-react";

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export function AdminMessageList({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function toggleMessage(msg: Message) {
    const next = new Set(expanded);
    if (next.has(msg.id)) {
      next.delete(msg.id);
    } else {
      next.add(msg.id);
      // Mark as read
      if (!msg.readAt) {
        await fetch(`/api/admin/messages/${msg.id}`, { method: "PATCH" });
        router.refresh();
      }
    }
    setExpanded(next);
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
    >
      {messages.map((msg, i) => {
        const isOpen = expanded.has(msg.id);
        return (
          <div
            key={msg.id}
            style={{ borderBottom: i < messages.length - 1 ? "1px solid var(--color-border)" : "none" }}
          >
            <button
              onClick={() => toggleMessage(msg)}
              className="w-full flex items-center gap-3 px-4 py-3 cursor-pointer text-left transition-colors duration-150"
              style={{ background: "none", border: "none" }}
            >
              {!msg.readAt ? (
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "var(--color-primary)" }}
                />
              ) : (
                <span className="w-2 flex-shrink-0" />
              )}
              <Mail size={14} style={{ color: "var(--color-text-muted)", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <span
                  className="text-sm font-medium"
                  style={{ color: msg.readAt ? "var(--color-text-secondary)" : "var(--color-text-primary)" }}
                >
                  {msg.name}
                </span>
                <span className="text-xs ml-2" style={{ color: "var(--color-text-muted)" }}>
                  {msg.email}
                </span>
              </div>
              {!isOpen && (
                <span
                  className="text-xs truncate hidden sm:block"
                  style={{ color: "var(--color-text-muted)", maxWidth: "200px" }}
                >
                  {msg.message.length > 100 ? `${msg.message.slice(0, 100)}\u2026` : msg.message}
                </span>
              )}
              <span className="text-xs flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>
                {formatRelative(msg.createdAt)}
              </span>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 pl-12">
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap mb-3"
                  style={{ color: "var(--color-text-body)" }}
                >
                  {msg.message}
                </p>
                <a
                  href={`mailto:${msg.email}?subject=Re: Your message to DormantFile`}
                  className="inline-flex items-center gap-1 text-xs font-medium"
                  style={{ color: "var(--color-primary)", textDecoration: "none" }}
                >
                  Reply <ExternalLink size={12} />
                </a>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/messages/ src/app/\(app\)/admin/messages/
git commit -m "feat: add admin messages inbox with read tracking and reply links"
```

---

## Task 11: Update Reviews Table to Use Shared StatusBadge

**Files:**
- Modify: `src/app/(app)/admin/reviews/AdminReviewsTable.tsx`

- [ ] **Step 1: Replace inline ReviewStatus with StatusBadge**

In `src/app/(app)/admin/reviews/AdminReviewsTable.tsx`:

Remove the entire inline `ReviewStatus` function (lines 22-48) and the import of `CheckCircle` from lucide-react.

Add import:
```typescript
import { StatusBadge } from "@/components/admin/StatusBadge";
```

Replace all `<ReviewStatus review={review} />` usages with:
```tsx
<StatusBadge
  status={review.hiddenAt ? "hidden" : review.approved ? "published" : "pending"}
/>
```

Keep the `CheckCircle` import only if it's still used for the "Verified" badge in the review metadata. If so, add it back; check the file — `CheckCircle` is used on line 101 for verified reviews, so keep that import.

- [ ] **Step 2: Verify build**

```bash
npx next build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/admin/reviews/AdminReviewsTable.tsx
git commit -m "refactor: use shared StatusBadge in admin reviews table"
```

---

## Task 12: Final Verification

- [ ] **Step 1: Run the build**

```bash
npx next build
```

Expected: Clean build, no type errors.

- [ ] **Step 2: Run existing tests**

```bash
npm test
```

Expected: All existing tests pass. No regressions.

- [ ] **Step 3: Manual smoke test**

Start dev server and verify:

1. `/admin` — Dashboard shows attention cards (all zeros initially), health stats, and empty activity feed
2. `/admin/customers` — Customer list loads with search, filters, and pagination
3. `/admin/customers/[userId]` — Customer detail shows companies (expandable), filings with action buttons, and review if present
4. `/admin/filings` — Filings monitor loads with status/type/deadline filters, pagination, row actions, and bulk select
5. `/admin/messages` — Messages page loads (empty initially), expanding marks as read
6. `/admin/reviews` — Existing reviews page still works with shared StatusBadge
7. Contact form submission appears in both email and `/admin/messages`
8. Nav highlights the active section, messages badge shows unread count
9. Dark mode renders correctly for all new pages

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete admin panel with dashboard, customers, filings, and messages"
```
