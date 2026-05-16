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
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/company/update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

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
  vi.mocked(prisma.$transaction).mockImplementation(async (arg: unknown) => {
    if (Array.isArray(arg)) return Promise.all(arg);
    return (arg as (tx: unknown) => unknown)(prisma);
  });
});

describe("PATCH /api/company/update — enable Corp Tax", () => {
  it("sets UTR and registeredForCorpTax flag, creates no CT600 filings", async () => {
    const res = await PATCH(
      makeRequest({
        companyId: "comp-1",
        registeredForCorpTax: true,
        uniqueTaxReference: "1234567890",
      }),
    );

    expect(res.status).toBe(200);

    expect(prisma.company.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { registeredForCorpTax: true, uniqueTaxReference: "1234567890" },
      }),
    );
    expect(prisma.filing.createMany).not.toHaveBeenCalled();
  });

  it("returns 400 when UTR is missing", async () => {
    const res = await PATCH(
      makeRequest({
        companyId: "comp-1",
        registeredForCorpTax: true,
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/UTR is required/i);
  });

  it("returns 400 when UTR is not exactly 10 digits", async () => {
    const res = await PATCH(
      makeRequest({
        companyId: "comp-1",
        registeredForCorpTax: true,
        uniqueTaxReference: "12345",
      }),
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/10 digits/i);
  });
});
