import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    company: { findFirst: vi.fn(), update: vi.fn() },
    filing: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("@/lib/hmrc/xml-builder", () => ({
  buildGovTalkMessage: vi.fn(() => Promise.resolve("<xml><IRmark>X</IRmark></xml>")),
}));
vi.mock("@/lib/hmrc/submission-client", () => ({
  submitToHmrc: vi.fn(() =>
    Promise.resolve({ correlationId: "corr-1", pollInterval: 60, endpoint: "http://test-endpoint/poll" }),
  ),
}));
vi.mock("@/lib/ixbrl/dormant-accounts", () => ({
  generateDormantAccountsIxbrl: vi.fn(() => "<html>ACC</html>"),
}));
vi.mock("@/lib/ixbrl/tax-computations", () => ({
  generateDormantTaxComputationsIxbrl: vi.fn(() => "<html>COMP</html>"),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { submitToHmrc } from "@/lib/hmrc/submission-client";
import { POST } from "@/app/api/file/submit/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/file/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Minimal body that satisfies every guard in the route before reaching submission
const VALID_BODY = {
  companyId: "comp-1",
  filingId: "filing-1",
  directorName: "Jane Director",
  gatewayUsername: "gw-user",
  gatewayPassword: "gw-pass",
};

afterEach(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);

  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    id: "user-1",
    name: "Jane",
    subscriptionStatus: "active",
    subscriptionTier: "standard",
    filingAsAgent: false,
  } as never);

  vi.mocked(prisma.company.findFirst).mockResolvedValue({
    id: "comp-1",
    companyName: "ACME LTD",
    companyRegistrationNumber: "12345678",
    uniqueTaxReference: "1234567890",
    registeredForCorpTax: true,
    companyGoneAt: null,
    deletedAt: null,
    userId: "user-1",
  } as never);

  vi.mocked(prisma.company.update).mockResolvedValue({} as never);

  const filingRow = {
    id: "filing-1",
    companyId: "comp-1",
    filingType: "ct600",
    periodStart: new Date("2023-01-01"),
    periodEnd: new Date("2023-12-31"),
    startDate: null,
    endDate: null,
    status: "outstanding",
  };

  // findFirst is called in order:
  // (1) outstandingFiling lookup (by filingId, filingType ct600, status outstanding)
  // (2) idempotency check (submitted/accepted — returns null = none exist)
  // The CT600 submit route has NO $transaction, so no additional findFirst calls.
  vi.mocked(prisma.filing.findFirst)
    .mockResolvedValueOnce(filingRow as never)  // (1) outstanding-filing lookup
    .mockResolvedValueOnce(null as never);       // (2) idempotency check

  // updateMany: optimistic lock transition outstanding -> pending (count=1 = lock acquired)
  vi.mocked(prisma.filing.updateMany).mockResolvedValue({ count: 1 } as never);

  vi.mocked(prisma.filing.update).mockResolvedValue(filingRow as never);

  // Env vars required by getVendorCredentials() and getHmrcEndpoint() in the route.
  // Using vi.stubEnv so every var is automatically restored by vi.unstubAllEnvs() in afterEach.
  // The endpoint string must include "test" so endpoint.includes("test") is true (isTest = true).
  vi.stubEnv("HMRC_VENDOR_ID", "test-vendor-id");
  vi.stubEnv("HMRC_SENDER_ID", "test-sender");
  vi.stubEnv("HMRC_SENDER_PASSWORD", "test-sender-password");
  vi.stubEnv("HMRC_ENDPOINT", "https://test.transaction.hmrc.gov.uk/submission");

  // isTaxFilingLive() reads NEXT_PUBLIC_TAX_FILING_LIVE — must be "true" or the
  // route returns 503 before any filing logic runs.
  vi.stubEnv("NEXT_PUBLIC_TAX_FILING_LIVE", "true");

  // Stub empty so the CH live-status check branch (if chApiKey) is skipped.
  vi.stubEnv("COMPANIES_HOUSE_API_KEY", "");
});

describe("POST /api/file/submit — persists filed iXBRL on successful HMRC submission (CT600)", () => {
  it("writes filedAccountsIxbrl and filedComputationsIxbrl on the success (submitted) update", async () => {
    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(200);

    const successCall = vi.mocked(prisma.filing.update).mock.calls.find(
      (c) => (c[0] as { data: { status?: string } }).data.status === "submitted",
    );
    expect(successCall).toBeTruthy();
    expect((successCall![0] as { data: Record<string, unknown> }).data).toMatchObject({
      filedAccountsIxbrl: "<html>ACC</html>",
      filedComputationsIxbrl: "<html>COMP</html>",
    });
  });

  it("does NOT persist iXBRL fields when submitToHmrc throws (status:failed)", async () => {
    vi.mocked(submitToHmrc).mockRejectedValue(new Error("HMRC down"));

    await POST(makeRequest(VALID_BODY));

    const failedCall = vi.mocked(prisma.filing.update).mock.calls.find(
      (c) => (c[0] as { data: { status?: string } }).data.status === "failed",
    );
    expect(failedCall).toBeTruthy();
    const failedData = (failedCall![0] as { data: Record<string, unknown> }).data;
    expect(failedData).not.toHaveProperty("filedAccountsIxbrl");
    expect(failedData).not.toHaveProperty("filedComputationsIxbrl");
  });
});
