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
const ACCOUNTS_START = new Date("2024-02-07T00:00:00.000Z");
const ACCOUNTS_END = new Date("2025-02-28T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.mocked(prisma.filing.upsert).mockResolvedValue({} as never);
});

describe("GET /api/cron/create-periods — Loop 2 CT600 CTAPs (removed)", () => {
  it("returns 401 without a valid bearer token", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);
    const res = await GET(makeRequest("wrong"));
    expect(res.status).toBe(401);
  });

  it("does NOT create any ct600 rows for a CT-registered company with elapsed accounts spans", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      {
        id: "clean-co",
        registeredForCorpTax: true,
        ctapStartDate: null,
        filings: [
          {
            filingType: "accounts",
            periodStart: ACCOUNTS_START,
            periodEnd: ACCOUNTS_END,
            startDate: ACCOUNTS_START,
            endDate: ACCOUNTS_END,
            status: "outstanding",
            ctapUserEdited: false,
          },
        ],
      },
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const upsertCalls = (prisma.filing.upsert as unknown as ReturnType<typeof vi.fn>).mock.calls;
    // Accounts loop still fires (period already exists so no new accounts period
    // is created — but if it did, it must only be "accounts" type)
    for (const [arg] of upsertCalls) {
      expect(arg.create.filingType).toBe("accounts");
      expect(arg.where.companyId_periodStart_periodEnd_filingType.filingType).toBe("accounts");
    }
  });

  it("accounts upserts are still created for elapsed periods (Loop 1 intact)", async () => {
    // Give a company whose latest filing ended more than a year ago so Loop 1
    // will create a new accounts period. Also mark registeredForCorpTax:true
    // to confirm Loop 2 does NOT produce ct600 rows.
    const OLD_END = new Date("2023-12-31T00:00:00.000Z");
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      {
        id: "co-with-gap",
        registeredForCorpTax: true,
        ctapStartDate: null,
        filings: [
          {
            filingType: "accounts",
            periodStart: new Date("2023-01-01T00:00:00.000Z"),
            periodEnd: OLD_END,
            startDate: new Date("2023-01-01T00:00:00.000Z"),
            endDate: OLD_END,
            status: "outstanding",
            ctapUserEdited: false,
          },
        ],
      },
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const upsertCalls = (prisma.filing.upsert as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(upsertCalls.length).toBeGreaterThan(0); // accounts still created
    for (const [arg] of upsertCalls) {
      expect(arg.create.filingType).toBe("accounts");
      expect(arg.where.companyId_periodStart_periodEnd_filingType.filingType).toBe("accounts");
    }
  });
});
