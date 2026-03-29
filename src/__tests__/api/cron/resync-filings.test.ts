import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    company: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/companies-house/resync", () => ({
  resyncFromCompaniesHouse: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { resyncFromCompaniesHouse } from "@/lib/companies-house/resync";
import { GET } from "@/app/api/cron/resync-filings/route";
import { NextRequest } from "next/server";

function makeRequest(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/resync-filings", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
});

describe("GET /api/cron/resync-filings", () => {
  it("returns 401 without valid bearer token", async () => {
    const res = await GET(makeRequest("wrong-secret"));
    expect(res.status).toBe(401);
  });

  it("returns 401 with no authorization header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("processes all eligible companies and returns summary", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { id: "comp-1" },
      { id: "comp-2" },
      { id: "comp-3" },
    ] as never);

    vi.mocked(resyncFromCompaniesHouse)
      .mockResolvedValueOnce({ newFilingsCount: 2 })
      .mockResolvedValueOnce({ newFilingsCount: 0 })
      .mockResolvedValueOnce({ newFilingsCount: 1 });

    const res = await GET(makeRequest("test-secret"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      companiesChecked: 3,
      newFilingsDetected: 3,
      errors: 0,
    });
    expect(resyncFromCompaniesHouse).toHaveBeenCalledTimes(3);
  });

  it("continues processing when one company fails", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      { id: "comp-1" },
      { id: "comp-2" },
    ] as never);

    vi.mocked(resyncFromCompaniesHouse)
      .mockResolvedValueOnce({ newFilingsCount: 0, error: "CH API returned 500" })
      .mockResolvedValueOnce({ newFilingsCount: 1 });

    const res = await GET(makeRequest("test-secret"));
    const data = await res.json();

    expect(data).toEqual({
      companiesChecked: 2,
      newFilingsDetected: 1,
      errors: 1,
    });
    expect(resyncFromCompaniesHouse).toHaveBeenCalledTimes(2);
  });

  it("handles zero eligible companies", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);

    const res = await GET(makeRequest("test-secret"));
    const data = await res.json();

    expect(data).toEqual({
      companiesChecked: 0,
      newFilingsDetected: 0,
      errors: 0,
    });
    expect(resyncFromCompaniesHouse).not.toHaveBeenCalled();
  });

  it("queries only non-deleted companies with active subscriptions", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);

    await GET(makeRequest("test-secret"));

    expect(prisma.company.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        user: {
          subscriptionStatus: { in: ["active", "cancelling"] },
        },
      },
      select: { id: true },
    });
  });
});
