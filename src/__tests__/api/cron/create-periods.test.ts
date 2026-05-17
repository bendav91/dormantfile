import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    company: { findMany: vi.fn() },
    filing: { upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/cron/create-periods/route";
import { NextRequest } from "next/server";

function makeRequest(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/create-periods", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

// A filing ending here means EXACTLY ONE subsequent annual period has fully
// elapsed relative to "today" (2026-05-17): next is 2025-05-01 → 2026-04-30
// (elapsed), and the one after (→ 2027-04-30) has not, so Loop 1 breaks after
// a single upsert. Keeping it to one period isolates the behaviour under test
// (ungating) from the period-walk arithmetic.
const ELAPSED_END = new Date("2025-04-30T00:00:00.000Z");

/**
 * Faithful upsert mock: keyed on the compound unique
 * (companyId, periodStart, periodEnd, filingType) with a no-op `update: {}`,
 * exactly like the route + Prisma constraint. Re-running the cron never
 * produces a duplicate logical row for the same key.
 */
function makeIdempotentUpsertStore() {
  const rows = new Map<string, Record<string, unknown>>();
  return {
    rows,
    impl: async (arg: {
      where: {
        companyId_periodStart_periodEnd_filingType: {
          companyId: string;
          periodStart: Date;
          periodEnd: Date;
          filingType: string;
        };
      };
      create: Record<string, unknown>;
      update: Record<string, unknown>;
    }) => {
      const k = arg.where.companyId_periodStart_periodEnd_filingType;
      const key = `${k.companyId}|${k.periodStart.toISOString()}|${k.periodEnd.toISOString()}|${k.filingType}`;
      if (!rows.has(key)) {
        rows.set(key, { ...arg.create });
      } else {
        rows.set(key, { ...rows.get(key), ...arg.update });
      }
      return rows.get(key) as never;
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
});

describe("GET /api/cron/create-periods — obligations tracked for ALL companies", () => {
  it("materialises an outstanding accounts Filing for lapsed users (past_due, cancelled, none)", async () => {
    // Three non-deleted companies, one per lapsed subscription status, each
    // with a fully-elapsed accounting period and no Filing for the next one.
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { id: "co-past-due", filings: [{ periodEnd: ELAPSED_END }] },
      { id: "co-cancelled", filings: [{ periodEnd: ELAPSED_END }] },
      { id: "co-none", filings: [{ periodEnd: ELAPSED_END }] },
    ] as never);

    const store = makeIdempotentUpsertStore();
    vi.mocked(prisma.filing.upsert).mockImplementation(store.impl as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const upsertCalls = (
      prisma.filing.upsert as unknown as ReturnType<typeof vi.fn>
    ).mock.calls;

    // Each lapsed company got exactly one outstanding accounts Filing upserted.
    for (const companyId of ["co-past-due", "co-cancelled", "co-none"]) {
      const callsForCo = upsertCalls.filter(
        ([a]) =>
          a.where.companyId_periodStart_periodEnd_filingType.companyId ===
          companyId,
      );
      expect(callsForCo.length).toBe(1);
      const [arg] = callsForCo[0];
      expect(arg.create.filingType).toBe("accounts");
      expect(arg.create.status).toBe("outstanding");
      expect(
        arg.where.companyId_periodStart_periodEnd_filingType.filingType,
      ).toBe("accounts");
    }
  });

  it("does NOT filter companies by subscription status in the query", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);

    await GET(makeRequest("test-secret"));

    const [whereArg] = (
      prisma.company.findMany as unknown as ReturnType<typeof vi.fn>
    ).mock.calls[0];

    expect(whereArg.where.deletedAt).toBeNull();
    // Subscription gating must NOT happen here — it lives at submit time.
    expect(whereArg.where.user).toBeUndefined();
  });

  it("is idempotent across runs: two cron passes yield exactly ONE Filing for a lapsed company's period", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { id: "co-past-due", filings: [{ periodEnd: ELAPSED_END }] },
    ] as never);

    const store = makeIdempotentUpsertStore();
    vi.mocked(prisma.filing.upsert).mockImplementation(store.impl as never);

    const res1 = await GET(makeRequest("test-secret"));
    expect(res1.status).toBe(200);
    const res2 = await GET(makeRequest("test-secret"));
    expect(res2.status).toBe(200);

    // Upsert was attempted on both runs (cron widened to all companies)...
    const upsertCalls = (
      prisma.filing.upsert as unknown as ReturnType<typeof vi.fn>
    ).mock.calls;
    expect(upsertCalls.length).toBe(2);

    // ...but the compound-unique + `update: {}` collapses them to ONE row.
    const accountsRows = [...store.rows.values()].filter(
      (r) => r.filingType === "accounts" && r.companyId === "co-past-due",
    );
    expect(accountsRows.length).toBe(1);
    expect(accountsRows[0].status).toBe("outstanding");
  });

  it("returns 401 without a valid bearer token", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);
    const res = await GET(makeRequest("wrong"));
    expect(res.status).toBe(401);
    expect(prisma.company.findMany).not.toHaveBeenCalled();
  });
});
