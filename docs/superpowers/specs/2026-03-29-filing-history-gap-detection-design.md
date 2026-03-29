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
- **Graceful degradation**: If the CH filing history API call fails (network error, rate limit, 500), company creation proceeds without gap detection — using `next_accounts` dates as today. The user gets the current behaviour rather than a hard failure. Log the error for monitoring.
- **ARD changes are a known limitation**: Period generation uses the company's current accounting reference date. Companies that have changed their ARD mid-life may show incorrect periods for the transitional year. This is acceptable because ARD changes are rare for dormant companies (the target market), and the failure mode is safe — a false gap (showing a period as unfiled when it was filed under a different year-end) rather than a hidden gap.

## Filing age tiers

| Age           | Behaviour                                                          |
| ------------- | ------------------------------------------------------------------ |
| Under 4 years | File normally, no warnings                                         |
| 4-6 years     | Amber warning (existing `isDisclosureTerritory`), filing allowed   |
| Over 6 years  | Red banner, "File" button replaced with "Seek professional advice" |

Banner copy for 6+ years: _"This period is more than 6 years overdue. We recommend consulting an accountant or contacting HMRC and Companies House directly."_

## New module: `src/lib/companies-house/filing-history.ts`

### `fetchFilingHistory(companyNumber: string): Promise<Date[]>`

Calls `GET /company/{number}/filing-history?category=accounts&items_per_page=100` on the CH API. Returns an array of `made_up_date` values (as `Date` objects) for all annual accounts filings (type codes starting with `AA`).

Uses the same Basic Auth mechanism as the existing company info fetch.

**Pagination**: The `category=accounts` filter limits results to accounts filings only. 100 items covers 100 years of annual filings — sufficient for any real company. No pagination handling needed.

**Missing `made_up_date`**: Some older CH filings may lack a `made_up_date` field. Skip these entries — the worst case is a false gap (safe direction).

### `detectAccountsGaps(...): GapDetectionResult | null`

```typescript
function detectAccountsGaps(
  incorporationDate: string, // e.g. "2015-05-16"
  accountingReferenceMonth: number, // from CH: accounts.accounting_reference_date.month (parsed from string)
  accountingReferenceDay: number, // from CH: accounts.accounting_reference_date.day (parsed from string)
  filedPeriodEnds: Date[], // from fetchFilingHistory
  nextAccountsStart: Date, // fallback: CH next_accounts.period_start_on
  nextAccountsEnd: Date, // fallback: CH next_accounts.period_end_on
): GapDetectionResult | null;

interface GapDetectionResult {
  oldestUnfiledPeriodStart: Date;
  oldestUnfiledPeriodEnd: Date;
  filedPeriodEnds: Date[];
}
```

Returns `null` if no gaps are detected (all periods are filed), meaning the caller should use CH's `next_accounts` dates as-is.

**First period calculation**:

1. Parse `incorporationDate` to get the incorporation date
2. Find the first accounting reference date (ARD) that falls on or after the incorporation date: set year to incorporation year, month/day to the accounting reference month/day. If this date is before the incorporation date, advance by 1 year.
3. This gives the first expected `periodEnd`. The first `periodStart` is the incorporation date itself (not `periodEnd - 1 year + 1 day`).
4. If the gap between incorporation and this first ARD exceeds 18 months, use the ARD one year earlier instead (CH's 18-month cap for first accounts).

**Subsequent periods**: After the first period, advance `periodEnd` by 1 year each time. Each subsequent `periodStart` is the previous `periodEnd + 1 day`.

**Matching**: A generated period is considered "filed" if any `made_up_date` in `filedPeriodEnds` falls within 31 days of the expected `periodEnd`. This tolerance handles minor date variations from ARD changes or CH rounding. Exact matching would produce false gaps for companies with historical ARD adjustments.

**Result**: Return the earliest unmatched period. If all are matched, return `null`.

This function is pure (no I/O) and unit-testable.

## Changes to `src/app/api/company/route.ts`

### Relax the `next_accounts` guard

The current early return on line 82 (`if (!nextAccounts?.period_end_on)`) rejects companies before gap detection runs. Move this check to after gap detection: if `detectAccountsGaps()` returns `null` (no gaps) AND `next_accounts` is missing, then return the 400 error. If gaps are detected, `next_accounts` is not needed.

### After the existing CH company info fetch:

1. Call `fetchFilingHistory(paddedNumber)` to get the list of filed period end dates.
2. Parse `accounts.accounting_reference_date` from the CH response — this is an object with `month: string` and `day: string` fields (e.g. `{ month: "3", day: "31" }`). Parse both to numbers. If `accounting_reference_date` is missing (rare, but possible for very old companies), derive month/day from `next_accounts.period_end_on` as a fallback. If neither is available, skip gap detection and use `next_accounts` dates as-is.
3. Call `detectAccountsGaps()` with `date_of_creation`, the parsed ARD month/day, filed period ends, and `next_accounts` start/end as fallback.
4. If gaps are detected (non-null result), override `accountingPeriodStart`/`accountingPeriodEnd` with the result.
5. After creating the company record, seed `Filing` records with `status: "accepted"`, `filingType: "accounts"`, and `confirmedAt: new Date()` for each filed period end. For the first period, `periodStart` = incorporation date. For subsequent periods, `periodStart` = previous `periodEnd + 1 day`. Use `createMany({ skipDuplicates: true })` to avoid constraint violations if some filing records already exist (e.g. from a previous soft-delete/restore cycle or real submissions).

### Soft-delete restore path

When restoring a soft-deleted company: re-fetch filing history and re-seed, but only delete **seeded** filing records (those with `status: "accepted"` and no `correlationId`). Real submission records with `correlationId`, `irmark`, etc. must be preserved.

### Reminder setup

Unchanged — it uses the oldest unfiled period's deadlines, which are now correct.

## Changes to submit routes

Both `src/app/api/file/submit/route.ts` (line 133) and `src/app/api/file/submit-accounts/route.ts` (line 114) currently hard-block filings where `isDisclosureTerritory` is true (>4 years).

Change the guard to check `isBlockedTerritory` instead:

```typescript
// Before:
if (targetPeriod.isDisclosureTerritory) { ... }

// After:
if (targetPeriod.isBlockedTerritory) {
  return NextResponse.json(
    { error: "This period is more than 6 years overdue. We recommend consulting an accountant or contacting HMRC and Companies House directly." },
    { status: 400 },
  );
}
```

This allows 4-6 year old periods to be filed (with the amber UI warning), while hard-blocking anything older than 6 years at the API level.

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
- Copy: _"This period is more than 6 years overdue. We recommend consulting an accountant or contacting HMRC and Companies House directly."_

## What doesn't change

- **`src/lib/periods.ts` core logic** — `getOutstandingPeriods()` already handles filed periods in the middle via the `filings` array and gap scan. No changes beyond adding `isBlockedTerritory`.
- **`src/lib/roll-forward.ts`** — the cascade already skips completed periods. Seeded Filing records participate naturally.
- **Schema** — no migration. Existing `Filing` model and constraints are sufficient.
- **Dashboard** — already calls `getOutstandingPeriods()` which will now return accurate counts.
- **CT600** — untouched. Shows as unfiled for all periods; user files or ignores.

## Known limitations

- **ARD changes**: Companies that changed their accounting reference date mid-life may show a false gap for the transitional period. The 31-day tolerance in matching mitigates minor adjustments, but a year-end change (e.g. March to December) could produce a spurious unfiled period. This is the safe failure mode (false negative, not false positive).
- **CT600 history**: No way to detect which CT600 periods have been filed. All CT600 periods show as unfiled.

## Testing

1. **Unit test `detectAccountsGaps()`**: Company incorporated 2015-05-16, ARD 31 March, filed 2016/2017/2020/2021/2022. Should detect 2018 and 2019 as gaps, return `oldestUnfiledPeriodEnd` = 2018-03-31.
2. **Unit test `detectAccountsGaps()` — no gaps**: Company with all periods filed. Should return `null`.
3. **Unit test `detectAccountsGaps()` — never filed**: Company incorporated 2019, no filings. Should return the first period as oldest unfiled, with `periodStart` = incorporation date.
4. **Unit test first period calculation**: Company incorporated 2015-05-16, ARD 31 March. First period end should be 2016-03-31. First period start should be 2015-05-16 (incorporation date).
5. **Unit test first period — 18 month cap**: Company incorporated 2015-01-05, ARD 31 March. Naive first ARD would be 2016-03-31 (14.8 months) — within 18 months, so valid. Company incorporated 2014-06-01, ARD 31 March. Naive first ARD would be 2016-03-31 (22 months) — exceeds 18 months, should use 2015-03-31 instead.
6. **Unit test `isBlockedTerritory`**: Period ending 6+ years ago should be blocked. Period ending 5 years ago should not.
7. **Unit test tolerance matching**: Filed period with `made_up_date` 15 days off from expected `periodEnd` should still count as filed.
8. **Integration test**: Add a company with known CH filing history, verify the filing selector page shows the correct number of outstanding periods with filed periods marked as complete.
9. **Edge case: ARD change**: Company with a changed year-end. Document the expected (imperfect) behaviour.
10. **Soft-delete restore**: Re-add a previously deleted company. Verify real filing records (with `correlationId`) are preserved while seeded records are refreshed.
