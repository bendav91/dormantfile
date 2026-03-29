# External Filing Resync

Detect when accounts filings are made outside of DormantFile and update the app's internal state accordingly.

## Problem

After onboarding, the app only tracks filings it submitted. If a user files through another service (accountant, another platform, directly with CH), the app still shows those periods as outstanding, sends incorrect reminders, and blocks filing of later periods.

## Decisions

| Question | Decision |
|----------|----------|
| What happens when an external filing is detected? | Full roll-forward — advance period pointer, cascade, reset reminders. |
| What filing types are covered? | Accounts detected automatically from CH API. CT600 via existing "Filed elsewhere?" manual button. |
| How often does the automatic resync run? | Daily at 7:00 AM UTC (1 hour before reminders, so reminders reflect latest state). |
| Where does the manual refresh button live? | Company header, above tabs — always visible. |
| What feedback does the refresh button give? | Spinner + `router.refresh()` + toast notification (success/info/error), auto-dismisses after 4s. |

## Implementation (Complete)

### Core Resync Function

**`src/lib/companies-house/resync.ts`** — `resyncFromCompaniesHouse(companyId): Promise<ResyncResult>`

1. Loads company with user record.
2. Fetches CH company profile for incorporation date and ARD.
3. Calls `fetchFilingHistoryStrict(companyNumber)` for CH filed period ends (throws on API failure).
4. Calls `detectAccountsGaps()` to map CH dates to expected period ends.
5. Diffs against existing Filing records (accounts only).
6. Creates new "accepted" Filing records (`correlationId: null`, `confirmedAt: now()`) via `createMany` with `skipDuplicates`.
7. Calls `rollForwardPeriod()` for each new filing in chronological order (`skipEmail: true`).
8. Returns `{ newFilingsCount, error? }`.

### Daily Resync Cron

**`src/app/api/cron/resync-filings/route.ts`** — `GET`

- Auth: `Bearer ${CRON_SECRET}`.
- Fetches all non-deleted companies with active/cancelling subscription users.
- Calls `resyncFromCompaniesHouse` sequentially for each company.
- Per-company errors logged to console, don't stop the batch.
- Returns `{ companiesChecked, newFilingsDetected, errors }` (errors is a count).
- Schedule: `0 7 * * *` in `vercel.json`.

### Manual Refresh API

**`src/app/api/company/resync/route.ts`** — `POST { companyId }`

- Auth: NextAuth session, user must own company.
- Subscription check: active or cancelling.
- Rate limit: 5 calls per user per 60 seconds (via existing `rateLimit` utility).
- Returns `{ newFilingsCount }` on success, 429 if rate-limited, 502 if CH unavailable.

### Sync Button

**`src/components/sync-button.tsx`** — `SyncButton` client component

- Location: company header in `src/app/(app)/company/[companyId]/page.tsx`, visible on all tabs.
- Shows `RefreshCw` icon, "Sync with CH" label.
- Loading: icon swaps to `Loader2` spinner, text becomes "Syncing...", button disabled.
- Success toast (green): "Synced with Companies House — N new filing(s) detected".
- Info toast (neutral): "Already up to date — No new filings found on Companies House".
- Error toast (red): "Couldn't reach Companies House — Try again later".
- Toast auto-dismisses after 4 seconds, positioned fixed bottom-right.

### Known Limitation

If every single period has been filed externally, `detectAccountsGaps` returns `null` and no records are created. Only affects companies where 100% of filings happened outside DormantFile. Documented as TODO in `resync.ts`.

## Remaining Work

### 1. Differentiate 429 from CH errors in SyncButton

Currently, `SyncButton` shows "Couldn't reach Companies House" for all non-OK responses, including rate-limit 429s. Should show "Try again in a few minutes" for 429 instead.

### 2. Tests

| File | Description |
|------|-------------|
| `src/__tests__/resync-cron.test.ts` | Cron handler: processes eligible companies, handles per-company errors, returns correct summary |
| `src/__tests__/company-resync-api.test.ts` | Manual resync API: auth, ownership, subscription, rate-limit, delegation to `resyncFromCompaniesHouse` |

## All Files

| File | Status |
|------|--------|
| `src/lib/companies-house/resync.ts` | Done |
| `src/lib/companies-house/filing-history.ts` | Done (`fetchFilingHistoryStrict`) |
| `src/lib/roll-forward.ts` | Done (`skipEmail` option) |
| `src/app/api/cron/resync-filings/route.ts` | Done |
| `src/app/api/company/resync/route.ts` | Done |
| `src/components/sync-button.tsx` | Done (needs 429 fix) |
| `src/app/(app)/company/[companyId]/page.tsx` | Done (SyncButton in header) |
| `vercel.json` | Done (cron at 7am UTC) |
| `src/__tests__/resync-cron.test.ts` | TODO |
| `src/__tests__/company-resync-api.test.ts` | TODO |
