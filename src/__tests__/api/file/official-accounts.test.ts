import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

vi.mock("@/lib/companies-house/filing-history", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/companies-house/filing-history")>();
  return {
    ...actual,
    fetchAccountsFilingDocuments: vi.fn(),
  };
});

vi.mock("@/lib/companies-house/document", () => ({
  fetchOfficialAccountsPdf: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { fetchAccountsFilingDocuments } from "@/lib/companies-house/filing-history";
import { fetchOfficialAccountsPdf } from "@/lib/companies-house/document";
import { GET } from "@/app/api/file/official-accounts/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const OWNER_ID = "user-owner";
const OTHER_ID = "user-other";
const FILING_ID = "filing-123";
const CRN = "12345678";

// periodEnd within 31 days of the CH madeUpDate fixture below
const PERIOD_END = new Date("2023-03-31T00:00:00.000Z");
const PERIOD_START = new Date("2022-04-01T00:00:00.000Z");

const BASE_FILING = {
  id: FILING_ID,
  filingType: "accounts",
  periodStart: PERIOD_START,
  periodEnd: PERIOD_END,
  endDate: null,
  filedAccountsIxbrl: null,
  company: {
    userId: OWNER_ID,
    companyRegistrationNumber: CRN,
  },
};

// CH filing doc whose madeUpDate matches PERIOD_END exactly → "official" resolution
const CH_FILING_DOC = {
  type: "AA",
  madeUpDate: PERIOD_END,
  date: new Date("2023-05-01T00:00:00.000Z"),
  transactionId: "txn-1",
  documentMetadataUrl: "https://document-api.companieshouse.gov.uk/document/abc123",
};

// Small fake PDF bytes (used for the 200 success case)
const FAKE_PDF_BUFFER: ArrayBuffer = new TextEncoder().encode("%PDF-1.4").buffer as ArrayBuffer;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(filingId?: string): NextRequest {
  const url = filingId
    ? `http://localhost/api/file/official-accounts?filingId=${filingId}`
    : "http://localhost/api/file/official-accounts";
  return new NextRequest(url);
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/file/official-accounts", () => {
  it("returns 401 when there is no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET(makeRequest(FILING_ID));

    expect(res.status).toBe(401);
  });

  it("returns 404 when requester is not the owner and not an admin", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: OTHER_ID },
    } as never);
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(BASE_FILING as never);
    // Not an admin
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: OTHER_ID,
      isAdmin: false,
    } as never);

    const res = await GET(makeRequest(FILING_ID));

    expect(res.status).toBe(404);
  });

  it("returns 200 with PDF bytes when owner + CH match + PDF available", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: OWNER_ID },
    } as never);
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(BASE_FILING as never);
    // fetchAccountsFilingDocuments returns a matching doc → resolvePostFilingDocument → "official"
    vi.mocked(fetchAccountsFilingDocuments).mockResolvedValue([CH_FILING_DOC]);
    vi.mocked(fetchOfficialAccountsPdf).mockResolvedValue(FAKE_PDF_BUFFER);

    const res = await GET(makeRequest(FILING_ID));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");

    // Verify the body bytes equal the mocked buffer (full-array equality)
    const body = await res.arrayBuffer();
    expect(new Uint8Array(body)).toEqual(new Uint8Array(FAKE_PDF_BUFFER));

    // Content-Disposition must match the CRN-based inline filename
    expect(res.headers.get("Content-Disposition")).toBe(
      `inline; filename="${CRN}-accounts.pdf"`,
    );
  });

  it("returns 400 { error: 'filingId required' } when filingId query param is absent", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: OWNER_ID },
    } as never);

    // makeRequest() with no argument produces a URL with no filingId search param
    const res = await GET(makeRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "filingId required" });
  });

  it("returns 409 { status: 'pending' } when owner + no CH match", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: OWNER_ID },
    } as never);
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(BASE_FILING as never);
    // Empty list → no match → resolvePostFilingDocument returns "legacy-none" (hasSnapshot=false)
    vi.mocked(fetchAccountsFilingDocuments).mockResolvedValue([]);

    const res = await GET(makeRequest(FILING_ID));

    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body).toEqual({ status: "pending" });
  });

  it("returns 409 { status: 'pending' } when owner + snapshot present + no CH match (interim path)", async () => {
    // This exercises the "interim" branch of resolvePostFilingDocument (hasSnapshot=true, no CH match),
    // distinct from the "legacy-none" branch (hasSnapshot=false) tested above.
    // resolvePostFilingDocument is kept REAL; only fetchAccountsFilingDocuments is mocked to return [].
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: OWNER_ID },
    } as never);
    // Base filing with filedAccountsIxbrl set → hasSnapshot=true → real resolver returns "interim"
    vi.mocked(prisma.filing.findFirst).mockResolvedValue({
      ...BASE_FILING,
      filedAccountsIxbrl: "<xbrl>snapshot</xbrl>",
    } as never);
    // No CH match → resolver falls through to hasSnapshot branch
    vi.mocked(fetchAccountsFilingDocuments).mockResolvedValue([]);

    const res = await GET(makeRequest(FILING_ID));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ status: "pending" });
  });

  it("returns 502 { status: 'unavailable' } when CH match found but PDF fetch returns null", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: OWNER_ID },
    } as never);
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(BASE_FILING as never);
    vi.mocked(fetchAccountsFilingDocuments).mockResolvedValue([CH_FILING_DOC]);
    // PDF fetch fails → null
    vi.mocked(fetchOfficialAccountsPdf).mockResolvedValue(null);

    const res = await GET(makeRequest(FILING_ID));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body).toEqual({ status: "unavailable" });
  });
});
