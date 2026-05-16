import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    filing: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/hmrc/submission-client", () => ({
  pollHmrc: vi.fn(),
}));

vi.mock("@/lib/companies-house/submission-client", () => ({
  pollCompaniesHouse: vi.fn(),
}));

vi.mock("@/lib/roll-forward", () => ({
  rollForwardPeriod: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { pollCompaniesHouse } from "@/lib/companies-house/submission-client";
import { GET } from "@/app/api/cron/poll-filings/route";
import { NextRequest } from "next/server";

function makeRequest(secret = "test-secret"): NextRequest {
  return new NextRequest("http://localhost/api/cron/poll-filings", {
    headers: { authorization: `Bearer ${secret}` },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.stubEnv("COMPANIES_HOUSE_PRESENTER_ID", "presenter123");
  vi.stubEnv("COMPANIES_HOUSE_PRESENTER_AUTH", "presenterpass");
  vi.stubEnv(
    "COMPANIES_HOUSE_FILING_ENDPOINT",
    "https://xmlgw.companieshouse.gov.uk/v1-0/xmlgw/Gateway",
  );
});

describe("GET /api/cron/poll-filings — Companies House polling identifier", () => {
  it("polls CH with the presenter submissionNumber, not the GovTalk correlationId", async () => {
    // Real-world shape: CH assigned GovTalk correlationId "29"; we filed under
    // presenter submission number "000029". GetSubmissionStatus matches on the
    // submission number, so that is what must be polled.
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      {
        id: "filing-1",
        filingType: "accounts",
        correlationId: "29",
        submissionNumber: "000029",
        pollEndpoint: null,
        submittedAt: new Date("2026-05-16T12:04:44.008Z"),
        reviewFlaggedAt: null,
        companyId: "comp-1",
        periodStart: new Date("2024-09-01"),
        periodEnd: new Date("2025-08-31"),
        startDate: null,
        endDate: null,
        company: {
          registeredForCorpTax: false,
          companyName: "SIMON FRASER ENGINEERING LIMITED",
          user: { email: "owner@example.com" },
        },
      },
    ] as never);

    vi.mocked(pollCompaniesHouse).mockResolvedValue({ status: "pending" });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    expect(pollCompaniesHouse).toHaveBeenCalledTimes(1);
    expect(vi.mocked(pollCompaniesHouse).mock.calls[0][0]).toBe("000029");
  });
});
