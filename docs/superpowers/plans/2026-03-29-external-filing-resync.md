# External Filing Resync Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect accounts filings made outside DormantFile and sync internal state, via a daily cron and a manual refresh button.

**Architecture:** A shared `resyncFromCompaniesHouse()` function in `src/lib/companies-house/resync.ts` handles all resync logic — fetching CH filing history, diffing against DB, creating Filing records, and triggering roll-forward. Two thin triggers call it: a daily cron endpoint and a POST endpoint wired to a UI button.

**Tech Stack:** Next.js 16 App Router, Prisma 7, Companies House REST API, Vitest

**Spec:** `docs/superpowers/specs/2026-03-29-external-filing-resync-design.md`

---

## File Structure

| File                                               | Responsibility                                    |
| -------------------------------------------------- | ------------------------------------------------- |
| `src/lib/companies-house/filing-history.ts`        | Add `fetchFilingHistoryStrict` (throwing variant) |
| `src/lib/roll-forward.ts`                          | Add `options?: { skipEmail?: boolean }` parameter |
| `src/lib/companies-house/resync.ts`                | Core resync function                              |
| `src/app/api/cron/resync-filings/route.ts`         | Daily cron endpoint                               |
| `src/app/api/company/resync/route.ts`              | Manual refresh endpoint                           |
| `src/components/sync-button.tsx`                   | Client component: button + toast                  |
| `src/app/(app)/company/[companyId]/page.tsx`       | Add SyncButton to header                          |
| `vercel.json`                                      | Add cron schedule                                 |
| `src/__tests__/lib/companies-house/resync.test.ts` | Unit tests                                        |

---

### Task 1: Add `fetchFilingHistoryStrict` to filing-history.ts

**Files:**

- Modify: `src/lib/companies-house/filing-history.ts`
- Test: `src/__tests__/lib/companies-house/filing-history.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/__tests__/lib/companies-house/filing-history.test.ts`:

```ts
import {
  computeFirstPeriodEnd,
  detectAccountsGaps,
  fetchFilingHistoryStrict,
} from "@/lib/companies-house/filing-history";
import { describe, it, expect, vi, beforeEach } from "vitest";

describe("fetchFilingHistoryStrict", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns dates on successful response", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "test-key");
    vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "https://api.test");

    const mockResponse = {
      items: [
        {
          type: "AA",
          description_values: { made_up_date: "2023-12-31" },
        },
      ],
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const result = await fetchFilingHistoryStrict("12345678");
    expect(result).toEqual([new Date("2023-12-31")]);
  });

  it("throws on non-OK response", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "test-key");
    vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "https://api.test");

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Server Error", { status: 500 }),
    );

    await expect(fetchFilingHistoryStrict("12345678")).rejects.toThrow(
      "CH filing history API returned 500",
    );
  });

  it("throws on network error", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "test-key");
    vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "https://api.test");

    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    await expect(fetchFilingHistoryStrict("12345678")).rejects.toThrow("Network failure");
  });

  it("throws when env vars are missing", async () => {
    vi.stubEnv("COMPANIES_HOUSE_API_KEY", "");
    vi.stubEnv("COMPANY_INFORMATION_API_ENDPOINT", "");

    await expect(fetchFilingHistoryStrict("12345678")).rejects.toThrow(
      "Companies House API is not configured",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/lib/companies-house/filing-history.test.ts`
Expected: FAIL — `fetchFilingHistoryStrict` is not exported

- [ ] **Step 3: Implement `fetchFilingHistoryStrict`**

Add to `src/lib/companies-house/filing-history.ts` after the existing `fetchFilingHistory` function (after line 50):

```ts
/**
 * Same as fetchFilingHistory but throws on API failure instead of
 * returning []. Used by resync where we need to distinguish
 * "no filings" from "API down".
 */
export async function fetchFilingHistoryStrict(companyNumber: string): Promise<Date[]> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) {
    throw new Error("Companies House API is not configured");
  }

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");

  const res = await fetch(
    `${endpoint}/company/${encodeURIComponent(companyNumber)}/filing-history?category=accounts&items_per_page=100`,
    { headers: { Authorization: `Basic ${basicAuth}` } },
  );

  if (!res.ok) {
    throw new Error(`CH filing history API returned ${res.status} for ${companyNumber}`);
  }

  const data = await res.json();
  const items: Array<{
    type?: string;
    description_values?: { made_up_date?: string };
  }> = data.items ?? [];

  return items
    .filter((item) => item.type?.startsWith("AA") && item.description_values?.made_up_date)
    .map((item) => new Date(item.description_values!.made_up_date!));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/lib/companies-house/filing-history.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/companies-house/filing-history.ts src/__tests__/lib/companies-house/filing-history.test.ts
git commit -m "feat: add fetchFilingHistoryStrict throwing variant"
```

---

### Task 2: Add `skipEmail` option to `rollForwardPeriod`

**Files:**

- Modify: `src/lib/roll-forward.ts`

- [ ] **Step 1: Add `options` parameter and guard the email block**

In `src/lib/roll-forward.ts`, change the function signature (line 17-24) from:

```ts
export async function rollForwardPeriod(
  companyId: string,
  filedPeriodEnd: Date,
  registeredForCorpTax: boolean,
  filingType: "accounts" | "ct600",
  userEmail: string,
  companyName: string
): Promise<void> {
```

to:

```ts
export async function rollForwardPeriod(
  companyId: string,
  filedPeriodEnd: Date,
  registeredForCorpTax: boolean,
  filingType: "accounts" | "ct600",
  userEmail: string,
  companyName: string,
  options?: { skipEmail?: boolean }
): Promise<void> {
```

Then wrap the email block (lines 25-45) with a guard. Change:

```ts
  // Send confirmation email first (non-blocking)
  try {
    const filedPeriodStart = new Date(filedPeriodEnd);
```

to:

```ts
  // Send confirmation email first (non-blocking)
  if (!options?.skipEmail) {
    try {
      const filedPeriodStart = new Date(filedPeriodEnd);
```

And change the closing of the catch block (line 43-45):

```ts
  } catch {
    // Must not block
  }
```

to:

```ts
    } catch {
      // Must not block
    }
  }
```

This wraps the entire try/catch in the `if` guard with clear braces.

- [ ] **Step 2: Verify existing tests still pass**

Run: `npm test`
Expected: ALL PASS (existing callers don't pass `options`, so behaviour is unchanged)

- [ ] **Step 3: Commit**

```bash
git add src/lib/roll-forward.ts
git commit -m "feat: add skipEmail option to rollForwardPeriod"
```

---

### Task 3: Implement core `resyncFromCompaniesHouse` function

**Files:**

- Create: `src/lib/companies-house/resync.ts`
- Test: `src/__tests__/lib/companies-house/resync.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/companies-house/resync.test.ts`:

```ts
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
      { periodEnd: new Date("2024-03-31"), filingType: "accounts" } as never,
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
      { periodEnd: new Date("2024-03-31"), filingType: "accounts", status: "submitted" } as never,
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/lib/companies-house/resync.test.ts`
Expected: FAIL — `resyncFromCompaniesHouse` does not exist

- [ ] **Step 3: Implement `resyncFromCompaniesHouse`**

Create `src/lib/companies-house/resync.ts`:

```ts
import { prisma } from "@/lib/db";
import {
  fetchFilingHistoryStrict,
  detectAccountsGaps,
  computeFirstPeriodEnd,
} from "@/lib/companies-house/filing-history";
import { rollForwardPeriod } from "@/lib/roll-forward";

export interface ResyncResult {
  newFilingsCount: number;
  error?: string;
}

/**
 * Fetch the CH company profile to get incorporation date and ARD.
 * Same API call the onboarding flow makes.
 */
async function fetchCompanyProfile(
  companyNumber: string,
): Promise<{ dateOfCreation: string; ardMonth: number; ardDay: number }> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) {
    throw new Error("Companies House API is not configured");
  }

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  const res = await fetch(`${endpoint}/company/${encodeURIComponent(companyNumber)}`, {
    headers: { Authorization: `Basic ${basicAuth}` },
  });

  if (!res.ok) {
    throw new Error(`CH company profile API returned ${res.status}`);
  }

  const data = await res.json();
  const ard = data.accounts?.accounting_reference_date;

  let ardMonth: number;
  let ardDay: number;

  if (ard?.month && ard?.day) {
    ardMonth = parseInt(ard.month, 10);
    ardDay = parseInt(ard.day, 10);
  } else if (data.accounts?.next_accounts?.period_end_on) {
    const fallback = new Date(data.accounts.next_accounts.period_end_on);
    ardMonth = fallback.getUTCMonth() + 1;
    ardDay = fallback.getUTCDate();
  } else {
    throw new Error("Cannot determine accounting reference date");
  }

  return {
    dateOfCreation: data.date_of_creation,
    ardMonth,
    ardDay,
  };
}

export async function resyncFromCompaniesHouse(companyId: string): Promise<ResyncResult> {
  // Step 1: Load company with user
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { user: true, filings: true },
  });
  if (!company) return { newFilingsCount: 0, error: "Company not found" };

  // Step 2: Fetch CH profile for incorporation date and ARD
  let dateOfCreation: string;
  let ardMonth: number;
  let ardDay: number;
  try {
    const profile = await fetchCompanyProfile(company.companyRegistrationNumber);
    dateOfCreation = profile.dateOfCreation;
    ardMonth = profile.ardMonth;
    ardDay = profile.ardDay;
  } catch (err) {
    return { newFilingsCount: 0, error: (err as Error).message };
  }

  // Step 3: Fetch filing history (strict — throws on failure)
  let filedPeriodEnds: Date[];
  try {
    filedPeriodEnds = await fetchFilingHistoryStrict(company.companyRegistrationNumber);
  } catch (err) {
    return { newFilingsCount: 0, error: (err as Error).message };
  }

  // Step 4: Map CH dates to expected period ends
  // TODO: Known limitation — if ALL periods are filed externally,
  // detectAccountsGaps returns null and we return early without
  // recording those filings. The company's period pointer won't
  // advance. This only affects companies that filed every single
  // period outside DormantFile and have zero Filing records.
  const gapResult = detectAccountsGaps(dateOfCreation, ardMonth, ardDay, filedPeriodEnds);
  if (!gapResult) {
    // All periods are filed — nothing to detect
    return { newFilingsCount: 0 };
  }

  // Step 5: Compare against existing Filing records
  const existingFilings = await prisma.filing.findMany({
    where: { companyId, filingType: "accounts" },
    select: { periodEnd: true },
  });
  const existingPeriodEnds = new Set(existingFilings.map((f) => f.periodEnd.getTime()));

  const firstPeriodEnd = computeFirstPeriodEnd(new Date(dateOfCreation), ardMonth, ardDay);

  // Step 6: Build new filing records
  const newFilings: Array<{
    companyId: string;
    filingType: "accounts";
    periodStart: Date;
    periodEnd: Date;
    status: "accepted";
    correlationId: null;
    confirmedAt: Date;
  }> = [];

  const sortedPeriodEnds = [...gapResult.filedPeriodEnds.values()].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  for (const periodEnd of sortedPeriodEnds) {
    if (existingPeriodEnds.has(periodEnd.getTime())) continue;

    let periodStart: Date;
    if (periodEnd.getTime() === firstPeriodEnd.getTime()) {
      periodStart = new Date(dateOfCreation);
    } else {
      periodStart = new Date(periodEnd);
      periodStart.setUTCFullYear(periodStart.getUTCFullYear() - 1);
      periodStart.setUTCDate(periodStart.getUTCDate() + 1);
    }

    newFilings.push({
      companyId,
      filingType: "accounts",
      periodStart,
      periodEnd,
      status: "accepted",
      correlationId: null,
      confirmedAt: new Date(),
    });
  }

  if (newFilings.length === 0) {
    return { newFilingsCount: 0 };
  }

  // Create records
  await prisma.filing.createMany({
    data: newFilings,
    skipDuplicates: true,
  });

  // Step 7: Roll forward for each new filing (chronological order)
  for (const filing of newFilings) {
    await rollForwardPeriod(
      companyId,
      filing.periodEnd,
      company.registeredForCorpTax,
      "accounts",
      company.user.email,
      company.companyName,
      { skipEmail: true },
    );
  }

  return { newFilingsCount: newFilings.length };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/lib/companies-house/resync.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/companies-house/resync.ts src/__tests__/lib/companies-house/resync.test.ts
git commit -m "feat: add resyncFromCompaniesHouse core function"
```

---

### Task 4: Create daily cron endpoint

**Files:**

- Create: `src/app/api/cron/resync-filings/route.ts`
- Modify: `vercel.json`

- [ ] **Step 1: Create the cron endpoint**

Create `src/app/api/cron/resync-filings/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resyncFromCompaniesHouse } from "@/lib/companies-house/resync";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      user: {
        subscriptionStatus: { in: ["active", "cancelling"] },
      },
    },
    select: { id: true },
  });

  let newFilingsDetected = 0;
  let errors = 0;

  for (const company of companies) {
    const result = await resyncFromCompaniesHouse(company.id);
    if (result.error) {
      console.error(`Resync failed for company ${company.id}: ${result.error}`);
      errors++;
    } else {
      newFilingsDetected += result.newFilingsCount;
    }
  }

  return NextResponse.json({
    companiesChecked: companies.length,
    newFilingsDetected,
    errors,
  });
}
```

- [ ] **Step 2: Add cron schedule to vercel.json**

In `vercel.json`, add the new cron entry to the `crons` array. The full file should be:

```json
{
  "regions": ["lhr1"],
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/poll-filings",
      "schedule": "0 */4 * * *"
    },
    {
      "path": "/api/cron/resync-filings",
      "schedule": "0 7 * * *"
    }
  ]
}
```

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/resync-filings/route.ts vercel.json
git commit -m "feat: add daily resync-filings cron endpoint"
```

---

### Task 5: Create manual refresh endpoint

**Files:**

- Create: `src/app/api/company/resync/route.ts`

- [ ] **Step 1: Create the endpoint**

Create `src/app/api/company/resync/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { resyncFromCompaniesHouse } from "@/lib/companies-house/resync";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });
  if (!user || (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling")) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const { success } = rateLimit(`resync:${session.user.id}`, 5, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const { companyId } = body;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  // Verify company belongs to user
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const result = await resyncFromCompaniesHouse(companyId);

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ newFilingsCount: result.newFilingsCount });
}
```

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/company/resync/route.ts
git commit -m "feat: add manual resync endpoint POST /api/company/resync"
```

---

### Task 6: Build SyncButton client component with toast

**Files:**

- Create: `src/components/sync-button.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/sync-button.tsx`. This follows the same patterns as `src/components/check-status-button.tsx` — `useRouter`, `useState`, inline styles with CSS variables, lucide icons.

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

interface SyncButtonProps {
  companyId: string;
}

type ToastState =
  | { type: "success"; title: string; subtitle: string }
  | { type: "info"; title: string; subtitle: string }
  | { type: "error"; title: string; subtitle: string }
  | null;

const toastStyles: Record<string, { bg: string; border: string; title: string; subtitle: string }> =
  {
    success: {
      bg: "var(--color-success-bg)",
      border: "var(--color-success-border)",
      title: "var(--color-success-deep, #166534)",
      subtitle: "var(--color-success, #16a34a)",
    },
    info: {
      bg: "var(--color-bg-secondary)",
      border: "var(--color-border)",
      title: "var(--color-text-primary)",
      subtitle: "var(--color-text-secondary)",
    },
    error: {
      bg: "var(--color-danger-bg)",
      border: "var(--color-danger-border)",
      title: "var(--color-danger-deep)",
      subtitle: "var(--color-danger)",
    },
  };

export default function SyncButton({ companyId }: SyncButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  function showToast(t: ToastState) {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  }

  async function handleSync() {
    setLoading(true);
    setToast(null);

    try {
      const res = await fetch("/api/company/resync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      if (!res.ok) {
        showToast({
          type: "error",
          title: "Couldn\u2019t reach Companies House",
          subtitle: "Try again later",
        });
        return;
      }

      const data = await res.json();

      if (data.newFilingsCount > 0) {
        showToast({
          type: "success",
          title: "Synced with Companies House",
          subtitle: `${data.newFilingsCount} new filing${data.newFilingsCount === 1 ? "" : "s"} detected`,
        });
      } else {
        showToast({
          type: "info",
          title: "Already up to date",
          subtitle: "No new filings found on Companies House",
        });
      }

      router.refresh();
    } catch {
      showToast({
        type: "error",
        title: "Couldn\u2019t reach Companies House",
        subtitle: "Try again later",
      });
    } finally {
      setLoading(false);
    }
  }

  const style = toast ? toastStyles[toast.type] : null;

  return (
    <>
      <button
        onClick={handleSync}
        disabled={loading}
        className="focus-ring"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "8px 14px",
          fontSize: "13px",
          fontWeight: 500,
          color: loading ? "var(--color-text-disabled)" : "var(--color-text-secondary)",
          backgroundColor: loading ? "var(--color-bg-disabled)" : "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "opacity 200ms, background-color 200ms",
        }}
        onMouseEnter={(e) => {
          if (!loading) (e.currentTarget as HTMLButtonElement).style.opacity = "0.8";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        {loading ? (
          <Loader2 size={15} strokeWidth={2} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <RefreshCw size={15} strokeWidth={2} />
        )}
        {loading ? "Syncing\u2026" : "Sync with CH"}
      </button>

      {toast && style && (
        <div
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            padding: "14px 18px",
            backgroundColor: style.bg,
            border: `1px solid ${style.border}`,
            borderRadius: "10px",
            zIndex: 1000,
            maxWidth: "360px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 600, color: style.title }}>{toast.title}</div>
          <div style={{ fontSize: "12px", color: style.subtitle, marginTop: "2px" }}>
            {toast.subtitle}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/sync-button.tsx
git commit -m "feat: add SyncButton component with toast notifications"
```

---

### Task 7: Add SyncButton to company page header

**Files:**

- Modify: `src/app/(app)/company/[companyId]/page.tsx`

- [ ] **Step 1: Add the SyncButton import and render it in the header**

In `src/app/(app)/company/[companyId]/page.tsx`:

Add the import at the top (after existing imports):

```ts
import SyncButton from "@/components/sync-button";
```

Then restructure the company header (lines 68-98). The current inner flex row has the icon div and name div as siblings. We need to wrap those in a group and add the SyncButton alongside. Replace lines 68-98:

```tsx
{
  /* Company header */
}
<div style={{ marginBottom: "24px" }}>
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: "8px",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "10px",
          backgroundColor: "var(--color-primary-bg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "var(--color-primary)" }}>
          <Building2 size={20} color="currentColor" strokeWidth={2} />
        </span>
      </div>
      <div>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {company.companyName}
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            margin: 0,
            marginTop: "2px",
          }}
        >
          {company.companyRegistrationNumber}
          {incompletePeriods.length > 0 && (
            <>
              {" "}
              &middot; {incompletePeriods.length} outstanding{" "}
              {incompletePeriods.length === 1 ? "period" : "periods"}
            </>
          )}
        </p>
      </div>
    </div>
    <SyncButton companyId={companyId} />
  </div>
</div>;
```

The outer flex row uses `justifyContent: "space-between"` to push the icon+name group left and SyncButton right. The icon and name stay grouped in their own inner flex container.

- [ ] **Step 2: Run lint and dev server check**

Run: `npm run lint`
Expected: No errors

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/company/[companyId]/page.tsx
git commit -m "feat: add Sync with CH button to company page header"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No lint errors
