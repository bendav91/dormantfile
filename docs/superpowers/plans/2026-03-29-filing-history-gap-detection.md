# Filing History Gap Detection Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect historical filing gaps from Companies House filing history at onboarding, so companies with missing years show the correct number of outstanding periods.

**Architecture:** New `filing-history.ts` module in `src/lib/companies-house/` with two functions: `fetchFilingHistory` (CH API call) and `detectAccountsGaps` (pure gap computation). Company creation route calls both, overrides period dates when gaps are found, and seeds accepted Filing records. A new `isBlockedTerritory` flag (>6 years) replaces the current >4 year hard-block in submit routes.

**Tech Stack:** Next.js API routes, Companies House REST API, Prisma, Vitest

**Spec:** `docs/superpowers/specs/2026-03-29-filing-history-gap-detection-design.md`

---

### Task 1: `detectAccountsGaps` — tests and implementation

This is the core pure function. TDD.

**Files:**

- Create: `src/lib/companies-house/filing-history.ts`
- Create: `src/__tests__/lib/companies-house/filing-history.test.ts`

- [ ] **Step 1: Write the test file with all `detectAccountsGaps` test cases**

```typescript
// src/__tests__/lib/companies-house/filing-history.test.ts
import { describe, it, expect } from "vitest";
import { detectAccountsGaps, computeFirstPeriodEnd } from "@/lib/companies-house/filing-history";

describe("computeFirstPeriodEnd", () => {
  it("returns the first ARD strictly after incorporation", () => {
    // Incorporated 2015-05-16, ARD 31 March → 2016-03-31
    const result = computeFirstPeriodEnd(new Date("2015-05-16"), 3, 31);
    expect(result).toEqual(new Date("2016-03-31"));
  });

  it("advances to next year when incorporated on the ARD", () => {
    // Incorporated on 31 March 2015, ARD 31 March → should be 2016-03-31
    const result = computeFirstPeriodEnd(new Date("2015-03-31"), 3, 31);
    expect(result).toEqual(new Date("2016-03-31"));
  });

  it("applies 18-month cap", () => {
    // Incorporated 2014-06-01, ARD 31 March
    // Naive: 2016-03-31 (22 months) — exceeds 18 months → use 2015-03-31
    const result = computeFirstPeriodEnd(new Date("2014-06-01"), 3, 31);
    expect(result).toEqual(new Date("2015-03-31"));
  });

  it("does not apply 18-month cap when not needed", () => {
    // Incorporated 2015-01-05, ARD 31 March → 2016-03-31 (14.8 months, ok)
    const result = computeFirstPeriodEnd(new Date("2015-01-05"), 3, 31);
    expect(result).toEqual(new Date("2016-03-31"));
  });
});

describe("detectAccountsGaps", () => {
  it("detects gaps when some periods are unfiled", () => {
    // Company incorporated 2015-05-16, ARD 31 March
    // Filed: 2016, 2017, 2020, 2021, 2022. Missing: 2018, 2019
    const result = detectAccountsGaps(
      "2015-05-16",
      3, // March
      31,
      [
        new Date("2016-03-31"),
        new Date("2017-03-31"),
        new Date("2020-03-31"),
        new Date("2021-03-31"),
        new Date("2022-03-31"),
      ],
    );
    expect(result).not.toBeNull();
    expect(result!.oldestUnfiledPeriodEnd).toEqual(new Date("2018-03-31"));
    // periodStart for 2018 is day after 2017 period end
    expect(result!.oldestUnfiledPeriodStart).toEqual(new Date("2017-04-01"));
  });

  it("returns null when all periods are filed", () => {
    // Company incorporated 2022-01-10, ARD 31 January
    // Filed: 2023, 2024, 2025
    const result = detectAccountsGaps(
      "2022-01-10",
      1, // January
      31,
      [new Date("2023-01-31"), new Date("2024-01-31"), new Date("2025-01-31")],
    );
    expect(result).toBeNull();
  });

  it("returns first period when nothing has been filed", () => {
    // Company incorporated 2019-06-15, ARD 30 June, no filings
    const result = detectAccountsGaps(
      "2019-06-15",
      6, // June
      30,
      [],
    );
    expect(result).not.toBeNull();
    // First period: 2019-06-15 to 2020-06-30
    expect(result!.oldestUnfiledPeriodStart).toEqual(new Date("2019-06-15"));
    expect(result!.oldestUnfiledPeriodEnd).toEqual(new Date("2020-06-30"));
  });

  it("uses tolerance matching (31 days)", () => {
    // Company incorporated 2020-01-01, ARD 31 December
    // Expected period end: 2020-12-31
    // Filed made_up_date: 2021-01-15 (15 days off — within tolerance)
    const result = detectAccountsGaps("2020-01-01", 12, 31, [
      new Date("2021-01-15"), // 15 days off from 2020-12-31
      new Date("2021-12-31"),
      new Date("2022-12-31"),
      new Date("2023-12-31"),
      new Date("2024-12-31"),
    ]);
    expect(result).toBeNull();
  });

  it("does not match beyond 31-day tolerance", () => {
    // Filed made_up_date: 2021-02-15 (46 days off from 2020-12-31)
    const result = detectAccountsGaps("2020-01-01", 12, 31, [
      new Date("2021-02-15"), // 46 days off — outside tolerance
      new Date("2021-12-31"),
      new Date("2022-12-31"),
      new Date("2023-12-31"),
      new Date("2024-12-31"),
    ]);
    expect(result).not.toBeNull();
    // First period (2020-12-31) is unmatched
    expect(result!.oldestUnfiledPeriodEnd).toEqual(new Date("2020-12-31"));
  });

  it("maps CH filed dates to computed expected period ends", () => {
    const result = detectAccountsGaps("2019-06-01", 3, 31, [
      new Date("2020-03-31"),
      new Date("2021-03-31"),
    ]);
    // 2019-06-01 to 2020-03-31 is first period, filed
    // 2020-04-01 to 2021-03-31 is second period, filed
    // 2021-04-01 to 2022-03-31 is third period, unfiled
    expect(result).not.toBeNull();
    // filedPeriodEnds maps CH date → expected periodEnd
    expect(result!.filedPeriodEnds.get(new Date("2020-03-31").getTime())).toEqual(
      new Date("2020-03-31"),
    );
    expect(result!.filedPeriodEnds.get(new Date("2021-03-31").getTime())).toEqual(
      new Date("2021-03-31"),
    );
  });

  it("maps tolerance-matched CH dates to the correct expected period end", () => {
    // CH made_up_date is 2021-01-15, expected periodEnd is 2020-12-31
    const result = detectAccountsGaps("2020-01-01", 12, 31, [
      new Date("2021-01-15"), // maps to expected 2020-12-31
      new Date("2021-12-31"),
      new Date("2022-12-31"),
      new Date("2023-12-31"),
      new Date("2024-12-31"),
    ]);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/__tests__/lib/companies-house/filing-history.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement `detectAccountsGaps` in `filing-history.ts`**

```typescript
// src/lib/companies-house/filing-history.ts

export interface GapDetectionResult {
  oldestUnfiledPeriodStart: Date;
  oldestUnfiledPeriodEnd: Date;
  /** Map of CH made_up_date → computed expected periodEnd for seeding Filing records */
  filedPeriodEnds: Map<number, Date>;
}

const TOLERANCE_MS = 31 * 24 * 60 * 60 * 1000; // 31 days

/**
 * Computes the first accounting period end date from incorporation date
 * and accounting reference date (ARD), applying CH's 18-month cap.
 */
export function computeFirstPeriodEnd(
  incorporationDate: Date,
  ardMonth: number, // 1-12
  ardDay: number,
): Date {
  // Find the first ARD strictly after incorporation
  let firstArd = new Date(Date.UTC(incorporationDate.getUTCFullYear(), ardMonth - 1, ardDay));
  if (firstArd.getTime() <= incorporationDate.getTime()) {
    firstArd.setUTCFullYear(firstArd.getUTCFullYear() + 1);
  }

  // If this exceeds 18 months from incorporation, use the previous year's ARD
  const eighteenMonthsLater = new Date(incorporationDate);
  eighteenMonthsLater.setUTCMonth(eighteenMonthsLater.getUTCMonth() + 18);
  if (firstArd.getTime() > eighteenMonthsLater.getTime()) {
    firstArd.setUTCFullYear(firstArd.getUTCFullYear() - 1);
  }

  return firstArd;
}

/**
 * Finds the CH filing whose made_up_date falls within 31 days of the expected
 * period end. Returns the index or -1.
 */
function findMatchingFiling(expectedEnd: Date, filedEnds: Date[]): number {
  return filedEnds.findIndex(
    (filed) => Math.abs(filed.getTime() - expectedEnd.getTime()) <= TOLERANCE_MS,
  );
}

/**
 * Detects gaps in a company's accounts filing history by generating expected
 * annual periods from incorporation and cross-referencing against CH filings.
 *
 * Returns the oldest unfiled period and a map of filed periods (CH date →
 * computed expected periodEnd), or null if all periods are filed.
 */
export function detectAccountsGaps(
  incorporationDate: string,
  accountingReferenceMonth: number,
  accountingReferenceDay: number,
  filedPeriodEnds: Date[],
): GapDetectionResult | null {
  const incDate = new Date(incorporationDate);
  const now = new Date();

  const firstPeriodEnd = computeFirstPeriodEnd(
    incDate,
    accountingReferenceMonth,
    accountingReferenceDay,
  );

  // Track which CH dates matched which expected period ends
  const remainingFiled = [...filedPeriodEnds];
  const filedMap = new Map<number, Date>(); // CH date timestamp → expected periodEnd

  // Generate all expected periods
  let periodEnd = firstPeriodEnd;
  let periodStart = incDate; // First period starts at incorporation
  let oldestUnfiled: { start: Date; end: Date } | null = null;

  while (periodEnd.getTime() <= now.getTime()) {
    const matchIdx = findMatchingFiling(periodEnd, remainingFiled);
    if (matchIdx >= 0) {
      // Map the CH made_up_date to the computed expected periodEnd
      filedMap.set(remainingFiled[matchIdx].getTime(), new Date(periodEnd));
      remainingFiled.splice(matchIdx, 1);
    } else if (!oldestUnfiled) {
      oldestUnfiled = { start: new Date(periodStart), end: new Date(periodEnd) };
    }

    // Advance to next annual period
    const nextStart = new Date(periodEnd);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    const nextEnd = new Date(periodEnd);
    nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);
    periodStart = nextStart;
    periodEnd = nextEnd;
  }

  if (!oldestUnfiled) {
    return null; // All periods filed — caller uses next_accounts
  }

  return {
    oldestUnfiledPeriodStart: oldestUnfiled.start,
    oldestUnfiledPeriodEnd: oldestUnfiled.end,
    filedPeriodEnds: filedMap,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/__tests__/lib/companies-house/filing-history.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/companies-house/filing-history.ts src/__tests__/lib/companies-house/filing-history.test.ts
git commit -m "feat: add detectAccountsGaps with tests for filing history gap detection"
```

---

### Task 2: `fetchFilingHistory` — CH API integration

**Files:**

- Modify: `src/lib/companies-house/filing-history.ts`

- [ ] **Step 1: Add `fetchFilingHistory` to the module**

Add this function above `detectAccountsGaps` in `src/lib/companies-house/filing-history.ts`:

```typescript
/**
 * Fetches the list of dates that annual accounts were filed for from
 * the Companies House filing history API.
 *
 * Returns an array of `made_up_date` values for accounts filings.
 * Returns an empty array on API failure (graceful degradation).
 */
export async function fetchFilingHistory(companyNumber: string): Promise<Date[]> {
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
      console.error(`CH filing history API returned ${res.status} for ${companyNumber}`);
      return [];
    }

    const data = await res.json();
    const items: Array<{ type?: string; made_up_date?: string }> = data.items ?? [];

    return items
      .filter((item) => item.type?.startsWith("AA") && item.made_up_date)
      .map((item) => new Date(item.made_up_date!));
  } catch (error) {
    console.error("Failed to fetch CH filing history:", error);
    return [];
  }
}
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

Run: `npm test -- src/__tests__/lib/companies-house/filing-history.test.ts`
Expected: All tests still PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/companies-house/filing-history.ts
git commit -m "feat: add fetchFilingHistory for CH accounts filing history"
```

---

### Task 3: `isBlockedTerritory` flag in periods

**Files:**

- Modify: `src/lib/periods.ts`

- [ ] **Step 1: Write a test for `isBlockedTerritory`**

Add a new test file `src/__tests__/lib/periods.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { getOutstandingPeriods } from "@/lib/periods";

describe("getOutstandingPeriods — isBlockedTerritory", () => {
  it("marks periods older than 6 years as blocked", () => {
    // Fix "now" to 2026-03-29
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const periods = getOutstandingPeriods(
      new Date("2018-04-01"), // periodStart
      new Date("2019-03-31"), // periodEnd — ~7 years ago
      false,
      [],
    );

    // First period (ending 2019-03-31) is ~7 years old — should be blocked
    expect(periods[0].isBlockedTerritory).toBe(true);
    expect(periods[0].isDisclosureTerritory).toBe(true);

    vi.useRealTimers();
  });

  it("does not mark periods 5 years old as blocked", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const periods = getOutstandingPeriods(
      new Date("2020-04-01"),
      new Date("2021-03-31"), // ~5 years ago
      false,
      [],
    );

    expect(periods[0].isBlockedTerritory).toBe(false);
    expect(periods[0].isDisclosureTerritory).toBe(true); // >4 years

    vi.useRealTimers();
  });

  it("does not mark periods 3 years old as blocked or disclosure", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const periods = getOutstandingPeriods(
      new Date("2022-04-01"),
      new Date("2023-03-31"), // ~3 years ago
      false,
      [],
    );

    expect(periods[0].isBlockedTerritory).toBe(false);
    expect(periods[0].isDisclosureTerritory).toBe(false);

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/__tests__/lib/periods.test.ts`
Expected: FAIL — `isBlockedTerritory` does not exist on type `PeriodInfo`

- [ ] **Step 3: Add `isBlockedTerritory` to `PeriodInfo` and `getOutstandingPeriods`**

In `src/lib/periods.ts`, add to the interface:

```typescript
/** Period ended more than 6 years ago — filing blocked, professional advice needed */
isBlockedTerritory: boolean;
```

In `getOutstandingPeriods()`, add after the `fourYearsAgo` declaration:

```typescript
const sixYearsAgo = new Date(now);
sixYearsAgo.setUTCFullYear(sixYearsAgo.getUTCFullYear() - 6);
```

And in the period object inside the `while` loop, add:

```typescript
isBlockedTerritory: pEnd.getTime() <= sixYearsAgo.getTime(),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/__tests__/lib/periods.test.ts`
Expected: PASS

- [ ] **Step 5: Run all tests to verify nothing broke**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/periods.ts src/__tests__/lib/periods.test.ts
git commit -m "feat: add isBlockedTerritory flag for periods older than 6 years"
```

---

### Task 4: Update submit routes — change 4-year block to 6-year block

**Files:**

- Modify: `src/app/api/file/submit/route.ts:133-138`
- Modify: `src/app/api/file/submit-accounts/route.ts:114-119`

- [ ] **Step 1: Update CT600 submit route**

In `src/app/api/file/submit/route.ts`, replace lines 133-138:

```typescript
// Before:
if (targetPeriod.isDisclosureTerritory) {
  return NextResponse.json(
    {
      error:
        "This period ended more than 4 years ago. Very old returns may be rejected by HMRC. Please contact HMRC directly or consult an accountant.",
    },
    { status: 400 },
  );
}

// After:
if (targetPeriod.isBlockedTerritory) {
  return NextResponse.json(
    {
      error:
        "This period is more than 6 years overdue. We recommend consulting an accountant or contacting HMRC and Companies House directly.",
    },
    { status: 400 },
  );
}
```

- [ ] **Step 2: Update accounts submit route**

In `src/app/api/file/submit-accounts/route.ts`, replace lines 114-119 with the same pattern:

```typescript
// Before:
if (targetPeriod.isDisclosureTerritory) {
  return NextResponse.json(
    {
      error:
        "This period ended more than 4 years ago. Very old filings may be rejected by Companies House. Please contact Companies House directly or consult an accountant.",
    },
    { status: 400 },
  );
}

// After:
if (targetPeriod.isBlockedTerritory) {
  return NextResponse.json(
    {
      error:
        "This period is more than 6 years overdue. We recommend consulting an accountant or contacting HMRC and Companies House directly.",
    },
    { status: 400 },
  );
}
```

- [ ] **Step 3: Run all tests**

Run: `npm test`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/file/submit/route.ts src/app/api/file/submit-accounts/route.ts
git commit -m "feat: change filing hard-block from 4 years to 6 years (isBlockedTerritory)"
```

---

### Task 5: Update filing selector UI — blocked territory

**Files:**

- Modify: `src/app/(app)/file/[companyId]/page.tsx`

- [ ] **Step 1: Add blocked territory handling to the period cards**

In the filing rows section of each period card (inside the `incompletePeriods.map`), add a blocked territory check. Replace the accounts filing row section (lines 239-277) with logic that checks `period.isBlockedTerritory`:

When `period.isBlockedTerritory` is true, replace the "File" button with a static "Seek professional advice" label, and show a red info block above the filing rows:

```tsx
{
  /* Blocked territory warning */
}
{
  period.isBlockedTerritory && (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        backgroundColor: "var(--color-danger-bg)",
        border: "1px solid var(--color-danger-border)",
        borderRadius: "6px",
        marginBottom: "14px",
      }}
    >
      <span style={{ color: "var(--color-danger)", flexShrink: 0, display: "flex" }}>
        <AlertTriangle size={13} color="currentColor" strokeWidth={2} />
      </span>
      <p
        style={{ fontSize: "12px", color: "var(--color-danger-text)", margin: 0, fontWeight: 500 }}
      >
        This period is more than 6 years overdue. We recommend consulting an accountant or
        contacting HMRC and Companies House directly.
      </p>
    </div>
  );
}
```

Add this block right after the existing gap warning `{period.hasEarlierGaps && (...)}` block (after line 235).

For the filing action buttons, wrap the existing `<Link>` elements in a condition. When `period.isBlockedTerritory` is true, show a static label instead of the "File"/"Retry" link:

```tsx
{
  /* In the accounts row action area (replacing lines 265-276): */
}
{
  period.isBlockedTerritory ? (
    <span
      style={{
        padding: "6px 14px",
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: 600,
        color: "var(--color-text-secondary)",
        backgroundColor: "var(--color-bg-inset)",
        border: "1px solid var(--color-border)",
      }}
    >
      Seek professional advice
    </span>
  ) : accountsFiling ? (
    <>
      <FilingStatusBadge status={accountsFiling.status} filingType="accounts" />
      {(accountsFiling.status === "failed" || accountsFiling.status === "rejected") && (
        <Link href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`} style={filingBtnStyle}>
          Retry
        </Link>
      )}
    </>
  ) : (
    <Link href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`} style={filingBtnStyle}>
      File
    </Link>
  );
}
```

Apply the same pattern to the CT600 row action area (replacing lines 306-316).

- [ ] **Step 2: Verify with `npm run build`**

Run: `npm run build`
Expected: Build succeeds with no type errors

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/file/[companyId]/page.tsx
git commit -m "feat: show 'seek professional advice' for periods older than 6 years"
```

---

### Task 6: Integrate gap detection into company creation route

**Files:**

- Modify: `src/app/api/company/route.ts`

- [ ] **Step 1: Add imports**

At the top of `src/app/api/company/route.ts`, add:

```typescript
import {
  fetchFilingHistory,
  detectAccountsGaps,
  computeFirstPeriodEnd,
} from "@/lib/companies-house/filing-history";
```

- [ ] **Step 2: Expand variable declarations and replace `next_accounts` block**

First, expand the variable declarations before the try block (around line 54). Replace:

```typescript
let companyName: string;
let accountingPeriodEnd: string;
let accountingPeriodStart: string;
```

With:

```typescript
let companyName: string;
let accountingPeriodEnd: string;
let accountingPeriodStart: string;
let dateOfCreation: string | undefined;
let ardMonth: number | null = null;
let ardDay: number | null = null;
let gapResult: import("@/lib/companies-house/filing-history").GapDetectionResult | null = null;
```

Then replace lines 81-93 (the `next_accounts` block inside the try) with:

```typescript
const nextAccounts = chData.accounts?.next_accounts;
dateOfCreation = chData.date_of_creation;

// Fetch filing history for gap detection (graceful degradation on failure)
const filedPeriodEnds = await fetchFilingHistory(paddedNumber);

// Parse accounting reference date (month/day)
const ard = chData.accounts?.accounting_reference_date;
if (ard?.month && ard?.day) {
  ardMonth = parseInt(ard.month, 10);
  ardDay = parseInt(ard.day, 10);
} else if (nextAccounts?.period_end_on) {
  // Fallback: derive ARD from next_accounts period end
  const fallbackDate = new Date(nextAccounts.period_end_on);
  ardMonth = fallbackDate.getUTCMonth() + 1;
  ardDay = fallbackDate.getUTCDate();
}

// Attempt gap detection
if (dateOfCreation && ardMonth && ardDay && !isNaN(ardMonth) && !isNaN(ardDay)) {
  gapResult = detectAccountsGaps(dateOfCreation, ardMonth, ardDay, filedPeriodEnds);
}

if (gapResult) {
  // Gaps detected — use the true oldest unfiled period
  accountingPeriodStart = gapResult.oldestUnfiledPeriodStart.toISOString().split("T")[0];
  accountingPeriodEnd = gapResult.oldestUnfiledPeriodEnd.toISOString().split("T")[0];
} else if (nextAccounts?.period_end_on) {
  // No gaps (or gap detection couldn't run) — use CH's next_accounts
  accountingPeriodStart = nextAccounts.period_start_on;
  accountingPeriodEnd = nextAccounts.period_end_on;
} else {
  return NextResponse.json(
    {
      error:
        "Companies House has no upcoming accounting period for this company. It may already be filed or the company may be dissolved.",
    },
    { status: 400 },
  );
}
```

- [ ] **Step 3: Seed Filing records after company creation**

After both the create and restore paths (after the `return NextResponse.json({ id: company.id }, { status: 201 })` lines), we need to seed filings before returning. Restructure so the seeding happens before the response.

Add a helper function at the top of the file (after imports):

```typescript
async function seedFilingHistory(
  companyId: string,
  dateOfCreation: string | undefined,
  gapResult: import("@/lib/companies-house/filing-history").GapDetectionResult | null,
  ardMonth: number | null,
  ardDay: number | null,
) {
  if (!gapResult || gapResult.filedPeriodEnds.size === 0) return;

  const incDate = dateOfCreation ? new Date(dateOfCreation) : null;

  // Use computeFirstPeriodEnd to identify the first period
  let firstPeriodEnd: Date | null = null;
  if (incDate && ardMonth && ardDay) {
    firstPeriodEnd = computeFirstPeriodEnd(incDate, ardMonth, ardDay);
  }

  // The Map values are the computed expected periodEnd dates (not raw CH dates).
  // This ensures seeded filings match what getOutstandingPeriods() generates.
  const sortedExpectedEnds = [...gapResult.filedPeriodEnds.values()].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  const filingData = sortedExpectedEnds.map((periodEnd) => {
    let periodStart: Date;
    // Check if this is the first period
    if (firstPeriodEnd && incDate && periodEnd.getTime() === firstPeriodEnd.getTime()) {
      periodStart = incDate;
    } else {
      // Standard: periodStart = periodEnd - 1 year + 1 day
      periodStart = new Date(periodEnd);
      periodStart.setUTCFullYear(periodStart.getUTCFullYear() - 1);
      periodStart.setUTCDate(periodStart.getUTCDate() + 1);
    }
    return {
      companyId,
      filingType: "accounts" as const,
      periodStart,
      periodEnd,
      status: "accepted" as const,
      confirmedAt: new Date(),
    };
  });

  await prisma.filing.createMany({
    data: filingData,
    skipDuplicates: true,
  });
}
```

Then call it after company creation (both create and restore paths). Replace the two `return NextResponse.json({ id: company.id }, { status: 201 })` blocks:

For the restore path (~line 177):

```typescript
await seedFilingHistory(softDeleted.id, dateOfCreation, gapResult, ardMonth, ardDay);
return NextResponse.json({ id: softDeleted.id }, { status: 201 });
```

For the create path (~line 196):

```typescript
await seedFilingHistory(company.id, dateOfCreation, gapResult, ardMonth, ardDay);
return NextResponse.json({ id: company.id }, { status: 201 });
```

- [ ] **Step 4: Handle soft-delete restore — clean up seeded filings only**

In the restore path (before calling `seedFilingHistory`), add a targeted delete for seeded filings only:

```typescript
// Delete only seeded filings (accepted, no correlationId) — preserve real submissions
await prisma.filing.deleteMany({
  where: {
    companyId: softDeleted.id,
    status: "accepted",
    correlationId: null,
  },
});
```

Add this right after the existing `await prisma.reminder.deleteMany(...)` on line 159.

- [ ] **Step 5: Run build to verify types are correct**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 6: Run all tests**

Run: `npm test`
Expected: All PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/api/company/route.ts
git commit -m "feat: detect filing gaps at company onboarding and seed accepted filings"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new lint errors

- [ ] **Step 4: Commit any fixes if needed**

If any tests/build/lint issues were found and fixed:

```bash
git add -A
git commit -m "fix: address build/lint issues from filing history gap detection"
```
