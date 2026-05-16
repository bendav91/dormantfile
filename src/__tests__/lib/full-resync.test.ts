import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    company: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    filing: {
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/companies-house/filing-history", () => ({
  fetchFilingHistoryStrict: vi.fn(),
  detectAccountsGaps: vi.fn(),
}));

vi.mock("@/lib/companies-house/materialise-filings", () => ({
  materialiseFilings: vi.fn(),
}));

import { prisma } from "@/lib/db";
import {
  fetchFilingHistoryStrict,
  detectAccountsGaps,
} from "@/lib/companies-house/filing-history";
import { materialiseFilings } from "@/lib/companies-house/materialise-filings";
import { fullResyncCompany } from "@/lib/companies-house/full-resync";

beforeEach(() => {
  vi.clearAllMocks();

  vi.stubEnv("COMPANIES_HOUSE_API_KEY", "test-key");
  vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "https://api.ch.test");

  vi.mocked(prisma.company.findUnique).mockResolvedValue({
    companyRegistrationNumber: "12345678",
    registeredForCorpTax: true,
    ctapStartDate: null,
  } as never);
  vi.mocked(prisma.company.update).mockResolvedValue({} as never);
  vi.mocked(prisma.filing.deleteMany).mockResolvedValue({ count: 0 } as never);
  vi.mocked(prisma.filing.count).mockResolvedValue(0 as never);

  vi.mocked(fetchFilingHistoryStrict).mockResolvedValue([]);
  vi.mocked(detectAccountsGaps).mockReturnValue({
    filedPeriodEnds: new Map(),
    oldestUnfiledPeriodStart: null,
    oldestUnfiledPeriodEnd: null,
  } as never);
  vi.mocked(materialiseFilings).mockResolvedValue(undefined);

  // CH company profile fetch
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      date_of_creation: "2024-02-07",
      accounts: {
        accounting_reference_date: { month: "02", day: "28" },
        next_accounts: { due_on: "2026-11-30", period_end_on: "2025-02-28" },
      },
      company_status: "active",
      type: "ltd",
      registered_office_address: { address_line_1: "1 Test St", postal_code: "AB1 2CD" },
      sic_codes: ["99999"],
    }),
  }) as never;
});

describe("fullResyncCompany — C1: preserves user-edited CT600 CTAPs", () => {
  it("deleteMany WHERE excludes user-edited ct600 rows (NOT clause present)", async () => {
    await fullResyncCompany("comp-1");

    expect(prisma.filing.deleteMany).toHaveBeenCalledTimes(1);

    expect(prisma.filing.deleteMany).toHaveBeenCalledWith({
      where: {
        companyId: "comp-1",
        status: "outstanding",
        NOT: { filingType: "ct600", ctapUserEdited: true },
      },
    });

    // Explicitly assert the protective NOT clause exists and targets exactly
    // outstanding user-edited ct600s (the C1 fix).
    const call = vi.mocked(prisma.filing.deleteMany).mock.calls[0]?.[0] as {
      where: { status: string; NOT: { filingType: string; ctapUserEdited: boolean } };
    };
    expect(call.where.NOT).toEqual({ filingType: "ct600", ctapUserEdited: true });
    expect(call.where.status).toBe("outstanding");
  });

});
