import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    company: { findFirst: vi.fn(), update: vi.fn() },
    filing: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { PATCH } from "@/app/api/company/update/route";
import { calculateCT600Deadline } from "@/lib/utils";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/company/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ACCOUNTS_START = new Date("2024-02-07T00:00:00.000Z");
const ACCOUNTS_END = new Date("2025-02-28T00:00:00.000Z");

const mockCompany = {
  id: "comp-1",
  userId: "user-1",
  deletedAt: null,
  registeredForCorpTax: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(prisma.company.findFirst).mockResolvedValue(mockCompany as never);
  vi.mocked(prisma.company.update).mockResolvedValue({} as never);
  vi.mocked(prisma.filing.createMany).mockResolvedValue({ count: 0 } as never);
  // $transaction in this route is given an array of prisma promises
  vi.mocked(prisma.$transaction).mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: unknown) => unknown)(prisma);
  });
});

describe("PATCH /api/company/update — enable Corp Tax CT600 generation", () => {
  it("creates two split CTAP rows sharing the accounts-period deadline", async () => {
    vi.mocked(prisma.filing.findMany).mockImplementation(
      (async (args: { where: { filingType: string } }) => {
        if (args.where.filingType === "accounts") {
          return [
            {
              periodStart: ACCOUNTS_START,
              periodEnd: ACCOUNTS_END,
              suppressedAt: null,
            },
          ];
        }
        // existing ct600 filings
        return [];
      }) as never,
    );

    const res = await PATCH(
      makeRequest({
        companyId: "comp-1",
        registeredForCorpTax: true,
        uniqueTaxReference: "1234567890",
      }),
    );

    expect(res.status).toBe(200);

    expect(prisma.filing.createMany).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(prisma.filing.createMany).mock.calls[0][0] as {
      data: Array<{
        companyId: string;
        filingType: string;
        periodStart: Date;
        periodEnd: Date;
        startDate: Date;
        endDate: Date;
        status: string;
        deadline: Date;
        suppressedAt: Date | null;
        ctapUserEdited: boolean;
      }>;
    };

    const sharedDeadline = calculateCT600Deadline(ACCOUNTS_END);

    expect(callArg.data).toHaveLength(2);

    // First CTAP: 2024-02-07 -> 2025-02-06
    expect(callArg.data[0].periodStart.toISOString()).toBe(
      new Date("2024-02-07T00:00:00.000Z").toISOString(),
    );
    expect(callArg.data[0].periodEnd.toISOString()).toBe(
      new Date("2025-02-06T00:00:00.000Z").toISOString(),
    );

    // Second CTAP: 2025-02-07 -> 2025-02-28 (clamped to accounts end)
    expect(callArg.data[1].periodStart.toISOString()).toBe(
      new Date("2025-02-07T00:00:00.000Z").toISOString(),
    );
    expect(callArg.data[1].periodEnd.toISOString()).toBe(
      new Date("2025-02-28T00:00:00.000Z").toISOString(),
    );

    for (const row of callArg.data) {
      expect(row.companyId).toBe("comp-1");
      expect(row.filingType).toBe("ct600");
      expect(row.status).toBe("outstanding");
      expect(row.ctapUserEdited).toBe(false);
      expect(row.suppressedAt).toBe(null);
      expect(row.deadline.toISOString()).toBe(sharedDeadline.toISOString());
      // startDate/endDate mirror periodStart/periodEnd
      expect(row.startDate.toISOString()).toBe(row.periodStart.toISOString());
      expect(row.endDate.toISOString()).toBe(row.periodEnd.toISOString());
    }
  });

  it("carries the source accounts filing's suppressedAt onto generated CTAP rows", async () => {
    const suppressed = new Date("2024-06-01T00:00:00.000Z");
    vi.mocked(prisma.filing.findMany).mockImplementation(
      (async (args: { where: { filingType: string } }) => {
        if (args.where.filingType === "accounts") {
          return [
            {
              periodStart: ACCOUNTS_START,
              periodEnd: ACCOUNTS_END,
              suppressedAt: suppressed,
            },
          ];
        }
        return [];
      }) as never,
    );

    const res = await PATCH(
      makeRequest({
        companyId: "comp-1",
        registeredForCorpTax: true,
        uniqueTaxReference: "1234567890",
      }),
    );

    expect(res.status).toBe(200);
    const callArg = vi.mocked(prisma.filing.createMany).mock.calls[0][0] as {
      data: Array<{ suppressedAt: Date | null }>;
    };
    expect(callArg.data).toHaveLength(2);
    for (const row of callArg.data) {
      expect(row.suppressedAt?.toISOString()).toBe(suppressed.toISOString());
    }
  });

  it("creates no CT600 rows for a span already containing a protected (submitted) CT600", async () => {
    vi.mocked(prisma.filing.findMany).mockImplementation(
      (async (args: { where: { filingType: string } }) => {
        if (args.where.filingType === "accounts") {
          return [
            {
              periodStart: ACCOUNTS_START,
              periodEnd: ACCOUNTS_END,
              suppressedAt: null,
            },
          ];
        }
        // existing ct600 filings — a submitted one inside the span
        return [
          {
            status: "submitted",
            ctapUserEdited: false,
            periodStart: new Date("2024-02-07T00:00:00.000Z"),
            periodEnd: new Date("2025-02-06T00:00:00.000Z"),
          },
        ];
      }) as never,
    );

    const res = await PATCH(
      makeRequest({
        companyId: "comp-1",
        registeredForCorpTax: true,
        uniqueTaxReference: "1234567890",
      }),
    );

    expect(res.status).toBe(200);
    expect(prisma.filing.createMany).toHaveBeenCalledTimes(1);
    const callArg = vi.mocked(prisma.filing.createMany).mock.calls[0][0] as {
      data: unknown[];
    };
    expect(callArg.data).toHaveLength(0);
  });
});
