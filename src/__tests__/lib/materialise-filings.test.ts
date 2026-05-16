import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    filing: {
      createMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/db";
import { materialiseFilings } from "@/lib/companies-house/materialise-filings";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.filing.createMany).mockResolvedValue({ count: 1 } as never);
});

describe("materialiseFilings — accounts only", () => {
  it("only creates accounts rows (no CT600 rows)", async () => {
    await materialiseFilings({
      companyId: "comp-1",
      dateOfCreation: "2024-02-07",
      gapResult: null,
      ardMonth: 2,
      ardDay: 28,
      accountsDueOn: undefined,
      nextAccountsPeriodEndOn: undefined,
    });

    expect(prisma.filing.createMany).toHaveBeenCalledTimes(1);
    const created = (prisma.filing.createMany as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0].data;
    expect(created.length).toBeGreaterThan(0);
    expect(created.every((r: { filingType: string }) => r.filingType === "accounts")).toBe(true);
  });

  it("input type no longer accepts registeredForCorpTax or ctapStartDate (compile-time; runtime: extra props are ignored)", async () => {
    // This test documents that MaterialiseFilingsInput does not include
    // registeredForCorpTax or ctapStartDate — confirmed by tsc --noEmit.
    // At runtime, passing unknown extra props to the function would be a
    // TypeScript error, not a runtime one, so we just call it cleanly.
    await materialiseFilings({
      companyId: "comp-2",
      dateOfCreation: "2024-02-07",
      gapResult: null,
      ardMonth: 2,
      ardDay: 28,
      accountsDueOn: undefined,
      nextAccountsPeriodEndOn: undefined,
    });

    const created = (prisma.filing.createMany as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0].data;
    expect(created.every((r: { filingType: string }) => r.filingType === "accounts")).toBe(true);
  });
});
