import { describe, it, expect, vi, beforeEach } from "vitest";
import { resyncFromCompaniesHouse } from "@/lib/companies-house/resync";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    company: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    filing: {
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
    period: {
      upsert: vi.fn().mockResolvedValue({ id: "period-1" }),
    },
  },
}));

vi.mock("@/lib/companies-house/filing-history", () => ({
  fetchFilingHistoryStrict: vi.fn(),
  detectAccountsGaps: vi.fn(),
  computeFirstPeriodEnd: vi.fn(),
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock the CH company profile fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { prisma } from "@/lib/db";
import {
  fetchFilingHistoryStrict,
  detectAccountsGaps,
  computeFirstPeriodEnd,
} from "@/lib/companies-house/filing-history";
import { sendEmail } from "@/lib/email/client";

const mockCompany = {
  id: "comp-1",
  companyRegistrationNumber: "12345678",
  companyName: "TEST LTD",
  registeredForCorpTax: false,
  accountingPeriodStart: new Date("2024-04-01"),
  accountingPeriodEnd: new Date("2025-03-31"),
  companyStatus: null,
  companyGoneAt: null,
  userId: "user-1",
  user: { email: "test@example.com" },
  filings: [],
};

const chProfileResponse = {
  date_of_creation: "2020-06-01",
  accounts: {
    accounting_reference_date: { month: "3", day: "31" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("COMPANIES_HOUSE_API_KEY", "test-key");
  vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "https://api.test");

  // Default: company found
  vi.mocked(prisma.company.findUnique).mockResolvedValue(mockCompany as never);

  // Default: CH profile responds
  mockFetch.mockResolvedValue(new Response(JSON.stringify(chProfileResponse), { status: 200 }));
});

describe("resyncFromCompaniesHouse", () => {
  it("creates Filing records for newly detected external filings", async () => {
    const chDate = new Date("2024-03-31");
    vi.mocked(fetchFilingHistoryStrict).mockResolvedValue([chDate]);
    vi.mocked(detectAccountsGaps).mockReturnValue({
      oldestUnfiledPeriodStart: new Date("2024-04-01"),
      oldestUnfiledPeriodEnd: new Date("2025-03-31"),
      filedPeriodEnds: new Map([[chDate.getTime(), new Date("2024-03-31")]]),
    });
    vi.mocked(computeFirstPeriodEnd).mockReturnValue(new Date("2021-03-31"));

    // No existing filings match
    vi.mocked(prisma.filing.findMany).mockResolvedValue([]);

    const result = await resyncFromCompaniesHouse("comp-1");

    expect(result.newFilingsCount).toBe(1);
    expect(prisma.filing.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: "comp-1",
        filingType: "accounts",
        periodEnd: new Date("2024-03-31"),
        status: "accepted",
      }),
    });
  });

  it("returns zero when no new filings detected", async () => {
    vi.mocked(fetchFilingHistoryStrict).mockResolvedValue([new Date("2024-03-31")]);
    vi.mocked(detectAccountsGaps).mockReturnValue({
      oldestUnfiledPeriodStart: new Date("2024-04-01"),
      oldestUnfiledPeriodEnd: new Date("2025-03-31"),
      filedPeriodEnds: new Map([[new Date("2024-03-31").getTime(), new Date("2024-03-31")]]),
    });
    vi.mocked(computeFirstPeriodEnd).mockReturnValue(new Date("2021-03-31"));

    // Existing filing already covers this period
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      { periodEnd: new Date("2024-03-31") } as never,
    ]);

    const result = await resyncFromCompaniesHouse("comp-1");

    expect(result.newFilingsCount).toBe(0);
    expect(prisma.filing.create).not.toHaveBeenCalled();
  });

  it("returns error when CH API fails", async () => {
    vi.mocked(fetchFilingHistoryStrict).mockRejectedValue(new Error("CH API returned 500"));

    const result = await resyncFromCompaniesHouse("comp-1");

    expect(result.newFilingsCount).toBe(0);
    expect(result.error).toBeDefined();
    expect(prisma.filing.createMany).not.toHaveBeenCalled();
  });

  it("skips periods that already have a pending/submitted filing", async () => {
    const chDate = new Date("2024-03-31");
    vi.mocked(fetchFilingHistoryStrict).mockResolvedValue([chDate]);
    vi.mocked(detectAccountsGaps).mockReturnValue({
      oldestUnfiledPeriodStart: new Date("2024-04-01"),
      oldestUnfiledPeriodEnd: new Date("2025-03-31"),
      filedPeriodEnds: new Map([[chDate.getTime(), new Date("2024-03-31")]]),
    });
    vi.mocked(computeFirstPeriodEnd).mockReturnValue(new Date("2021-03-31"));

    // A filing already exists for this period with "submitted" status
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      { periodEnd: new Date("2024-03-31") } as never,
    ]);

    const result = await resyncFromCompaniesHouse("comp-1");

    expect(result.newFilingsCount).toBe(0);
    expect(prisma.filing.createMany).not.toHaveBeenCalled();
  });

  it("reconciles existing outstanding filings when all periods are filed at CH", async () => {
    // Regression: Codeben Ltd had 7 outstanding Filing rows that were all
    // already accepted at CH. Previously resync returned null and bailed;
    // now it must transition outstanding → accepted.
    const chDate = new Date("2024-03-31");
    vi.mocked(fetchFilingHistoryStrict).mockResolvedValue([chDate]);
    vi.mocked(detectAccountsGaps).mockReturnValue({
      oldestUnfiledPeriodStart: null,
      oldestUnfiledPeriodEnd: null,
      filedPeriodEnds: new Map([[chDate.getTime(), new Date("2024-03-31")]]),
    });
    vi.mocked(computeFirstPeriodEnd).mockReturnValue(new Date("2021-03-31"));

    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      { id: "f1", periodEnd: new Date("2024-03-31"), status: "outstanding" } as never,
    ]);

    const result = await resyncFromCompaniesHouse("comp-1");

    expect(result.newFilingsCount).toBe(1);
    expect(prisma.filing.update).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: expect.objectContaining({ status: "accepted" }),
    });
  });

  it("uses incorporation date as periodStart for first period", async () => {
    const firstPeriodEnd = new Date("2021-03-31");
    const chDate = new Date("2021-03-31");
    vi.mocked(fetchFilingHistoryStrict).mockResolvedValue([chDate]);
    vi.mocked(detectAccountsGaps).mockReturnValue({
      oldestUnfiledPeriodStart: new Date("2021-04-01"),
      oldestUnfiledPeriodEnd: new Date("2022-03-31"),
      filedPeriodEnds: new Map([[chDate.getTime(), firstPeriodEnd]]),
    });
    vi.mocked(computeFirstPeriodEnd).mockReturnValue(firstPeriodEnd);

    vi.mocked(prisma.filing.findMany).mockResolvedValue([]);

    await resyncFromCompaniesHouse("comp-1");

    expect(prisma.filing.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        periodStart: new Date("2020-06-01"), // incorporation date from CH profile
        periodEnd: firstPeriodEnd,
        status: "accepted",
      }),
    });
  });

  describe("Companies House status transitions", () => {
    // Minimal filing-history mocks so resync reaches/returns past Step 2.
    function noNewFilings() {
      vi.mocked(fetchFilingHistoryStrict).mockResolvedValue([]);
      vi.mocked(detectAccountsGaps).mockReturnValue({
        oldestUnfiledPeriodStart: null,
        oldestUnfiledPeriodEnd: null,
        filedPeriodEnds: new Map(),
      } as never);
      vi.mocked(computeFirstPeriodEnd).mockReturnValue(new Date("2021-03-31"));
      vi.mocked(prisma.filing.findMany).mockResolvedValue([]);
    }

    function chProfileWithStatus(status: string) {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ ...chProfileResponse, company_status: status }), {
          status: 200,
        }),
      );
    }

    it("flags a newly dissolved company and emails the customer once", async () => {
      noNewFilings();
      chProfileWithStatus("dissolved");

      await resyncFromCompaniesHouse("comp-1");

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        data: expect.objectContaining({ companyGoneAt: expect.any(Date) }),
      });
      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({
        to: "test@example.com",
        subject: expect.stringContaining("struck off"),
      });
    });

    it("does not re-flag or re-email an already-dissolved company", async () => {
      noNewFilings();
      chProfileWithStatus("dissolved");
      vi.mocked(prisma.company.findUnique).mockResolvedValue({
        ...mockCompany,
        companyGoneAt: new Date("2026-01-01"),
      } as never);

      await resyncFromCompaniesHouse("comp-1");

      expect(sendEmail).not.toHaveBeenCalled();
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        data: expect.not.objectContaining({ companyGoneAt: expect.anything() }),
      });
    });

    it("clears the flag and notifies when a company is reinstated", async () => {
      noNewFilings();
      chProfileWithStatus("active");
      vi.mocked(prisma.company.findUnique).mockResolvedValue({
        ...mockCompany,
        companyGoneAt: new Date("2026-01-01"),
      } as never);

      await resyncFromCompaniesHouse("comp-1");

      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        data: expect.objectContaining({ companyGoneAt: null }),
      });
      expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({
        subject: expect.stringContaining("active again"),
      });
    });

    it("an email failure does not break the resync", async () => {
      noNewFilings();
      chProfileWithStatus("dissolved");
      vi.mocked(sendEmail).mockRejectedValueOnce(new Error("Resend down"));

      const result = await resyncFromCompaniesHouse("comp-1");

      expect(result.error).toBeUndefined();
      expect(prisma.company.update).toHaveBeenCalledWith({
        where: { id: "comp-1" },
        data: expect.objectContaining({ companyGoneAt: expect.any(Date) }),
      });
    });
  });
});
