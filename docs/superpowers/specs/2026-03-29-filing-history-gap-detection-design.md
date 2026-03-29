# Filing History Gap Detection

## Problem

When a company is added to DormantFile, the app uses Companies House's `next_accounts` date as the starting point for outstanding periods. But CH's pointer only reflects what CH considers "next due" — it doesn't account for historical gaps where accounts were never filed but CH moved past them (e.g. because later periods were filed).

This means companies with filing gaps show fewer outstanding periods than they actually have, and the user never sees the missing years.

## Solution

At onboarding, fetch the company's full filing history from the CH API, cross-reference it against expected annual periods since incorporation, and set the company's stored period to the **true oldest unfiled period**. Seed accepted `Filing` records for periods that CH shows as already filed, so `getOutstandingPeriods()` correctly marks them as complete.

Add a hard age limit: periods older than 6 years cannot be filed through the app. The user is directed to seek professional advice for those.

## Design decisions

- **Accounts only**: CT600 filings go to HMRC and are not queryable via any API. CT600 periods are left as unfiled — the user files or ignores them. False negatives (showing an unfiled period that was actually filed) are safer than false positives (hiding an unfiled period).
- **Synchronous at onboarding**: The filing history fetch happens inline during company creation. One extra API call (~500ms). No background processing or eventual consistency.
- **No schema migration**: Uses the existing `Filing` model to store seeded accepted records. The `@@unique([companyId, periodStart, periodEnd, filingType])` constraint prevents duplicates.
- **No cap on periods shown**: All outstanding periods are displayed, but filing is blocked for periods older than 6 years (HMRC's extended discovery window for carelessness).

## Filing age tiers

| Age | Behaviour |
|-----|-----------|
| Under 4 years | File normally, no warnings |
| 4-6 years | Amber warning (existing `isDisclosureTerritory`), filing allowed |
| Over 6 years | Red banner, "File" button replaced with "Seek professional advice" |

Banner copy for 6+ years: *"This period is more than 6 years overdue. We recommend consulting an accountant or contacting HMRC and Companies House directly."*

## New module: `src/lib/companies-house/filing-history.ts`

### `fetchFilingHistory(companyNumber: string): Promise<Date[]>`

Calls `GET /company/{number}/filing-history?category=accounts&items_per_page=100` on the CH API. Returns an array of `made_up_date` values (as `Date` objects) for all annual accounts filings (type codes: `AA`, `AA01`, etc.).

Uses the same Basic Auth mechanism as the existing company info fetch.

### `detectAccountsGaps(incorporationDate: string, accountingReferenceMonth: number, accountingReferenceDay: number, filedPeriodEnds: Date[]): GapDetectionResult`

```typescript
interface GapDetectionResult {
  oldestUnfiledPeriodStart: Date;
  oldestUnfiledPeriodEnd: Date;
  filedPeriodEnds: Date[];
}
```

Logic:
1. Derive the first accounting period end date from the incorporation date and accounting reference date. The first period runs from incorporation to the next occurrence of the accounting reference date (with CH's rules — first accounts can cover up to 18 months).
2. Generate all expected annual period end dates from the first period forward, advancing by 1 year until the period end exceeds today.
3. Compare each expected period end against `filedPeriodEnds`. A period is "filed" if there's a matching `made_up_date` in the CH history.
4. Return the earliest unfiled period as the starting point.
5. If every period has been filed, return CH's `next_accounts` dates (the company is up to date — no gaps).

This function is pure (no I/O) and unit-testable.

## Changes to `src/app/api/company/route.ts`

After the existing CH company info fetch:

1. Call `fetchFilingHistory(paddedNumber)` to get the list of filed period end dates.
2. Call `detectAccountsGaps()` with `date_of_creation` and `accounts.accounting_reference_date` from the CH company info response, plus the filed period ends.
3. If gaps are detected, override `accountingPeriodStart`/`accountingPeriodEnd` with the result (instead of using `next_accounts`).
4. After creating the company record, seed `Filing` records with `status: "accepted"` and `filingType: "accounts"` for each filed period end. Compute `periodStart` as `periodEnd - 1 year + 1 day` (standard annual period).

The soft-deleted restore path gets the same treatment: re-fetch history, delete old Filing records for the company, re-seed from CH data.

Reminder setup is unchanged — it uses the oldest unfiled period's deadlines, which are now correct.

## Changes to `src/lib/periods.ts`

Add `isBlockedTerritory` to the `PeriodInfo` interface:

```typescript
/** Period ended more than 6 years ago — filing blocked, professional advice needed */
isBlockedTerritory: boolean;
```

Set in `getOutstandingPeriods()`:

```typescript
const sixYearsAgo = new Date(now);
sixYearsAgo.setUTCFullYear(sixYearsAgo.getUTCFullYear() - 6);

// In the period loop:
isBlockedTerritory: pEnd.getTime() <= sixYearsAgo.getTime(),
```

## Changes to `src/app/(app)/file/[companyId]/page.tsx`

For periods where `isBlockedTerritory` is true:

- Replace "File" button with a static label: "Seek professional advice"
- Show a red info block within the period card (distinct from the top-level disclosure banner which covers all >4 year periods)
- Copy: *"This period is more than 6 years overdue. We recommend consulting an accountant or contacting HMRC and Companies House directly."*

## What doesn't change

- **`src/lib/periods.ts` core logic** — `getOutstandingPeriods()` already handles filed periods in the middle via the `filings` array and gap scan. No changes to that logic.
- **`src/lib/roll-forward.ts`** — the cascade already skips completed periods. Seeded Filing records participate naturally.
- **Schema** — no migration. Existing `Filing` model and constraints are sufficient.
- **Submit routes** — already accept `periodStart`/`periodEnd` from request body and validate against `getOutstandingPeriods()`.
- **Dashboard** — already calls `getOutstandingPeriods()` which will now return accurate counts.
- **CT600** — untouched. Shows as unfiled for all periods; user files or ignores.

## Testing

1. **Unit test `detectAccountsGaps()`**: Company incorporated 2015, ARD 31 March, filed 2016/2017/2020/2021/2022. Should detect 2018 and 2019 as gaps, return `oldestUnfiledPeriodEnd` = 2018-03-31.
2. **Unit test `detectAccountsGaps()` — no gaps**: Company with all periods filed. Should return `next_accounts` dates.
3. **Unit test `detectAccountsGaps()` — never filed**: Company incorporated 2019, no filings. Should return the first period as oldest unfiled.
4. **Unit test `isBlockedTerritory`**: Period ending 6+ years ago should be blocked. Period ending 5 years ago should not.
5. **Integration test**: Add a company with known CH filing history, verify the filing selector page shows the correct number of outstanding periods with filed periods marked as complete.
6. **Edge case**: Company with a non-standard first accounting period (>12 months). Verify the first period is computed correctly.
