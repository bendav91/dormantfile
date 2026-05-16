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

// A fully-elapsed accounts period (ended in the past relative to today 2026-05-16)
const ACCOUNTS_END = new Date("2025-02-28T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.mocked(prisma.filing.upsert).mockResolvedValue({} as never);
});

describe("GET /api/cron/create-periods — accounts-only, Loop 2 removed", () => {
  it("returns 401 without a valid bearer token", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);
    const res = await GET(makeRequest("wrong"));
    expect(res.status).toBe(401);
  });

  it("does NOT create any ct600 rows; Loop 1 still creates the accounts period", async () => {
    // Mock matches the route's select shape: company { id, filings: { periodEnd } }.
    // Latest filing ended 2025-02-28 — Loop 1 will upsert one accounts period
    // (2025-03-01 → 2026-02-28) because that span has fully elapsed by 2026-05-16.
    // Loop 2 (CT600) was removed, so no ct600 upsert should appear.
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      {
        id: "clean-co",
        filings: [{ periodEnd: ACCOUNTS_END }],
      },
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const upsertCalls = (prisma.filing.upsert as unknown as ReturnType<typeof vi.fn>).mock.calls;

    // Explicit positive/negative assertions — neither can pass vacuously
    expect(upsertCalls.some(([a]) => a.create.filingType === "ct600")).toBe(false);
    expect(upsertCalls.some(([a]) => a.create.filingType === "accounts")).toBe(true);

    // Per-call guard: every upsert that did fire must be accounts-only
    for (const [arg] of upsertCalls) {
      expect(arg.create.filingType).toBe("accounts");
      expect(arg.where.companyId_periodStart_periodEnd_filingType.filingType).toBe("accounts");
    }
  });

  it("accounts upserts are still created for elapsed periods (Loop 1 intact)", async () => {
    // Company whose latest filing ended well over a year ago — Loop 1 will
    // create multiple accounts periods. Also confirms Loop 2 produces no ct600 rows.
    const OLD_END = new Date("2023-12-31T00:00:00.000Z");
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      {
        id: "co-with-gap",
        filings: [{ periodEnd: OLD_END }],
      },
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const upsertCalls = (prisma.filing.upsert as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(upsertCalls.length).toBeGreaterThan(0); // accounts still created
    expect(upsertCalls.some(([a]) => a.create.filingType === "ct600")).toBe(false);
    for (const [arg] of upsertCalls) {
      expect(arg.create.filingType).toBe("accounts");
      expect(arg.where.companyId_periodStart_periodEnd_filingType.filingType).toBe("accounts");
    }
  });
});
