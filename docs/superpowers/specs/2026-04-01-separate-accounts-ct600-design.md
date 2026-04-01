# Separate Accounts Periods from CT600 CTAPs

## Context

DormantFile's filing system currently uses a single `Filing` model where accounts (Companies House) and CT600 (HMRC) filings share identical `periodStart`/`periodEnd` dates. This assumes Corporation Tax Accounting Periods (CTAPs) always align with CH accounting periods — but UK tax law says otherwise.

**CTAPs diverge from CH periods when:**
- A company goes dormant or wakes from dormancy (ends CTAP immediately)
- A company changes its ARD (lengthened period may require 2 CT600s for 1 set of accounts)
- First year after incorporation (HMRC assigns dates that may differ)
- A company starts/stops trading mid-period (each event ends the current CTAP)

**The fix:** Introduce a `Period` model (CH accounting period) as parent, with `Filing` records hanging off it with their own independent date ranges. CT600 filings can have CTAP dates that differ from the parent Period.

---

## Schema Changes

### New `Period` model

```prisma
model Period {
  id               String    @id @default(cuid())
  companyId        String
  periodStart      DateTime
  periodEnd        DateTime
  accountsDeadline DateTime
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  company          Company   @relation(fields: [companyId], references: [id])
  filings          Filing[]

  @@unique([companyId, periodStart, periodEnd])
}
```

### Modified `Filing` model

- Add `periodId String` (FK to Period)
- Rename `periodStart`/`periodEnd` to `startDate`/`endDate`
- Collapse `accountsDeadline`/`ct600Deadline` into single `deadline DateTime?`
- New unique constraint: `@@unique([periodId, filingType, startDate, endDate])`
- Keep `companyId` denormalised for query convenience

### New `Company` fields

- `ctapStartDate DateTime?` — user-confirmed CTAP anchor, set during CT600 onboarding
- `ardChangeDetected Boolean @default(false)` — flag when resync detects ARD mismatch
- `ardChangeDetectedAt DateTime?`
- `newArdMonth Int?` / `newArdDay Int?` — the detected new ARD values

### New file: `src/lib/ctap.ts`

CTAP computation utility:
- `computeCtaps(ctapStartDate, upToDate)` — generates 12-month CTAP ranges from anchor
- `findParentPeriod(ctapStart, periods)` — links a CTAP to the Period it starts within

---

## Migration Strategy (Zero-Downtime, 3-Deploy)

### Deploy 1: Additive (non-breaking)

**Migration SQL:**
1. Create `Period` table
2. Add nullable columns to `Filing`: `periodId`, `startDate`, `endDate`, `deadline`
3. Add `ctapStartDate`, `ardChangeDetected`, `ardChangeDetectedAt`, `newArdMonth`, `newArdDay` to `Company`
4. Add `periods Period[]` relation to Company

**Backfill script** (`scripts/backfill-periods.ts`):
```sql
-- Create Period per unique (companyId, periodStart, periodEnd) from accounts filings
INSERT INTO "Period" (id, "companyId", "periodStart", "periodEnd", "accountsDeadline", ...)
SELECT gen_random_uuid()::text, f."companyId", f."periodStart", f."periodEnd",
       COALESCE(f."accountsDeadline", f."periodEnd"), NOW(), NOW()
FROM "Filing" f WHERE f."filingType" = 'accounts'
GROUP BY f."companyId", f."periodStart", f."periodEnd", f."accountsDeadline";

-- Link all filings to their Period and populate new columns
UPDATE "Filing" f SET
  "periodId" = p.id,
  "startDate" = f."periodStart",
  "endDate" = f."periodEnd",
  "deadline" = CASE WHEN f."filingType" = 'accounts' THEN f."accountsDeadline"
                    ELSE COALESCE(f."ct600Deadline", f."accountsDeadline") END
FROM "Period" p
WHERE p."companyId" = f."companyId" AND p."periodStart" = f."periodStart" AND p."periodEnd" = f."periodEnd";
```

**Code change:** Dual-write — all create/update operations write to both old and new columns.

### Deploy 2: Switch reads

All code reads from new columns exclusively. Old columns still populated but unused.

### Deploy 3: Cleanup

Migration: drop `periodStart`, `periodEnd`, `accountsDeadline`, `ct600Deadline` from Filing. Make `periodId`, `startDate`, `endDate` non-nullable. Drop old unique constraint, add new one.

---

## Backend Changes (File-by-File)

### Core data layer

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add Period model, modify Filing, add Company fields |
| `src/lib/filing-queries.ts` | `buildPeriodViews()` groups by `periodId` instead of `periodEnd.getTime()`. `PeriodView.ct600Filing` becomes `ct600Filings: FilingRecord[]`. Accept `(periods, filings)` args instead of just `filings`. |
| `src/lib/ctap.ts` | **New file.** `computeCtaps()`, `findParentPeriod()` |
| `src/lib/roll-forward.ts` | Accept `startDate`/`endDate` instead of `filedPeriodEnd`. Stop deriving periodStart. |
| `src/lib/activity-timeline.ts` | `FilingInput.periodStart/periodEnd` becomes `startDate/endDate` |
| `src/lib/utils.ts` | No changes — `calculateAccountsDeadline()`/`calculateCT600Deadline()` are pure date functions |

### API routes — submission

| File | Change |
|------|--------|
| `src/app/api/file/submit/route.ts` | Accept `filingId` instead of `periodStart`/`periodEnd`. Look up filing by ID. Pass `filing.startDate`/`filing.endDate` to XML builders and rollForward. Add optimistic lock: `updateMany({ where: { id, status: 'outstanding' }, data: { status: 'pending' } })` — reject if count=0 (concurrent submission prevention). |
| `src/app/api/file/submit-accounts/route.ts` | Same pattern — `filingId`-based lookup. |
| `src/app/api/file/check-status/route.ts` | Use `filing.endDate` in rollForward call. Already uses filing ID otherwise. |

### API routes — filing management

| File | Change |
|------|--------|
| `src/app/api/file/mark-filed/route.ts` | Accept `filingId` instead of `companyId`+`periodEnd`. For CT600: also accept optional `ctapEndDate` and `ctapStartDate` — update filing's `endDate`/`startDate` if provided (captures the actual CTAP range when marking filed elsewhere). If no Period exists, create one. |
| `src/app/api/file/undo-mark-filed/route.ts` | Already uses `filingId` — minimal change (column renames only). |
| `src/app/api/company/suppress/route.ts` | Look up Period by `(companyId, periodEnd)`, then update all outstanding filings where `periodId = period.id`. |

### API routes — cron jobs

| File | Change |
|------|--------|
| `src/app/api/cron/create-periods/route.ts` | **Split into two loops.** Loop 1 (accounts): find latest `Period.periodEnd`, create next Period + accounts Filing. Loop 2 (CT600): determine CTAP anchor via `max(latestCt600.endDate + 1, company.ctapStartDate)`, create CT600 Filing with its own dates, link to parent Period via `findParentPeriod()`. |
| `src/app/api/cron/poll-filings/route.ts` | Use `filing.endDate` in rollForward call. Rest uses filing ID. |
| `src/app/api/cron/reminders/route.ts` | Replace `accountsDeadline` filter/reference with `deadline`. Add ARD change email escalation (3 days after detection). |
| `src/app/api/cron/resync-filings/route.ts` | Delegates to resync.ts (see below). |

### API routes — company management

| File | Change |
|------|--------|
| `src/app/api/company/update/route.ts` | **Case 3 (enable CT):** Accept `ctapStartDate` in body. Save to `company.ctapStartDate`. Use `computeCtaps()` to generate CT600 filings with potentially divergent dates. Fall back to period-aligned dates if `ctapStartDate` not provided. **Case 1 (disable CT):** Also clear `ctapStartDate`. |
| `src/app/api/company/route.ts` | `materialiseFilings()` becomes `materialisePeriodsAndFilings()` — create Period records first, then Filings linked to them. |
| `src/app/api/company/confirm-ard/route.ts` | **New endpoint.** Accepts `{ companyId, confirmed }`. If confirmed: update `ardMonth`/`ardDay`, recalculate outstanding Period `periodEnd` + filing `endDate`/`deadline`, clear `ardChangeDetected`. If rejected: clear flag, set `ardOverrideUntil` (+90 days). |

### Libraries

| File | Change |
|------|--------|
| `src/lib/companies-house/resync.ts` | Match CH filing history against `Period.periodEnd` (not `Filing.periodEnd`). Detect ARD changes: compare stored `ardMonth/ardDay` against CH profile, set `ardChangeDetected` if mismatch. |
| `src/lib/hmrc/xml-builder.ts` | No changes — accepts generic date inputs. Callers pass `filing.startDate/endDate`. |
| `src/lib/companies-house/xml-builder.ts` | No changes. |
| `src/lib/ixbrl/dormant-accounts.ts` | No changes. |
| `src/lib/ixbrl/tax-computations.ts` | No changes. |
| `src/app/api/calendar/feed/route.ts` | One event per Filing using `filing.deadline`. UID simplifies to `${filing.id}@dormantfile.co.uk`. |
| `src/lib/admin.ts` | Replace `accountsDeadline`/`ct600Deadline` references with `deadline`. |

---

## Frontend Changes

### URL strategy

Filing flow links change from `?periodEnd=YYYY-MM-DD` to `?filingId=<id>`.

Both `accounts/page.tsx` and `ct600/page.tsx` accept `filingId` as primary param with `periodEnd` fallback for backward-compat (bookmarked URLs).

```typescript
// accounts/page.tsx, ct600/page.tsx
const { filingId, periodEnd: periodEndParam } = await searchParams;

if (filingId) {
  const filing = await prisma.filing.findFirst({ where: { id: filingId, company: { userId } } });
  // use filing.startDate, filing.endDate
} else if (periodEndParam) {
  // legacy fallback — look up by period dates
}
```

Submit API routes also switch to `filingId` in POST body.

### Component changes

| File | Change |
|------|--------|
| `src/components/filings-tab.tsx` | Remove `getFilingForPeriod()`. Use `period.accountsFiling` / `period.ct600Filings` directly. Links use `filingId`. CT600 row shows its own date range when different from Period. Completed/filed-elsewhere tabs group by `periodId`. |
| `src/components/mark-filed-button.tsx` | Props change to `{ filingId, filingType, defaultEndDate? }`. For CT600: show inline date picker for CTAP end date before confirming. POST `{ filingId, ctapEndDate }`. |
| `src/components/suppress-button.tsx` | Accept `periodId` instead of `periodEnd`. POST uses `periodId`. |
| `src/components/copy-filing-summary.tsx` | Use filing's `startDate`/`endDate` (not period dates) so CT600 summaries show CTAP range. |
| `src/components/settings-tab.tsx` | CT600 enable form gains date input for CTAP start date (pre-filled with CH period start). Help text: "Usually the same as your accounts period start date. If unsure, check your HMRC Business Tax Account or CT41G letter." |
| `src/components/ard-mismatch-banner.tsx` | **New component.** Warning banner when `ardChangeDetected`. Shows old vs new ARD. "Update periods" button triggers confirmation modal → POSTs to `/api/company/confirm-ard`. |

### Type changes

`PeriodView` in `src/lib/filing-queries.ts`:
- Add `periodId: string`
- `ct600Filing: FilingRecord | null` becomes `ct600Filings: FilingRecord[]`
- Remove `ct600Deadline` (lives on individual Filing.deadline)
- `ct600Filed` becomes `ct600Filings.length > 0 && ct600Filings.every(f => isFiled(f))`

`buildPeriodViews(periods: PeriodInput[], filings: FilingRecord[])` — groups by `periodId` key.

---

## Edge Case Handling

### Tier 1 (built into design)

| Edge case | Mitigation |
|-----------|------------|
| First accounts period not 12 months | Period model accepts arbitrary date ranges. `materialisePeriodsAndFilings()` uses actual incorporation-derived dates. |
| HMRC rejects CT600 for wrong CTAP dates | Filing goes to `rejected`. User can correct `ctapStartDate` via settings, which regenerates outstanding CT600 filings. |
| CT600 filed elsewhere breaks CTAP chain | `mark-filed` for CT600 requires `ctapEndDate`. This anchors the next CTAP start. |
| CTAP straddles Period boundary | Filing links to Period it starts in. Query logic handles CT600s whose dates extend beyond parent Period. |
| Overlapping Periods | Application-level validation before Period creation: check for date overlap. |
| Concurrent submission | Optimistic lock: `updateMany({ where: { id, status: 'outstanding' } })` — 409 if count=0. |
| ARD change ignored for months | Escalation: banner (day 0) → email (day 3) → block filing (day 14). |
| Pre-submission date validation | Check CH API's `next_accounts.period_end_on` before submitting. Warn on mismatch. |

### Tier 2 (guardrails)

| Edge case | Guardrail |
|-----------|-----------|
| Company struck off | Resync checks `companyStatus`. If dissolved, freeze outstanding filings + notify. |
| Deregister CT mid-CTAP | Block toggle if CT600 in `submitted`/`polling_timeout`. Warn if outstanding CT600s exist. |
| Duplicate filing (us + accountant) | Pre-submission: query CH filing history. Warn if already filed. |
| Cron race (resync vs create-periods) | Scheduling order (07:00 then 07:30) already correct. Add safety: skip companies resynced < 5 min ago. |

---

## New Files

| File | Purpose |
|------|---------|
| `src/lib/ctap.ts` | CTAP computation: `computeCtaps()`, `findParentPeriod()` |
| `src/components/ard-mismatch-banner.tsx` | ARD change warning banner + confirmation |
| `src/app/api/company/confirm-ard/route.ts` | ARD change confirmation endpoint |
| `scripts/backfill-periods.ts` | One-time data migration script |
| `src/__tests__/lib/ctap.test.ts` | Tests for CTAP computation |

---

## Implementation Sequencing

### Phase 1: Schema + backfill (no behavior change)
1. Prisma migration: add Period table, new Filing columns (nullable), new Company fields
2. Backfill script: create Periods from existing filings, populate new Filing columns
3. Verify: zero NULL `periodId` rows

### Phase 2: Core data layer
4. `src/lib/ctap.ts` + tests
5. `src/lib/filing-queries.ts` — new `buildPeriodViews()` signature and grouping
6. `src/lib/roll-forward.ts` — accept startDate/endDate
7. `src/lib/activity-timeline.ts` — field renames

### Phase 3: API routes
8. `src/app/api/cron/create-periods/route.ts` — split generation
9. `src/app/api/company/update/route.ts` — ctapStartDate support
10. `src/app/api/company/route.ts` — materialise Periods + Filings
11. `src/app/api/file/submit/route.ts` — filingId lookup + optimistic lock
12. `src/app/api/file/submit-accounts/route.ts` — same
13. `src/app/api/file/check-status/route.ts` — endDate
14. `src/app/api/file/mark-filed/route.ts` — filingId + ctapEndDate
15. `src/app/api/cron/poll-filings/route.ts` — endDate
16. `src/app/api/cron/reminders/route.ts` — deadline field
17. `src/app/api/calendar/feed/route.ts` — deadline field
18. `src/lib/companies-house/resync.ts` — Period-aware + ARD detection
19. `src/app/api/company/suppress/route.ts` — periodId
20. `src/lib/admin.ts` — deadline field

### Phase 4: Frontend
21. `src/components/filings-tab.tsx` — new PeriodView shape, filingId links
22. `src/components/mark-filed-button.tsx` — filingId + CT600 date picker
23. `src/components/suppress-button.tsx` — periodId
24. `src/components/settings-tab.tsx` — CTAP start date field
25. `src/app/(app)/file/[companyId]/accounts/page.tsx` — filingId param
26. `src/app/(app)/file/[companyId]/ct600/page.tsx` — filingId param
27. `src/components/ard-mismatch-banner.tsx` — new
28. `src/app/api/company/confirm-ard/route.ts` — new
29. Company dashboard page — wire up ARD banner + Period query

### Phase 5: Cleanup
30. Migration: make columns non-nullable, drop old columns, new unique constraint
31. Remove dual-write code
32. Update all tests

---

## Verification

1. **Unit tests:** Run `npm test` — all existing tests updated, new tests for `ctap.ts` and `buildPeriodViews()` with divergent CTAP scenarios
2. **Migration test:** Run backfill on a local copy of production data. Verify `SELECT count(*) FROM "Filing" WHERE "periodId" IS NULL` = 0
3. **Manual test — aligned company:** Add a dormant company, enable CT600 with default dates. Verify filings tab shows same behavior as before.
4. **Manual test — divergent CTAP:** Enable CT600 with a `ctapStartDate` that differs from the CH period start. Verify CT600 row shows its own date range.
5. **Manual test — mark filed elsewhere:** Mark a CT600 as filed elsewhere with a custom CTAP end date. Verify the next generated CTAP chains from that date.
6. **Manual test — ARD change:** Manually set `ardChangeDetected = true` on a company. Verify banner appears, confirmation updates Period dates.
7. **Build:** Run `npm run build` — no type errors
8. **Lint:** Run `npm run lint` — clean
