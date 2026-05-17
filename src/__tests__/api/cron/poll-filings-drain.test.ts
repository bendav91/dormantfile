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

vi.mock("@/lib/filing-confirmation", () => ({
  drainPendingFilingConfirmations: vi.fn(),
}));

import { prisma } from "@/lib/db";
import { drainPendingFilingConfirmations } from "@/lib/filing-confirmation";
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
});

describe("GET /api/cron/poll-filings — durable confirmation drain (Task D)", () => {
  it("(v) calls the drain, includes stuck items in JSON, emits the structured digest log, and sends NO ops email", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([] as never);
    const stuckItems = [
      { filingId: "filing-9", companyId: "comp-9", attempts: 3 },
    ];
    vi.mocked(drainPendingFilingConfirmations).mockResolvedValue(
      stuckItems as never,
    );
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    // Drain was invoked exactly once after the existing poll work.
    expect(drainPendingFilingConfirmations).toHaveBeenCalledTimes(1);

    // Existing poll-filings response shape is preserved.
    expect(body).toMatchObject({ checked: 0, resolved: 0 });
    // Stuck items merged into the cron JSON.
    expect(body.confirmationStuck).toEqual(stuckItems);

    // Exactly one structured digest line, no ops email anywhere.
    expect(errSpy).toHaveBeenCalledWith("[filing-confirmation] stuck", {
      items: stuckItems,
    });

    errSpy.mockRestore();
  });

  it("does not emit the digest log when nothing is stuck", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([] as never);
    vi.mocked(drainPendingFilingConfirmations).mockResolvedValue([] as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(drainPendingFilingConfirmations).toHaveBeenCalledTimes(1);
    expect(body.confirmationStuck).toEqual([]);
    expect(errSpy).not.toHaveBeenCalledWith(
      "[filing-confirmation] stuck",
      expect.anything(),
    );

    errSpy.mockRestore();
  });

  it("a thrown drain does not break the cron response", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([] as never);
    vi.mocked(drainPendingFilingConfirmations).mockRejectedValue(
      new Error("drain blew up"),
    );

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ checked: 0, resolved: 0 });
  });
});
