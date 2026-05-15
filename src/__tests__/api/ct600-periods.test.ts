import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    company: { findFirst: vi.fn() },
    filing: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { POST } from "@/app/api/company/ct600-periods/route";
import { calculateCT600Deadline } from "@/lib/utils";
import { NextRequest } from "next/server";

const ACCOUNTS_START_ISO = "2024-02-07T00:00:00.000Z";
const ACCOUNTS_END_ISO = "2025-02-28T00:00:00.000Z";

// A valid 2-period split spanning the accounts period.
const PERIOD_1 = { startISO: "2024-02-07T00:00:00.000Z", endISO: "2025-02-06T00:00:00.000Z" };
const PERIOD_2 = { startISO: "2025-02-07T00:00:00.000Z", endISO: "2025-02-28T00:00:00.000Z" };

function makeRequest(body: Record<string, unknown> | string = {}): NextRequest {
  return new NextRequest("http://localhost/api/company/ct600-periods", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const mockCompany = {
  id: "comp-1",
  userId: "user-1",
  deletedAt: null,
  filings: [] as Array<Record<string, unknown>>,
};

function validBody() {
  return {
    companyId: "comp-1",
    accountsPeriodStartISO: ACCOUNTS_START_ISO,
    accountsPeriodEndISO: ACCOUNTS_END_ISO,
    periods: [PERIOD_1, PERIOD_2],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(prisma.company.findFirst).mockResolvedValue({
    ...mockCompany,
    filings: [],
  } as never);
  vi.mocked(prisma.filing.deleteMany).mockReturnValue({ __op: "deleteMany" } as never);
  vi.mocked(prisma.filing.createMany).mockReturnValue({ __op: "createMany" } as never);
  // $transaction in this route is given an array of prisma promise builders.
  vi.mocked(prisma.$transaction).mockResolvedValue([] as never);
});

describe("POST /api/company/ct600-periods", () => {
  it("returns 401 when there is no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);

    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 for an unparseable JSON body", async () => {
    const res = await POST(makeRequest("{ not json"));

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(
      makeRequest({ companyId: "comp-1", accountsPeriodEndISO: ACCOUNTS_END_ISO }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/required/i);
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid dates", async () => {
    const res = await POST(
      makeRequest({
        companyId: "comp-1",
        accountsPeriodStartISO: "not-a-date",
        accountsPeriodEndISO: ACCOUNTS_END_ISO,
        periods: [PERIOD_1, PERIOD_2],
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid dates" });
  });

  it("returns 404 when the company is not found / not owned by the user", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValue(null as never);

    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Company not found" });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 400 with error + errors when validateCtapChain rejects (>12 month single period)", async () => {
    const res = await POST(
      makeRequest({
        companyId: "comp-1",
        accountsPeriodStartISO: ACCOUNTS_START_ISO,
        accountsPeriodEndISO: ACCOUNTS_END_ISO,
        // Single period spanning the full ~13 month accounts span (>12 months).
        periods: [{ startISO: ACCOUNTS_START_ISO, endISO: ACCOUNTS_END_ISO }],
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(Array.isArray(json.errors)).toBe(true);
    expect(json.errors.length).toBeGreaterThan(0);
    expect(json.error).toBe(json.errors[0]);
    expect(json.errors.some((e: string) => /12 months/i.test(e))).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("returns 400 when validateCtapChain detects a gap between periods", async () => {
    const res = await POST(
      makeRequest({
        companyId: "comp-1",
        accountsPeriodStartISO: ACCOUNTS_START_ISO,
        accountsPeriodEndISO: ACCOUNTS_END_ISO,
        periods: [
          { startISO: ACCOUNTS_START_ISO, endISO: "2024-12-31T00:00:00.000Z" },
          // Gap: should start 2025-01-01, starts 2025-02-07 instead.
          PERIOD_2,
        ],
      }),
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.errors.some((e: string) => /gaps or overlaps/i.test(e))).toBe(true);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("replaces editable CT600s in span with the submitted CTAPs (success)", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValue({
      ...mockCompany,
      filings: [
        {
          id: "f-old-1",
          status: "outstanding",
          periodStart: new Date("2024-02-07T00:00:00.000Z"),
          periodEnd: new Date("2024-08-06T00:00:00.000Z"),
        },
        {
          id: "f-old-2",
          status: "failed",
          periodStart: new Date("2024-08-07T00:00:00.000Z"),
          periodEnd: new Date("2025-02-28T00:00:00.000Z"),
        },
        // Outside the span — must be untouched (not in editableIds).
        {
          id: "f-outside",
          status: "outstanding",
          periodStart: new Date("2025-03-01T00:00:00.000Z"),
          periodEnd: new Date("2026-02-28T00:00:00.000Z"),
        },
      ],
    } as never);

    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, count: 2 });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const txArg = vi.mocked(prisma.$transaction).mock.calls[0][0] as unknown as unknown[];
    expect(Array.isArray(txArg)).toBe(true);
    expect(txArg).toHaveLength(2);

    // deleteMany targets exactly the in-span editable ids (f-old-1, f-old-2).
    expect(prisma.filing.deleteMany).toHaveBeenCalledTimes(1);
    const deleteArg = vi.mocked(prisma.filing.deleteMany).mock.calls[0][0] as {
      where: { id: { in: string[] } };
    };
    expect(deleteArg.where.id.in.sort()).toEqual(["f-old-1", "f-old-2"]);

    // createMany inserts the posted periods as user-edited outstanding CT600s.
    expect(prisma.filing.createMany).toHaveBeenCalledTimes(1);
    const createArg = vi.mocked(prisma.filing.createMany).mock.calls[0][0] as {
      data: Array<{
        companyId: string;
        filingType: string;
        periodStart: Date;
        periodEnd: Date;
        startDate: Date;
        endDate: Date;
        status: string;
        deadline: Date;
        ctapUserEdited: boolean;
      }>;
    };

    const sharedDeadline = calculateCT600Deadline(new Date(ACCOUNTS_END_ISO));

    expect(createArg.data).toHaveLength(2);

    expect(createArg.data[0].periodStart.toISOString()).toBe(
      new Date(PERIOD_1.startISO).toISOString(),
    );
    expect(createArg.data[0].periodEnd.toISOString()).toBe(
      new Date(PERIOD_1.endISO).toISOString(),
    );
    expect(createArg.data[1].periodStart.toISOString()).toBe(
      new Date(PERIOD_2.startISO).toISOString(),
    );
    expect(createArg.data[1].periodEnd.toISOString()).toBe(
      new Date(PERIOD_2.endISO).toISOString(),
    );

    for (const row of createArg.data) {
      expect(row.companyId).toBe("comp-1");
      expect(row.filingType).toBe("ct600");
      expect(row.status).toBe("outstanding");
      expect(row.ctapUserEdited).toBe(true);
      expect(row.deadline.toISOString()).toBe(sharedDeadline.toISOString());
      expect(row.startDate.toISOString()).toBe(row.periodStart.toISOString());
      expect(row.endDate.toISOString()).toBe(row.periodEnd.toISOString());
    }
  });

  it("returns 409 and does not run the transaction when an immutable (submitted) CT600 is in span", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValue({
      ...mockCompany,
      filings: [
        {
          id: "f-submitted",
          status: "submitted",
          periodStart: new Date("2024-02-07T00:00:00.000Z"),
          periodEnd: new Date("2025-02-06T00:00:00.000Z"),
        },
        {
          id: "f-editable",
          status: "outstanding",
          periodStart: new Date("2025-02-07T00:00:00.000Z"),
          periodEnd: new Date("2025-02-28T00:00:00.000Z"),
        },
      ],
    } as never);

    const res = await POST(makeRequest(validBody()));

    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already been filed.*reopen/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.filing.deleteMany).not.toHaveBeenCalled();
    expect(prisma.filing.createMany).not.toHaveBeenCalled();
  });
});
