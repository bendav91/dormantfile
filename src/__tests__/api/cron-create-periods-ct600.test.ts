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

  it("(d) anchors the next CTAP from the latest existing CT600 regardless of findMany order", async () => {
    // Two non-protected (outstanding / ctapUserEdited:false) CT600s exist.
    // The chain anchor must be the LATEST by end date (2024-11-30), not the
    // earliest (2024-06-30). Supply them in ASCENDING order so a naive
    // `existingCt600s[0]` would pick the WRONG (earliest) row and start the
    // next CTAP at 2024-07-01 instead of the correct 2024-12-01.
    const EARLIEST_END = new Date("2024-06-30T00:00:00.000Z");
    const LATEST_END = new Date("2024-11-30T00:00:00.000Z");

    vi.mocked(prisma.company.findMany).mockResolvedValue([
      {
        id: "anchor-co",
        registeredForCorpTax: true,
        ctapStartDate: null,
        filings: [
          // Ascending (earliest first) — [0] would be the WRONG anchor.
          {
            filingType: "ct600",
            periodStart: new Date("2024-02-07T00:00:00.000Z"),
            periodEnd: EARLIEST_END,
            startDate: new Date("2024-02-07T00:00:00.000Z"),
            endDate: EARLIEST_END,
            status: "outstanding",
            ctapUserEdited: false,
          },
          {
            filingType: "ct600",
            periodStart: new Date("2024-07-01T00:00:00.000Z"),
            periodEnd: LATEST_END,
            startDate: new Date("2024-07-01T00:00:00.000Z"),
            endDate: LATEST_END,
            status: "outstanding",
            ctapUserEdited: false,
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
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);

    const creates = ct600Creates("anchor-co");
    expect(creates.length).toBeGreaterThan(0);

    // First generated CTAP must start the day AFTER the LATEST CT600 end
    // (2024-11-30 -> 2024-12-01), NOT the day after the earliest (2024-07-01).
    expect((creates[0].periodStart as Date).toISOString()).toBe(
      new Date("2024-12-01T00:00:00.000Z").toISOString(),
    );
    expect((creates[0].periodStart as Date).toISOString()).not.toBe(
      new Date("2024-07-01T00:00:00.000Z").toISOString(),
    );
    // Span ends 2025-02-28; single clamped CTAP from the correct anchor.
    expect((creates[0].periodEnd as Date).toISOString()).toBe(
      ACCOUNTS_END.toISOString(),
    );
  });
});
