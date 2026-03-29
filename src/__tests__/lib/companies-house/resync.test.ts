import { describe, it, expect, vi, beforeEach } from "vitest";
import { resyncFromCompaniesHouse } from "@/lib/companies-house/resync";

// Mock dependencies
vi.mock("@/lib/db", () => ({
  prisma: {
    company: {
      findUnique: vi.fn(),
    },
    filing: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/companies-house/filing-history", () => ({
  fetchFilingHistoryStrict: vi.fn(),
  detectAccountsGaps: vi.fn(),
  computeFirstPeriodEnd: vi.fn(),
}));

vi.mock("@/lib/roll-forward", () => ({
  rollForwardPeriod: vi.fn(),
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
import { rollForwardPeriod } from "@/lib/roll-forward";

const mockCompany = {
  id: "comp-1",
  companyRegistrationNumber: "12345678",
  companyName: "TEST LTD",
  registeredForCorpTax: false,
  accountingPeriodStart: new Date("2024-04-01"),
  accountingPeriodEnd: new Date("2025-03-31"),
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
  mockFetch.mockResolvedValue(
    new Response(JSON.stringify(chProfileResponse), { status: 200 }),
  );
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
    vi.mocked(prisma.filing.createMany).mockResolvedValue({ count: 1 });

    const result = await resyncFromCompaniesHouse("comp-1");

    expect(result.newFilingsCount).toBe(1);
    expect(prisma.filing.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          companyId: "comp-1",
          filingType: "accounts",
          periodEnd: new Date("2024-03-31"),
          status: "accepted",
          correlationId: null,
        }),
      ],
      skipDuplicates: true,
    });
    expect(rollForwardPeriod).toHaveBeenCalledWith(
      "comp-1",
      new Date("2024-03-31"),
      false,
      "accounts",
      "test@example.com",
      "TEST LTD",
      { skipEmail: true },
    );
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
    expect(prisma.filing.createMany).not.toHaveBeenCalled();
    expect(rollForwardPeriod).not.toHaveBeenCalled();
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

  it("returns zero when detectAccountsGaps returns null (all filed)", async () => {
    vi.mocked(fetchFilingHistoryStrict).mockResolvedValue([new Date("2024-03-31")]);
    vi.mocked(detectAccountsGaps).mockReturnValue(null);

    const result = await resyncFromCompaniesHouse("comp-1");

    expect(result.newFilingsCount).toBe(0);
    expect(prisma.filing.createMany).not.toHaveBeenCalled();
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
    vi.mocked(prisma.filing.createMany).mockResolvedValue({ count: 1 });

    await resyncFromCompaniesHouse("comp-1");

    expect(prisma.filing.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          periodStart: new Date("2020-06-01"), // incorporation date from CH profile
          periodEnd: firstPeriodEnd,
        }),
      ],
      skipDuplicates: true,
    });
  });
});
