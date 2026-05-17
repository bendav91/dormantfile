import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock order is load-bearing: vi.mock calls are hoisted before imports,
// so these must appear before the route imports below.

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    filing: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

// Sentinel so we can prove the generator was NOT used when snapshot is present.
vi.mock("@/lib/ixbrl/dormant-accounts", () => ({
  generateDormantAccountsIxbrl: vi.fn().mockReturnValue("<LIVE_GENERATED/>"),
}));

vi.mock("@/lib/ixbrl/tax-computations", () => ({
  generateDormantTaxComputationsIxbrl: vi
    .fn()
    .mockReturnValue("<LIVE_GENERATED/>"),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { generateDormantAccountsIxbrl } from "@/lib/ixbrl/dormant-accounts";
import { generateDormantTaxComputationsIxbrl } from "@/lib/ixbrl/tax-computations";
import { GET as getAccounts } from "@/app/api/file/preview-accounts/route";
import { GET as getComputations } from "@/app/api/file/preview-computations/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const PERIOD_END = new Date("2024-03-31");

/** Minimal filing shape sufficient for both routes. */
function makeFiling(overrides: Record<string, unknown> = {}) {
  return {
    id: "filing-1",
    startDate: new Date("2023-04-01"),
    endDate: PERIOD_END,
    periodStart: new Date("2023-04-01"),
    periodEnd: PERIOD_END,
    filedAccountsIxbrl: null as string | null,
    filedComputationsIxbrl: null as string | null,
    company: {
      userId: "user-1",
      companyName: "Test Co Ltd",
      companyRegistrationNumber: "12345678",
      uniqueTaxReference: "1234567890",
      shareCapital: 1,
      filingDirectorName: "Jane Director",
      user: { name: "Jane Director" },
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: authenticated as the company owner.
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "user-1" },
  } as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// preview-accounts
// ---------------------------------------------------------------------------

describe("GET /api/file/preview-accounts — snapshot-aware", () => {
  function makeAccountsRequest(params: Record<string, string> = {}) {
    const url = new URL("http://localhost/api/file/preview-accounts");
    url.searchParams.set("filingId", "filing-1");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return new NextRequest(url.toString());
  }

  it("returns persisted iXBRL verbatim and does NOT call the generator when filedAccountsIxbrl is set", async () => {
    const filing = makeFiling({ filedAccountsIxbrl: "<SNAPSHOT/>" });
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(filing as never);

    const res = await getAccounts(makeAccountsRequest());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<SNAPSHOT/>");
    // The key assertion: snapshot short-circuit must bypass the generator entirely.
    expect(generateDormantAccountsIxbrl).not.toHaveBeenCalled();
  });

  it("calls the generator (live path) when filedAccountsIxbrl is null", async () => {
    const filing = makeFiling({ filedAccountsIxbrl: null });
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(filing as never);

    const res = await getAccounts(makeAccountsRequest());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<LIVE_GENERATED/>");
    expect(generateDormantAccountsIxbrl).toHaveBeenCalledOnce();
  });

  it("returns snapshot with download headers when ?download=1 and snapshot present", async () => {
    const filing = makeFiling({ filedAccountsIxbrl: "<SNAPSHOT/>" });
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(filing as never);

    const res = await getAccounts(makeAccountsRequest({ download: "1" }));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<SNAPSHOT/>");
    expect(res.headers.get("Content-Type")).toContain(
      "application/xhtml+xml",
    );
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain(
      "12345678-accounts-2024-03-31.html",
    );
    expect(generateDormantAccountsIxbrl).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// preview-computations
// ---------------------------------------------------------------------------

describe("GET /api/file/preview-computations — snapshot-aware", () => {
  function makeComputationsRequest(params: Record<string, string> = {}) {
    const url = new URL("http://localhost/api/file/preview-computations");
    url.searchParams.set("filingId", "filing-1");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return new NextRequest(url.toString());
  }

  it("returns persisted iXBRL verbatim and does NOT call the generator when filedComputationsIxbrl is set (UTR present)", async () => {
    // UTR must be present so the UTR-check passes before reaching the snapshot short-circuit.
    const filing = makeFiling({ filedComputationsIxbrl: "<SNAPSHOT/>" });
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(filing as never);

    const res = await getComputations(makeComputationsRequest());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<SNAPSHOT/>");
    expect(generateDormantTaxComputationsIxbrl).not.toHaveBeenCalled();
  });

  it("calls the generator (live path) when filedComputationsIxbrl is null (UTR present)", async () => {
    const filing = makeFiling({ filedComputationsIxbrl: null });
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(filing as never);

    const res = await getComputations(makeComputationsRequest());

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<LIVE_GENERATED/>");
    expect(generateDormantTaxComputationsIxbrl).toHaveBeenCalledOnce();
  });

  it("returns snapshot with download headers when ?download=1 and snapshot present", async () => {
    const filing = makeFiling({ filedComputationsIxbrl: "<SNAPSHOT/>" });
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(filing as never);

    const res = await getComputations(makeComputationsRequest({ download: "1" }));

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("<SNAPSHOT/>");
    expect(res.headers.get("Content-Type")).toContain(
      "application/xhtml+xml",
    );
    expect(res.headers.get("Content-Disposition")).toContain("attachment");
    expect(res.headers.get("Content-Disposition")).toContain(
      "12345678-computations-2024-03-31.html",
    );
    expect(generateDormantTaxComputationsIxbrl).not.toHaveBeenCalled();
  });

  it("still 400s when UTR is missing (UTR check must remain before snapshot short-circuit)", async () => {
    // Snapshot present, but UTR is missing — the UTR check must fire first.
    const filing = makeFiling({
      filedComputationsIxbrl: "<SNAPSHOT/>",
      company: {
        userId: "user-1",
        companyName: "Test Co Ltd",
        companyRegistrationNumber: "12345678",
        uniqueTaxReference: null, // <-- no UTR
        shareCapital: 1,
        filingDirectorName: "Jane Director",
        user: { name: "Jane Director" },
      },
    });
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(filing as never);

    const res = await getComputations(makeComputationsRequest());

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: "Company has no UTR set" });
    // Generator must not be called either way.
    expect(generateDormantTaxComputationsIxbrl).not.toHaveBeenCalled();
  });
});
