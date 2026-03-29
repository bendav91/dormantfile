# External Filing Resync

Detect accounts filings made outside DormantFile and update internal state accordingly.

## Problem

After onboarding, the app only tracks filings it submitted. If a user files through another service (or an accountant), the app still shows those periods as outstanding, sends incorrect reminders, and blocks filing of later periods.

## Solution

A shared resync function called from two triggers: a daily cron and a manual refresh button.

## Core function

**`resyncFromCompaniesHouse(companyId): Promise<ResyncResult>`**

Location: `src/lib/companies-house/resync.ts`

Returns: `{ newFilingsCount: number, error?: string }`

1. Load company record (with filings) and the company's user record (for email)
2. Fetch the CH company profile to get `date_of_creation` and `accounts.accounting_reference_date` (month/day). These are not stored on the Company model, so we fetch them fresh each time. This is the same API call the onboarding flow makes.
3. Call `fetchFilingHistoryStrict(companyNumber)` (new variant, see below) to get CH filed period ends. If it throws, return `{ newFilingsCount: 0, error: "CH API unavailable" }`.
4. Call `detectAccountsGaps(incorporationDate, ardMonth, ardDay, filedPeriodEnds)` to map CH dates to expected period ends and get the full `filedPeriodEnds` map. If it returns `null`, all periods are already filed — return `{ newFilingsCount: 0 }`.
5. Compare the `filedPeriodEnds` map against existing Filing records. For each entry in the map, check if a Filing record already exists with matching `companyId + filingType("accounts") + periodEnd`. If a record exists with *any* status (accepted, pending, submitted, etc.), skip it — don't overwrite in-progress filings.
6. For each genuinely new filing, compute `periodStart` using the same logic as `seedFilingHistory`: if the periodEnd matches `computeFirstPeriodEnd(incDate, ardMonth, ardDay)`, use the incorporation date; otherwise `periodEnd - 1 year + 1 day`. Create Filing records using `createMany` with `skipDuplicates: true` (matching the `seedFilingHistory` pattern) to gracefully handle any race with the DB unique constraint. Each record: `status: "accepted"`, `correlationId: null`, `filingType: "accounts"`, `confirmedAt: now()`.
7. If new filings were created, call `rollForwardPeriod()` for each new filing's `periodEnd`, passing `{ skipEmail: true }` (see below). Process in chronological order so the cascade works correctly.
8. Return `{ newFilingsCount }`.

### `fetchFilingHistoryStrict` — new throwing variant

The existing `fetchFilingHistory` returns `[]` on API failure (graceful degradation for onboarding). For resync, we need to distinguish "no filings" from "API down" to avoid false negatives.

New function in `src/lib/companies-house/filing-history.ts`:

```ts
export async function fetchFilingHistoryStrict(companyNumber: string): Promise<Date[]>
```

Same logic as `fetchFilingHistory` but throws on non-OK response or network error instead of returning `[]`. The existing `fetchFilingHistory` remains unchanged for its current callers.

### `rollForwardPeriod` — add `skipEmail` option

Add an optional `options` parameter to `rollForwardPeriod`:

```ts
export async function rollForwardPeriod(
  companyId: string,
  filedPeriodEnd: Date,
  registeredForCorpTax: boolean,
  filingType: "accounts" | "ct600",
  userEmail: string,
  companyName: string,
  options?: { skipEmail?: boolean }
): Promise<void>
```

When `skipEmail` is true, skip the confirmation email block at lines 26-45. The existing callers are unaffected (they don't pass options, so email sends as before). The resync function passes `{ skipEmail: true }` because the user already knows they filed elsewhere.

### Scope and limitations

- **Accounts only.** CT600 filings are HMRC-only with no public lookup API. This is a known limitation.
- **Non-current period filings.** If newly detected filings are for periods later than the company's current `accountingPeriodEnd`, Filing records are still created, but `rollForwardPeriod` won't advance the period pointer until the current (oldest unfiled) period is also complete. This matches the existing out-of-order filing behaviour.

## Daily cron

**Endpoint:** `GET /api/cron/resync-filings`

- Auth: Bearer token via `CRON_SECRET` (same pattern as existing crons)
- Schedule: `0 7 * * *` (7am UTC, one hour before 8am reminders cron so reminders reflect the latest state)
- Fetches all active companies: `deletedAt: null`, user has `subscriptionStatus` in `["active", "cancelling"]`
- Calls `resyncFromCompaniesHouse(companyId)` for each company **sequentially** to avoid hammering CH
- If resync returns an error for one company, log it and continue to the next
- Returns `{ companiesChecked: number, newFilingsDetected: number, errors: number }`
- At current scale (<50 companies), this completes well within Vercel's 300s Pro function timeout. If scale exceeds this, batch into multiple cron invocations.

**Vercel config addition:**
```json
{ "path": "/api/cron/resync-filings", "schedule": "0 7 * * *" }
```

## Manual refresh endpoint

**Endpoint:** `POST /api/company/resync`

- Auth: NextAuth session
- Body: `{ companyId: string }`
- Validates company belongs to authenticated user and user has active subscription (`subscriptionStatus` in `["active", "cancelling"]`)
- Rate limited: 5 calls per minute per user (reuse existing rate limiter)
- Calls `resyncFromCompaniesHouse(companyId)`
- Returns `{ newFilingsCount: number }` on success
- Returns 502 with `{ error: "..." }` if CH API is unavailable

## UI

### Sync button

- Location: company page header, right-aligned opposite company name/info
- Label: "Sync with CH" with lucide `RefreshCw` icon
- Implemented as a `SyncButton` client component — the company page remains a server component
- Props: `companyId: string`
- Loading state: button disabled, text changes to "Syncing...", icon spins via CSS animation
- After success: calls `router.refresh()` to reload server component data, then shows toast

### Toast notifications

Lightweight custom toast component (no external dependency). Renders fixed-position bottom-right, auto-dismisses after 4 seconds.

| Scenario | Style | Title | Subtitle |
|----------|-------|-------|----------|
| New filings found | Green | Synced with Companies House | {n} new filing(s) detected |
| No changes | Neutral | Already up to date | No new filings found on Companies House |
| CH API error | Red | Couldn't reach Companies House | Try again later |

## Error handling

- **Cron CH failures:** `resyncFromCompaniesHouse` returns `{ error }` instead of throwing. Cron logs it and continues. Error count included in response.
- **Manual CH failures:** Endpoint returns 502, client shows error toast. No data changes.
- **Duplicate prevention:** Before inserting each new Filing, check if a record exists with matching `companyId + filingType + periodEnd` (any status). Skip if found. This avoids both duplicates and overwriting in-progress filings.
- **Subscription gate:** The manual resync endpoint explicitly checks subscription status, not just session auth.

## Testing

Unit tests in `src/__tests__/lib/companies-house/resync.test.ts`:

- **New filings detected:** CH returns periods not in DB. Assert Filing records created with correct `periodStart`, `periodEnd`, `status`, `correlationId: null`. Assert `rollForwardPeriod` called with `skipEmail: true`.
- **No new filings:** CH returns same periods as DB. Assert no new records, no roll-forward.
- **CH API failure:** `fetchFilingHistoryStrict` throws. Assert function returns `{ newFilingsCount: 0, error: "..." }`, no DB changes.
- **Duplicate prevention:** CH returns a period that already has a Filing record (including `pending`/`submitted` statuses). Assert no duplicate created.
- **Period start calculation:** Assert first-period uses incorporation date, subsequent periods use `periodEnd - 1 year + 1 day`.

## Files changed

| File | Change |
|------|--------|
| `src/lib/companies-house/resync.ts` | New — core resync function |
| `src/lib/companies-house/filing-history.ts` | Modified — add `fetchFilingHistoryStrict` |
| `src/lib/roll-forward.ts` | Modified — add `options?: { skipEmail?: boolean }` parameter |
| `src/app/api/cron/resync-filings/route.ts` | New — daily cron endpoint |
| `src/app/api/company/resync/route.ts` | New — manual refresh endpoint |
| `src/components/sync-button.tsx` | New — client component for refresh button and toast |
| `src/app/(app)/company/[companyId]/page.tsx` | Modified — add SyncButton to header |
| `vercel.json` | Modified — add resync cron schedule |
| `src/__tests__/lib/companies-house/resync.test.ts` | New — unit tests |
