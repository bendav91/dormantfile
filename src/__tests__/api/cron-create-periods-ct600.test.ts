import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    company: { findMany: vi.fn() },
    filing: { upsert: vi.fn() },
  },
}));

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/cron/create-periods/route";
import { calculateCT600Deadline } from "@/lib/utils";
import { NextRequest } from "next/server";

function makeRequest(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/create-periods", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

// A fully-elapsed accounts period (ended in the past relative to today 2026-05-15)
const ACCOUNTS_START = new Date("2024-02-07T00:00:00.000Z");
const ACCOUNTS_END = new Date("2025-02-28T00:00:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.mocked(prisma.filing.upsert).mockResolvedValue({} as never);
});

/** Extract the ct600 upsert create payloads for a given company id. */
function ct600Creates(companyId: string) {
  return vi
    .mocked(prisma.filing.upsert)
    .mock.calls.map((c) => c[0])
    .filter(
      (a) =>
        (a as { create: { companyId: string; filingType: string } }).create
          .companyId === companyId &&
        (a as { create: { filingType: string } }).create.filingType ===
          "ct600",
    )
    .map((a) => (a as { create: Record<string, unknown> }).create);
}

describe("GET /api/cron/create-periods — Loop 2 CT600 CTAPs", () => {
  it("returns 401 without a valid bearer token", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([]);
    const res = await GET(makeRequest("wrong"));
    expect(res.status).toBe(401);
  });

  it("(a) produces split CTAPs with the shared accounts-period deadline", async () => {
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

    const creates = ct600Creates("clean-co");
    const sharedDeadline = calculateCT600Deadline(ACCOUNTS_END);

    expect(creates).toHaveLength(2);

    // First CTAP: 2024-02-07 -> 2025-02-06
    expect((creates[0].periodStart as Date).toISOString()).toBe(
      new Date("2024-02-07T00:00:00.000Z").toISOString(),
    );
    expect((creates[0].periodEnd as Date).toISOString()).toBe(
      new Date("2025-02-06T00:00:00.000Z").toISOString(),
    );
    // Second CTAP: 2025-02-07 -> 2025-02-28 (clamped to accounts end)
    expect((creates[1].periodStart as Date).toISOString()).toBe(
      new Date("2025-02-07T00:00:00.000Z").toISOString(),
    );
    expect((creates[1].periodEnd as Date).toISOString()).toBe(
      new Date("2025-02-28T00:00:00.000Z").toISOString(),
    );

    for (const row of creates) {
      expect(row.companyId).toBe("clean-co");
      expect(row.filingType).toBe("ct600");
      expect(row.status).toBe("outstanding");
      expect(row.ctapUserEdited).toBe(false);
      expect((row.deadline as Date).toISOString()).toBe(
        sharedDeadline.toISOString(),
      );
      expect((row.startDate as Date).toISOString()).toBe(
        (row.periodStart as Date).toISOString(),
      );
      expect((row.endDate as Date).toISOString()).toBe(
        (row.periodEnd as Date).toISOString(),
      );
    }
  });

  it("(b) does NOT resurrect CT600s for a span containing a ctapUserEdited CT600, while (c) a different unprotected span still generates in the same run", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([
      // Protected company: existing user-edited CT600 inside the span
      {
        id: "protected-co",
        registeredForCorpTax: true,
        ctapStartDate: null,
        filings: [
          {
            filingType: "ct600",
            periodStart: new Date("2024-02-07T00:00:00.000Z"),
            periodEnd: new Date("2025-02-28T00:00:00.000Z"),
            startDate: new Date("2024-02-07T00:00:00.000Z"),
            endDate: new Date("2025-02-28T00:00:00.000Z"),
            status: "outstanding",
            ctapUserEdited: true,
          },
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
      // Unprotected company processed in the SAME run — must still generate
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

    // (b) resurrection prevented
    expect(ct600Creates("protected-co")).toHaveLength(0);
    // (c) loop not halted — clean company still generated
    expect(ct600Creates("clean-co")).toHaveLength(2);
  });
});
