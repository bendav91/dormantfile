import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    company: { findFirst: vi.fn(), update: vi.fn() },
    filing: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/companies-house/submission-client", () => ({
  submitToCompaniesHouse: vi.fn(),
}));
vi.mock("@/lib/ixbrl/dormant-accounts", () => ({
  generateDormantAccountsIxbrl: vi.fn(() => "<html>ACCOUNTS_IXBRL</html>"),
}));
vi.mock("@/lib/companies-house/xml-builder", () => ({
  buildAccountsXml: vi.fn(() => "<xml>ACCOUNTS_XML</xml>"),
  mapCompanyType: vi.fn((t: string) => t),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { submitToCompaniesHouse } from "@/lib/companies-house/submission-client";
import { POST } from "@/app/api/file/submit-accounts/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/file/submit-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: "user-1", name: "Jane", subscriptionStatus: "active",
  } as never);
  vi.mocked(prisma.company.findFirst).mockResolvedValue({
    id: "comp-1", companyName: "ACME LTD", companyRegistrationNumber: "12345678",
    shareCapital: 0, companyType: "ltd", filingDirectorName: "Jane Director",
    filingDirectorConfirmedAt: new Date(), companyGoneAt: null,
  } as never);
  vi.mocked(prisma.company.update).mockResolvedValue({} as never);
  const filingRow = {
    id: "filing-1", companyId: "comp-1", filingType: "accounts",
    periodStart: new Date("2023-01-01"), periodEnd: new Date("2023-12-31"),
    startDate: null, endDate: null, status: "outstanding",
  };
  // findFirst is called twice: once for outstanding lookup, once for idempotency check
  vi.mocked(prisma.filing.findFirst)
    .mockResolvedValueOnce(filingRow as never)   // outstanding filing found
    .mockResolvedValueOnce(null as never);        // idempotency: no submitted/accepted filing
  vi.mocked(prisma.filing.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.filing.update).mockResolvedValue(filingRow as never);
  // $transaction: simulate submission number generation
  vi.mocked(prisma.$transaction).mockImplementation(async (fn: (tx: typeof prisma) => Promise<string>) => {
    return fn({ filing: { findFirst: vi.fn().mockResolvedValue(null) } } as never);
  });

  // Provide env vars needed by getPresenterCredentials and getFilingEndpoint
  process.env.COMPANIES_HOUSE_PRESENTER_ID = "test-presenter";
  process.env.COMPANIES_HOUSE_PRESENTER_AUTH = "test-auth";
  process.env.COMPANIES_HOUSE_FILING_ENDPOINT = "http://test-endpoint";
  // Unset CH API key so the live status check is skipped
  delete process.env.COMPANIES_HOUSE_API_KEY;
});

describe("POST /api/file/submit-accounts — persists filed iXBRL", () => {
  it("writes filedAccountsIxbrl on the success (submitted) update", async () => {
    vi.mocked(submitToCompaniesHouse).mockResolvedValue({
      submissionId: "sub-1", pollInterval: 10,
    } as never);

    const res = await POST(makeRequest({
      companyId: "comp-1", companyAuthCode: "ABC123",
      periodStart: "2023-01-01T00:00:00.000Z", periodEnd: "2023-12-31T00:00:00.000Z",
      directorName: "Jane Director",
    }));

    expect(res.status).toBe(200);
    const successCall = vi.mocked(prisma.filing.update).mock.calls.find(
      (c) => (c[0] as { data: { status?: string } }).data.status === "submitted",
    );
    expect(successCall).toBeTruthy();
    expect((successCall![0] as { data: Record<string, unknown> }).data)
      .toMatchObject({ filedAccountsIxbrl: "<html>ACCOUNTS_IXBRL</html>" });
  });

  it("does NOT persist iXBRL when submission throws (status:failed)", async () => {
    vi.mocked(submitToCompaniesHouse).mockRejectedValue(new Error("CH down"));

    await POST(makeRequest({
      companyId: "comp-1", companyAuthCode: "ABC123",
      periodStart: "2023-01-01T00:00:00.000Z", periodEnd: "2023-12-31T00:00:00.000Z",
      directorName: "Jane Director",
    }));

    const failedCall = vi.mocked(prisma.filing.update).mock.calls.find(
      (c) => (c[0] as { data: { status?: string } }).data.status === "failed",
    );
    expect(failedCall).toBeTruthy();
    expect((failedCall![0] as { data: Record<string, unknown> }).data)
      .not.toHaveProperty("filedAccountsIxbrl");
  });
});
