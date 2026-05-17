# Filing Preview & Filed-Document Record Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users see the exact document before filing, and view an accurate record of what was filed afterwards (official Companies House PDFs for accounts; our persisted iXBRL for CT600).

**Architecture:** Persist the exact rendered iXBRL on the `Filing` row at submit. Make the existing (currently-unwired) preview routes snapshot-aware. Surface one reusable `FiledDocumentViewer` at three lifecycle points: a new dedicated Preview step in both filing flows, the post-filing CT600 receipt, and the post-filing accounts view (official CH PDF via a new server proxy, with the persisted iXBRL as a labelled interim copy during CH's publication lag). Add a CH historical-accounts panel. No new cron — lag handled lazily on view.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 (Postgres), Vitest, NextAuth v4, Companies House Filing History + Document REST APIs.

**Spec:** `docs/superpowers/specs/2026-05-17-filing-preview-and-record-design.md`

**Conventions:** TDD (@superpowers:test-driven-development) for every testable unit. Tests live in `src/__tests__/` mirroring `src/`. Run `npm test -- <path>` for one file. Commit after each task. Final gate via @superpowers:verification-before-completion.

---

## File Structure

**Create:**
- `src/lib/post-filing-resolution.ts` — pure resolver: filing + CH list → `official | interim | legacy-none`
- `src/lib/companies-house/document.ts` — fetch official accounts PDF from CH Document API
- `src/app/api/file/official-accounts/route.ts` — server proxy streaming the official CH PDF
- `src/components/filed-document-viewer.tsx` — reusable embedded document viewer
- Tests mirroring each of the above + flow/route changes

**Modify:**
- `prisma/schema.prisma` — two nullable columns on `Filing`
- `src/app/api/file/submit-accounts/route.ts:351` — persist `filedAccountsIxbrl` on success
- `src/app/api/file/submit/route.ts:376` — persist both columns on success
- `src/app/api/file/preview-accounts/route.ts` — serve snapshot if present
- `src/app/api/file/preview-computations/route.ts` — serve snapshot if present
- `src/lib/companies-house/filing-history.ts` — add `fetchAccountsFilingDocuments` + export `TOLERANCE_MS` (do not change existing fns)
- `src/app/(app)/file/[companyId]/accounts/page.tsx` — forward a resolved `filingId`
- `src/app/(app)/file/[companyId]/ct600/page.tsx` — forward a resolved `filingId`
- `src/app/(app)/file/[companyId]/accounts/accounts-flow.tsx` — add `preview` step
- `src/app/(app)/file/[companyId]/ct600/filing-flow.tsx` — add `preview` step
- `src/app/(app)/company/[companyId]/receipt/[filingId]/page.tsx` — document action
- `src/app/(app)/company/[companyId]/page.tsx` — fetch CH docs, pass to FilingsTab
- `src/components/filings-tab.tsx` — "Companies House record" panel

---

## Task 1: Schema — persist filed iXBRL

**Files:**
- Modify: `prisma/schema.prisma` (Filing model, after `responsePayload`/`irmark` block, ~line 115)

- [ ] **Step 1: Add columns**

In `prisma/schema.prisma`, inside `model Filing`, add:

```prisma
  filedAccountsIxbrl      String?
  filedComputationsIxbrl  String?
```

- [ ] **Step 2: Create migration**

Run: `npx prisma migrate dev --name filing_filed_ixbrl_snapshot`
Expected: migration created under `prisma/migrations/`, applied, "Your database is now in sync".

- [ ] **Step 3: Regenerate client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client".

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(db): add filedAccountsIxbrl/filedComputationsIxbrl snapshot columns"
```

---

## Task 2: Persist iXBRL at submit — accounts (TDD)

**Files:**
- Test: `src/__tests__/api/file/submit-accounts-persist.test.ts` (create)
- Modify: `src/app/api/file/submit-accounts/route.ts:351`

- [ ] **Step 1: Write the failing test**

Model the mock setup on `src/__tests__/api/file/submit-accounts-gate.test.ts`. Create:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    company: { findFirst: vi.fn() },
    filing: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));
vi.mock("@/lib/companies-house/submission-client", () => ({
  submitToCompaniesHouse: vi.fn(),
}));
vi.mock("@/lib/ixbrl/dormant-accounts", () => ({
  generateDormantAccountsIxbrl: vi.fn(() => "<html>ACCOUNTS_IXBRL</html>"),
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
  const filingRow = {
    id: "filing-1", companyId: "comp-1", filingType: "accounts",
    periodStart: new Date("2023-01-01"), periodEnd: new Date("2023-12-31"),
    startDate: null, endDate: null, status: "outstanding",
  };
  vi.mocked(prisma.filing.findFirst).mockResolvedValue(filingRow as never);
  vi.mocked(prisma.filing.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.filing.update).mockResolvedValue(filingRow as never);
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
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- src/__tests__/api/file/submit-accounts-persist.test.ts`
Expected: FAIL — success update lacks `filedAccountsIxbrl`.

> Note: if unrelated required body fields surface, align the `makeRequest` body / company mock with the route's actual reads (read `submit-accounts/route.ts` top-to-`:311`). The two assertions (persist on success, not on failure) must remain.

- [ ] **Step 3: Implement**

In `src/app/api/file/submit-accounts/route.ts`, in the success block at line ~351, add the field to the `data` object:

```ts
    await prisma.filing.update({
      where: { id: filing.id },
      data: {
        status: "submitted",
        correlationId: submissionResult.submissionId,
        submissionNumber,
        pollInterval: submissionResult.pollInterval,
        submittedAt: new Date(),
        filedAccountsIxbrl: accountsIxbrl,
      },
    });
```

Leave both `status: "failed"` updates (lines ~337, ~370) untouched — they must not carry the iXBRL.

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- src/__tests__/api/file/submit-accounts-persist.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/file/submit-accounts/route.ts src/__tests__/api/file/submit-accounts-persist.test.ts
git commit -m "feat: persist filedAccountsIxbrl at successful CH submission"
```

---

## Task 3: Persist iXBRL at submit — CT600 (TDD)

**Files:**
- Test: `src/__tests__/api/file/submit-ct600-persist.test.ts` (create)
- Modify: `src/app/api/file/submit/route.ts:376`

- [ ] **Step 1: Write the failing test**

Mirror Task 2's structure but for `@/app/api/file/submit/route`. Mock `@/lib/hmrc/xml-builder` (`buildGovTalkMessage` → returns a string containing `<IRmark>X</IRmark>`), `@/lib/hmrc/submission-client` (`submitToHmrc` → `{ correlationId, pollInterval, endpoint }`), `@/lib/ixbrl/dormant-accounts` (`generateDormantAccountsIxbrl` → `"<html>ACC</html>"`), `@/lib/ixbrl/tax-computations` (`generateDormantTaxComputationsIxbrl` → `"<html>COMP</html>"`). Company mock must include `uniqueTaxReference: "1234567890"`, `registeredForCorpTax: true`. Assert the `status:"submitted"` update `data` matches `{ filedAccountsIxbrl: "<html>ACC</html>", filedComputationsIxbrl: "<html>COMP</html>" }`, and a `status:"failed"` path carries neither.

- [ ] **Step 2: Run test, verify fail**

Run: `npm test -- src/__tests__/api/file/submit-ct600-persist.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

In `src/app/api/file/submit/route.ts`, success block ~line 376, add to `data`:

```ts
        filedAccountsIxbrl: accountsIxbrl,
        filedComputationsIxbrl: computationsIxbrl,
```

Leave the three `status:"failed"` updates untouched.

- [ ] **Step 4: Run test, verify pass**

Run: `npm test -- src/__tests__/api/file/submit-ct600-persist.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/file/submit/route.ts src/__tests__/api/file/submit-ct600-persist.test.ts
git commit -m "feat: persist filed accounts+computations iXBRL at successful HMRC submission"
```

---

## Task 4: Snapshot-aware preview routes (TDD)

**Files:**
- Test: `src/__tests__/api/file/preview-snapshot.test.ts` (create)
- Modify: `src/app/api/file/preview-accounts/route.ts`, `src/app/api/file/preview-computations/route.ts`

- [ ] **Step 1: Write the failing test**

Mock `next-auth`, `@/lib/auth`, `@/lib/db` (`prisma.filing.findFirst`, `prisma.user.findUnique`), and the two generators. For preview-accounts:
- When `filing.filedAccountsIxbrl` is a non-empty string → response body equals it verbatim and `generateDormantAccountsIxbrl` is **not** called.
- When `filing.filedAccountsIxbrl` is `null` → `generateDormantAccountsIxbrl` **is** called (regenerate live).
Use a `GET` request `new NextRequest("http://localhost/api/file/preview-accounts?filingId=filing-1")`; owner: `filing.company.userId === session.user.id`. Add the symmetric pair for preview-computations / `filedComputationsIxbrl`.

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/__tests__/api/file/preview-snapshot.test.ts`
Expected: FAIL (route always regenerates today).

- [ ] **Step 3: Implement**

In `preview-accounts/route.ts`, after the ownership check and before `generateDormantAccountsIxbrl(...)`, insert:

```ts
  if (filing.filedAccountsIxbrl) {
    const headers: Record<string, string> = download
      ? {
          "Content-Type": "application/xhtml+xml; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filing.company.companyRegistrationNumber}-accounts-${(filing.endDate ?? filing.periodEnd).toISOString().slice(0, 10)}.html"`,
        }
      : { "Content-Type": "text/html; charset=utf-8" };
    return new NextResponse(filing.filedAccountsIxbrl, { headers });
  }
```

Apply the analogous block to `preview-computations/route.ts` using `filing.filedComputationsIxbrl` and the existing computations filename pattern. (The post-UTR-check ordering in computations is preserved — the snapshot short-circuit goes immediately before `generateDormantTaxComputationsIxbrl`.)

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/__tests__/api/file/preview-snapshot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/file/preview-accounts/route.ts src/app/api/file/preview-computations/route.ts src/__tests__/api/file/preview-snapshot.test.ts
git commit -m "feat: serve persisted iXBRL from preview routes when present (snapshot-aware)"
```

---

## Task 5: CH — `fetchAccountsFilingDocuments` + Document API (TDD)

**Files:**
- Modify: `src/lib/companies-house/filing-history.ts` (add export `TOLERANCE_MS`; add `fetchAccountsFilingDocuments`; **do not** change `fetchFilingHistory*`/`detectAccountsGaps`)
- Create: `src/lib/companies-house/document.ts`
- Test: extend `src/__tests__/lib/companies-house/filing-history.test.ts`; create `src/__tests__/lib/companies-house/document.test.ts`

- [ ] **Step 1: Write failing tests (filing-history)**

Append to `src/__tests__/lib/companies-house/filing-history.test.ts`:

```ts
import { fetchAccountsFilingDocuments } from "@/lib/companies-house/filing-history";

describe("fetchAccountsFilingDocuments", () => {
  beforeEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("returns enriched AA* entries with document metadata url", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "k");
    vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "https://api.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      items: [
        { type: "AA", date: "2024-02-01", transaction_id: "tx1",
          description_values: { made_up_date: "2023-12-31" },
          links: { document_metadata: "https://doc.test/abc" } },
        { type: "GAZ1", date: "2024-01-01" },
      ],
    }), { status: 200 }));

    const out = await fetchAccountsFilingDocuments("12345678");
    expect(out).toEqual([{
      madeUpDate: new Date("2023-12-31"),
      type: "AA",
      date: new Date("2024-02-01"),
      transactionId: "tx1",
      documentMetadataUrl: "https://doc.test/abc",
    }]);
  });

  it("returns [] on API failure (graceful)", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "k");
    vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "https://api.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response("x", { status: 500 }));
    expect(await fetchAccountsFilingDocuments("12345678")).toEqual([]);
  });

  it("returns [] when unconfigured", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "");
    vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "");
    expect(await fetchAccountsFilingDocuments("12345678")).toEqual([]);
  });
});

describe("regression: existing fetchFilingHistoryStrict shape unchanged", () => {
  it("still maps AA items to Date[]", async () => {
    vi.unstubAllEnvs(); vi.restoreAllMocks();
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "k");
    vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "https://api.test");
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({
      items: [{ type: "AA", description_values: { made_up_date: "2023-12-31" } }],
    }), { status: 200 }));
    expect(await fetchFilingHistoryStrict("12345678")).toEqual([new Date("2023-12-31")]);
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/__tests__/lib/companies-house/filing-history.test.ts`
Expected: FAIL — `fetchAccountsFilingDocuments` not exported.

- [ ] **Step 3: Implement in `filing-history.ts`**

Change `const TOLERANCE_MS` (line 9) to `export const TOLERANCE_MS`. Append (do not modify existing functions):

```ts
export interface ChAccountsFilingDoc {
  madeUpDate: Date;
  type: string;
  date: Date | null;
  transactionId: string | null;
  documentMetadataUrl: string | null;
}

export async function fetchAccountsFilingDocuments(
  companyNumber: string,
): Promise<ChAccountsFilingDoc[]> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) return [];
  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  try {
    const res = await fetch(
      `${endpoint}/company/${encodeURIComponent(companyNumber)}/filing-history?category=accounts&items_per_page=100`,
      { headers: { Authorization: `Basic ${basicAuth}` } },
    );
    if (!res.ok) {
      console.error(`CH filing history (docs) returned ${res.status} for ${companyNumber}`);
      return [];
    }
    const data = await res.json();
    const items: Array<{
      type?: string;
      date?: string;
      transaction_id?: string;
      description_values?: { made_up_date?: string };
      links?: { document_metadata?: string };
    }> = data.items ?? [];
    return items
      .filter((i) => i.type?.startsWith("AA") && i.description_values?.made_up_date)
      .map((i) => ({
        madeUpDate: new Date(i.description_values!.made_up_date!),
        type: i.type!,
        date: i.date ? new Date(i.date) : null,
        transactionId: i.transaction_id ?? null,
        documentMetadataUrl: i.links?.document_metadata ?? null,
      }));
  } catch (error) {
    console.error("Failed to fetch CH filing documents:", error);
    return [];
  }
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/__tests__/lib/companies-house/filing-history.test.ts`
Expected: PASS (new + existing + regression all green).

- [ ] **Step 5: Document API test + impl**

Create `src/__tests__/lib/companies-house/document.test.ts`: with env stubbed, `fetchOfficialAccountsPdf("https://doc.test/abc")` issues `GET https://doc.test/abc/content` with `Accept: application/pdf` + Basic auth and returns an `ArrayBuffer` on 200; returns `null` on non-OK / network error / unconfigured.

Create `src/lib/companies-house/document.ts`:

```ts
export async function fetchOfficialAccountsPdf(
  documentMetadataUrl: string,
): Promise<ArrayBuffer | null> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey || !documentMetadataUrl) return null;
  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  try {
    const res = await fetch(`${documentMetadataUrl}/content`, {
      headers: { Authorization: `Basic ${basicAuth}`, Accept: "application/pdf" },
      redirect: "follow",
    });
    if (!res.ok) {
      console.error(`CH document content returned ${res.status}`);
      return null;
    }
    return await res.arrayBuffer();
  } catch (error) {
    console.error("Failed to fetch CH document content:", error);
    return null;
  }
}
```

Run: `npm test -- src/__tests__/lib/companies-house/document.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/companies-house/filing-history.ts src/lib/companies-house/document.ts src/__tests__/lib/companies-house/filing-history.test.ts src/__tests__/lib/companies-house/document.test.ts
git commit -m "feat(ch): fetch enriched accounts filing docs + official PDF (existing fns untouched)"
```

---

## Task 6: Post-filing resolution pure function (TDD)

**Files:**
- Create: `src/lib/post-filing-resolution.ts`
- Test: `src/__tests__/lib/post-filing-resolution.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { resolvePostFilingDocument } from "@/lib/post-filing-resolution";

const ch = (madeUpDate: string, url: string | null = "https://doc/x") => ({
  madeUpDate: new Date(madeUpDate), type: "AA", date: null,
  transactionId: "t", documentMetadataUrl: url,
});

describe("resolvePostFilingDocument", () => {
  it("official when an AA doc matches periodEnd within 31 days", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: true, chFilings: [ch("2024-01-10")],
    })).toEqual({ kind: "official", documentMetadataUrl: "https://doc/x" });
  });

  it("interim when no CH match but a snapshot exists", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: true, chFilings: [ch("2022-12-31")],
    })).toEqual({ kind: "interim" });
  });

  it("legacy-none when no CH match and no snapshot", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: false, chFilings: [],
    })).toEqual({ kind: "legacy-none" });
  });

  it("not official beyond tolerance (46 days)", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: true, chFilings: [ch("2024-02-15")],
    })).toEqual({ kind: "interim" });
  });

  it("not official when match has no document url", () => {
    expect(resolvePostFilingDocument({
      periodEnd: new Date("2023-12-31"), filingType: "accounts",
      hasSnapshot: true, chFilings: [ch("2024-01-02", null)],
    })).toEqual({ kind: "interim" });
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/__tests__/lib/post-filing-resolution.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
import { TOLERANCE_MS, type ChAccountsFilingDoc } from "@/lib/companies-house/filing-history";

export type PostFilingResolution =
  | { kind: "official"; documentMetadataUrl: string }
  | { kind: "interim" }
  | { kind: "legacy-none" };

export function resolvePostFilingDocument(args: {
  periodEnd: Date;
  filingType: string;
  hasSnapshot: boolean;
  chFilings: ChAccountsFilingDoc[];
}): PostFilingResolution {
  const { periodEnd, filingType, hasSnapshot, chFilings } = args;
  if (filingType === "accounts") {
    const match = chFilings.find(
      (f) =>
        f.type.startsWith("AA") &&
        f.documentMetadataUrl &&
        Math.abs(f.madeUpDate.getTime() - periodEnd.getTime()) <= TOLERANCE_MS,
    );
    if (match) {
      return { kind: "official", documentMetadataUrl: match.documentMetadataUrl! };
    }
  }
  return hasSnapshot ? { kind: "interim" } : { kind: "legacy-none" };
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/__tests__/lib/post-filing-resolution.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/post-filing-resolution.ts src/__tests__/lib/post-filing-resolution.test.ts
git commit -m "feat: post-filing document resolution (official|interim|legacy-none)"
```

---

## Task 7: Official accounts PDF proxy route (TDD)

**Files:**
- Create: `src/app/api/file/official-accounts/route.ts`
- Test: `src/__tests__/api/file/official-accounts.test.ts`

- [ ] **Step 1: Write the failing test**

Mock `next-auth`, `@/lib/auth`, `@/lib/db` (`prisma.filing.findFirst`, `prisma.user.findUnique`), `@/lib/companies-house/filing-history` (`fetchAccountsFilingDocuments`), `@/lib/companies-house/document` (`fetchOfficialAccountsPdf`). Cases:
- No session → 401.
- Filing exists, requester not owner & not admin → 404.
- Owner + CH match + PDF bytes → 200, `Content-Type: application/pdf`, body is the bytes.
- Owner + no CH match → 409 JSON `{ status: "pending" }`.
- Owner + CH match but `fetchOfficialAccountsPdf` returns null → 502 JSON `{ status: "unavailable" }`.

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/__tests__/api/file/official-accounts.test.ts`
Expected: FAIL — route missing.

- [ ] **Step 3: Implement**

```ts
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchAccountsFilingDocuments } from "@/lib/companies-house/filing-history";
import { fetchOfficialAccountsPdf } from "@/lib/companies-house/document";
import { resolvePostFilingDocument } from "@/lib/post-filing-resolution";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filingId = req.nextUrl.searchParams.get("filingId");
  if (!filingId) {
    return NextResponse.json({ error: "filingId required" }, { status: 400 });
  }
  const filing = await prisma.filing.findFirst({
    where: { id: filingId },
    include: { company: true },
  });
  if (!filing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = filing.company.userId === session.user.id;
  let isAdmin = false;
  if (!isOwner) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id }, select: { isAdmin: true },
    });
    isAdmin = me?.isAdmin === true;
  }
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const chFilings = await fetchAccountsFilingDocuments(
    filing.company.companyRegistrationNumber,
  );
  const resolution = resolvePostFilingDocument({
    periodEnd: filing.endDate ?? filing.periodEnd,
    filingType: filing.filingType,
    hasSnapshot: !!filing.filedAccountsIxbrl,
    chFilings,
  });
  if (resolution.kind !== "official") {
    return NextResponse.json({ status: "pending" }, { status: 409 });
  }
  const pdf = await fetchOfficialAccountsPdf(resolution.documentMetadataUrl);
  if (!pdf) {
    return NextResponse.json({ status: "unavailable" }, { status: 502 });
  }
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filing.company.companyRegistrationNumber}-accounts.pdf"`,
    },
  });
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/__tests__/api/file/official-accounts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/file/official-accounts/route.ts src/__tests__/api/file/official-accounts.test.ts
git commit -m "feat: official Companies House accounts PDF proxy route"
```

---

## Task 8: `FiledDocumentViewer` component (TDD, jsdom)

**Files:**
- Create: `src/components/filed-document-viewer.tsx`
- Test: `src/__tests__/components/filed-document-viewer.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import FiledDocumentViewer from "@/components/filed-document-viewer";

describe("FiledDocumentViewer", () => {
  it("renders an iframe with the src and a sandbox without allow-scripts", () => {
    render(<FiledDocumentViewer src="/api/file/preview-accounts?filingId=1"
      downloadHref="/api/file/preview-accounts?filingId=1&download=1"
      context="pre-filing" title="Dormant accounts" />);
    const frame = screen.getByTitle("Dormant accounts") as HTMLIFrameElement;
    expect(frame.tagName).toBe("IFRAME");
    expect(frame).toHaveAttribute("src", "/api/file/preview-accounts?filingId=1");
    expect(frame.getAttribute("sandbox")).toBe("");
  });

  it("shows the pre-filing label", () => {
    render(<FiledDocumentViewer src="/x" downloadHref="/x?download=1"
      context="pre-filing" title="t" />);
    expect(screen.getByText(/exactly what will be submitted/i)).toBeInTheDocument();
  });

  it("shows the interim label for post-accounts-interim", () => {
    render(<FiledDocumentViewer src="/x" downloadHref="/x?download=1"
      context="post-accounts-interim" title="t" />);
    expect(screen.getByText(/official copy from companies house/i)).toBeInTheDocument();
  });

  it("renders a download link", () => {
    render(<FiledDocumentViewer src="/x" downloadHref="/x?download=1"
      context="post-ct600" title="t" />);
    expect(screen.getByRole("link", { name: /download/i }))
      .toHaveAttribute("href", "/x?download=1");
  });
});
```

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/__tests__/components/filed-document-viewer.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement** (Tailwind only, per CLAUDE.md — no inline styles; use `cn` if needed)

```tsx
"use client";

import { Download } from "lucide-react";

type Context = "pre-filing" | "post-ct600" | "post-accounts-interim";

const LABEL: Record<Context, string> = {
  "pre-filing": "This is exactly what will be submitted.",
  "post-ct600": "This is the return filed with HMRC.",
  "post-accounts-interim":
    "Our copy — the official copy from Companies House will be available shortly.",
};

export default function FiledDocumentViewer({
  src, downloadHref, context, title,
}: {
  src: string;
  downloadHref: string;
  context: Context;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-secondary m-0">{LABEL[context]}</p>
        <a
          href={downloadHref}
          className="focus-ring inline-flex items-center gap-1.5 text-[13px] font-semibold text-primary no-underline"
        >
          <Download size={14} strokeWidth={2} />
          Download
        </a>
      </div>
      <iframe
        title={title}
        src={src}
        sandbox=""
        className="w-full h-[600px] bg-card border border-border rounded-lg"
      />
    </div>
  );
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/__tests__/components/filed-document-viewer.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/filed-document-viewer.tsx src/__tests__/components/filed-document-viewer.test.tsx
git commit -m "feat: reusable FiledDocumentViewer (sandboxed iframe + download + context label)"
```

---

## Task 9: Forward a resolved `filingId` into both flows

The flows need a `filingId` to address the preview routes; the pages currently resolve a period but never pass an id, and the `periodEnd`-only entry path has no id at all.

**Files:**
- Modify: `src/app/(app)/file/[companyId]/accounts/page.tsx`, `src/app/(app)/file/[companyId]/ct600/page.tsx`
- Modify: prop types of `AccountsFlow` / `FilingFlow` (Tasks 10/11 consume it)

- [ ] **Step 1: Resolve a filing row id in `accounts/page.tsx`**

In the `filingId` branch you already load `filing` — capture `resolvedFilingId = filing.id`. In the `periodEndParam` branch, after computing `periodStart/periodEnd`, look up the outstanding row:

```ts
  let resolvedFilingId: string;
  if (filingId) {
    const filing = await prisma.filing.findFirst({
      where: { id: filingId, companyId: company.id, company: { userId: session.user.id } },
    });
    if (!filing) redirect(`/company/${companyId}`);
    periodStart = filing.startDate ?? filing.periodStart;
    periodEnd = filing.endDate ?? filing.periodEnd;
    resolvedFilingId = filing.id;
  } else if (periodEndParam) {
    periodEnd = new Date(periodEndParam);
    if (isNaN(periodEnd.getTime())) redirect(`/company/${companyId}`);
    periodStart = new Date(periodEnd);
    periodStart.setUTCFullYear(periodStart.getUTCFullYear() - 1);
    periodStart.setUTCDate(periodStart.getUTCDate() + 1);
    const row = await prisma.filing.findFirst({
      where: {
        companyId: company.id, filingType: "accounts",
        periodEnd, status: { notIn: ["accepted"] },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!row) redirect(`/company/${companyId}`);
    resolvedFilingId = row.id;
  } else {
    redirect(`/company/${companyId}`);
  }
```

Pass `filingId={resolvedFilingId}` to `<AccountsFlow .../>`.

> **Row-consistency:** the `submit-accounts` route resolves its lockable row by `status: "outstanding"`. The `notIn: ["accepted"]` lookup here is broader (so a previously-failed/rejected row can still be previewed/retried). When duplicates exist for a period this could preview a different row than submit locks. Acceptable for v1 (preview is read-only and regenerated from the same live company data submit uses), but add an inline code comment noting the divergence so a future change keeps them aligned.

- [ ] **Step 2: Same for `ct600/page.tsx`** with `filingType: "ct600"`.

- [ ] **Step 3: Build check**

Run: `npm run build`
Expected: type-checks (after Tasks 10/11 add the prop; if doing strictly sequentially, temporarily add `filingId: string` to each flow's `Props` now so the build passes — Tasks 10/11 then consume it).

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/file/[companyId]/accounts/page.tsx" "src/app/(app)/file/[companyId]/ct600/page.tsx"
git commit -m "feat: resolve and forward filingId into filing flows"
```

---

## Task 10: Preview step in the accounts flow

**Files:**
- Modify: `src/app/(app)/file/[companyId]/accounts/accounts-flow.tsx`
- Test: `src/__tests__/components/accounts-flow-preview.test.tsx` (jsdom)

- [ ] **Step 1: Write the failing test**

`/** @vitest-environment jsdom */`. Mock `next/navigation` (`useRouter: () => ({ push: vi.fn() })`) and stub `global.fetch` so `DirectorConfirm`'s `GET /api/company/directors` resolves `{ directors: [{ name: "Jane", appointedOn: null }], saved: "Jane", chError: false }`. Render `<AccountsFlow ... filingId="f1" />`. `await waitFor` directors load; the single director auto-selects → click **Continue** → assert a **Preview** heading + an `<iframe>` whose `src` is `/api/file/preview-accounts?filingId=f1` is shown, and the credentials/auth step is NOT yet shown. Click the preview **Continue** → assert the Companies House authentication step appears.

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/__tests__/components/accounts-flow-preview.test.tsx`
Expected: FAIL — no preview step.

- [ ] **Step 3: Implement**

- Add `filingId: string` to `Props`; thread it from the page.
- Extend `type Step = "confirm" | "preview" | "authenticate" | "submitting" | "result";`
- Add a `StepPreview` component using `FiledDocumentViewer`:

```tsx
function StepPreview({ filingId, onBack, onContinue }: {
  filingId: string; onBack: () => void; onContinue: () => void;
}) {
  const src = `/api/file/preview-accounts?filingId=${encodeURIComponent(filingId)}`;
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-[26px] font-bold text-foreground mb-2 tracking-[-0.02em]">
          Review the accounts to be filed
        </h1>
        <p className="text-[15px] text-body m-0 leading-relaxed">
          This is the exact document we will submit to Companies House.
        </p>
      </div>
      <div className="bg-card rounded-xl p-8 shadow-card">
        <FiledDocumentViewer
          src={src}
          downloadHref={`${src}&download=1`}
          context="pre-filing"
          title="Dormant accounts to be filed"
        />
        <div className="flex gap-3 mt-7">
          <button onClick={onBack} className="focus-ring flex-1 py-3 px-6 rounded-lg font-semibold text-base border border-border bg-transparent text-secondary cursor-pointer hover:opacity-80">
            Back
          </button>
          <button onClick={onContinue} className="focus-ring flex-1 py-3 px-6 rounded-lg font-semibold text-base border-0 bg-cta text-card cursor-pointer hover:opacity-90 hover:-translate-y-px">
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
```

- Confirm step's `onContinue` → `setStep("preview")`.
- Add render branch: `if (step === "preview") return <StepPreview filingId={filingId} onBack={() => setStep("confirm")} onContinue={() => setStep("authenticate")} />;`
- The `authenticate` branch is unchanged (still leads to `FilingConfirmationDialog`).

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/__tests__/components/accounts-flow-preview.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/file/[companyId]/accounts/accounts-flow.tsx" src/__tests__/components/accounts-flow-preview.test.tsx
git commit -m "feat: dedicated accounts preview step before authentication"
```

---

## Task 11: Preview step in the CT600 flow

**Files:**
- Modify: `src/app/(app)/file/[companyId]/ct600/filing-flow.tsx`
- Test: `src/__tests__/components/filing-flow-preview.test.tsx` (jsdom)

- [ ] **Step 1: Failing test** — mirror Task 10. Preview src is `/api/file/preview-computations?filingId=f1`; assert a secondary link/iframe is also available for the attached accounts (`/api/file/preview-accounts?filingId=f1`). After preview Continue → the Government Gateway **credentials** step shows.

- [ ] **Step 2: Run, verify fail**

Run: `npm test -- src/__tests__/components/filing-flow-preview.test.tsx`
Expected: FAIL.

⚠️ **Name collision (must fix):** `filing-flow.tsx:557` already declares `const [filingId, setFilingId] = useState<string|null>(null)` (post-submission, set at line 583, reset at 652, consumed by `StepResult`). Adding a `filingId` **prop** will cause "block-scoped variable already declared". Resolution: name the new prop `filingId`; **rename the existing state** to `submittedFilingId` / `setSubmittedFilingId` and update all three references (557, 583, 652) and the `StepResult` `filingId={...}` pass-through. Accounts flow (Task 10) has **no** such state, so no rename there.

- [ ] **Step 3: Implement** — same pattern as Task 10: add `filingId` prop (with the rename above), `"preview"` in `Step`, a `StepPreview` showing the **computations** via `FiledDocumentViewer` (`context="pre-filing"`, title "Corporation Tax computations") with a short note + secondary action linking the attached accounts iXBRL (`/api/file/preview-accounts?filingId=...`, open in new tab). Confirm `onContinue` → `setStep("preview")`; preview Continue → `setStep("credentials")`; Back → `setStep("confirm")`.

- [ ] **Step 4: Run, verify pass**

Run: `npm test -- src/__tests__/components/filing-flow-preview.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/file/[companyId]/ct600/filing-flow.tsx" src/__tests__/components/filing-flow-preview.test.tsx
git commit -m "feat: dedicated CT600 preview step (computations + attached accounts)"
```

---

## Task 12: Receipt page document action (accounts + CT600)

**Files:**
- Modify: `src/app/(app)/company/[companyId]/receipt/[filingId]/page.tsx`

This is an async server component; the `status === "accepted"` guard at line 32 stays (post-filing affordance is accepted-only, per spec §E). The page already loads `filing` with `include: { company: true }` (line 29), so `filing.company.companyRegistrationNumber` is available — **no query change needed** for the CH fetch.

- [ ] **Step 1: Implement accounts branch**

After loading `filing`, when `filing.filingType === "accounts"`:

```ts
import { fetchAccountsFilingDocuments } from "@/lib/companies-house/filing-history";
import { resolvePostFilingDocument } from "@/lib/post-filing-resolution";
import FiledDocumentViewer from "@/components/filed-document-viewer";

// ...inside the component, accounts only:
const chFilings = await fetchAccountsFilingDocuments(
  filing.company.companyRegistrationNumber,
);
const resolution = resolvePostFilingDocument({
  periodEnd: filing.endDate ?? filing.periodEnd,
  filingType: filing.filingType,
  hasSnapshot: !!filing.filedAccountsIxbrl,
  chFilings,
});
```

Render below the metadata block:
- `resolution.kind === "official"` → `FiledDocumentViewer` with `src={`/api/file/official-accounts?filingId=${filing.id}`}` (the proxy streams the PDF; browsers render PDF in the iframe), `context="post-ct600"`-style label replaced by a small "Official copy from Companies House" heading (pass a new `context` value if needed, or render the heading outside the viewer and keep `context="post-accounts-interim"` only for interim).
- `resolution.kind === "interim"` → `FiledDocumentViewer src={`/api/file/preview-accounts?filingId=${filing.id}`} context="post-accounts-interim"`.
- `resolution.kind === "legacy-none"` → a one-line note: official copy available on the Companies House website (deep link `https://find-and-update.company-information.service.gov.uk/company/{number}/filing-history`).

> Add an `"official"` context to `FiledDocumentViewer`'s `Context` union + `LABEL` map ("The official copy filed at Companies House.") and its component test rather than overloading an existing label.

- [ ] **Step 2: Implement CT600 branch**

When `filing.filingType === "ct600"`:
- `filing.filedComputationsIxbrl` present → `FiledDocumentViewer src={`/api/file/preview-computations?filingId=${filing.id}`} context="post-ct600"` + a secondary link to the attached accounts (`/api/file/preview-accounts?filingId=${filing.id}`, new tab).
- Absent (legacy) → dated note: "The filed document was not retained for filings made before this feature."

- [ ] **Step 3: Verify build + existing receipt test (if any)**

Run: `npm run build && npm test -- src/__tests__`
Expected: build OK; suite green.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/company/[companyId]/receipt/[filingId]/page.tsx" src/components/filed-document-viewer.tsx src/__tests__/components/filed-document-viewer.test.tsx
git commit -m "feat: receipt page shows the filed document (official CH PDF / interim / CT600 render)"
```

---

## Task 13: Companies House historical record panel

**Files:**
- Modify: `src/app/(app)/company/[companyId]/page.tsx` (server: fetch CH docs, pass prop)
- Modify: `src/components/filings-tab.tsx` (render panel in the Completed sub-tab)

- [ ] **Step 1: Server fetch + prop**

In `company/[companyId]/page.tsx`, before rendering `<FilingsTab .../>`, fetch once:

```ts
import { fetchAccountsFilingDocuments } from "@/lib/companies-house/filing-history";
// ...
const chAccountsFilings = await fetchAccountsFilingDocuments(
  company.companyRegistrationNumber,
);
```

Pass `chAccountsFilings={chAccountsFilings.map(f => ({
  madeUpDate: f.madeUpDate.toISOString(), type: f.type,
  hasDocument: !!f.documentMetadataUrl,
}))}` plus the company number to `<FilingsTab/>`. (Serialise dates — client component.)

- [ ] **Step 2: Render panel**

In `filings-tab.tsx`, extend `FilingsTabProps` with `chAccountsFilings?: { madeUpDate: string; type: string; hasDocument: boolean }[]`. In the `completed` sub-tab, below the completed list, render a "Companies House record" card listing each CH accounts filing (most-recent first) by `madeUpDate`; each row with a document links to the find-and-update deep link for the company filing history (`https://find-and-update.company-information.service.gov.uk/company/{companyNumber}/filing-history`) in a new tab. Empty/unavailable → omit the panel (graceful — `fetchAccountsFilingDocuments` already returns `[]` on failure).

> Per-row direct official-PDF view is out of scope for v1 (the proxy is keyed by our `filingId`, not arbitrary CH transactions). The deep link gives accurate access to *all* historical/non-dormant filings — the stated bonus — without a new per-transaction proxy. Note this scope boundary in the panel's intro copy ("View on Companies House").

- [ ] **Step 3: Build + suite**

Run: `npm run build && npm test -- src/__tests__`
Expected: green.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/company/[companyId]/page.tsx" src/components/filings-tab.tsx
git commit -m "feat: Companies House historical accounts record panel"
```

---

## Task 14: Full verification gate

Use @superpowers:verification-before-completion — run and paste real output before claiming done.

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 2: Full test suite**

Run: `npm test`
Expected: all green, including the prior baseline plus new tests; no regressions in `filing-history`, `filing-views`, `filing-confirmation`, submit-gate.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Manual verification (TEST env, `CH_GATEWAY_TEST=1` / HMRC test endpoint)**

  - Accounts: from a company, click **File** → Confirm → **Preview shows the rendered iXBRL accounts (iframe) with Download** → Continue → auth code → `FilingConfirmationDialog` → submit → result. Open the receipt: immediately shows the **interim** copy ("official copy available shortly"); after CH publishes, it shows the **official PDF**.
  - CT600: same path; preview shows **computations** + link to attached accounts; receipt shows the persisted return.
  - Legacy: an already-accepted pre-feature accounts filing → receipt shows CH official PDF (or deep-link note); pre-feature CT600 → dated "not retained" note.
  - CH historical panel lists prior/known accounts filings with a working Companies House deep link.

- [ ] **Step 5: Finish**

Use @superpowers:finishing-a-development-branch to merge / PR `feature/filing-preview-and-record`.

---

## Notes / assumptions

- Spec §5 assumption stands: confirm `COMPANIES_HOUSE_API_KEY` is authorised for the Document API during Task 14 manual verification (test a real official PDF fetch). If the Document API needs a separate key, surface to the human before merge — `fetchOfficialAccountsPdf` already degrades to `null` (interim copy keeps working).
- No backfill (spec §5). No new cron — lag is resolved lazily on receipt view.
- Tailwind-only styling, `cn()` for conditionals (CLAUDE.md). Soft-delete / `companyGoneAt` redirects in the filing pages are unchanged.
