# CT600 Period Management — Design

**Date:** 2026-05-15
**Status:** Approved (brainstorm) — pending spec review & implementation plan

## Context

DormantFile's first real user feedback (Anouar) surfaced a correctness gap. His period
of accounts runs **07/02/2024 – 28/02/2025** (≈12 months 3 weeks). UK Corporation Tax
rules require a period of accounts longer than 12 months to be filed as **two CT600s**:
a first CTAP of exactly 12 months, then a remainder CTAP. He correctly identified this
and asked how to create/edit those periods — the dashboard only showed one.

Root cause: `src/lib/companies-house/materialise-filings.ts` creates the CT600 `Filing`
with the **same period as the accounts filing** (lines ~98–110) and never applies the
CTAP 12-month split. The existing `src/lib/ctap.ts` `computeCtaps()` already implements
12-month chunking but is unused by `materialiseFilings`. There is also no UI to
create/edit/split CT600 periods for the cases that legitimately diverge (dormancy
notices, trading start/stop, ARD changes, CT registration mid-period).

This is a near-universal first-year scenario (incorporation rarely aligns to a clean
ARD), so it affects a large share of target users, not an edge case. There is **no HMRC
API** that returns CT accounting periods or CT600 filing history to vendors (the CT600
channel is submission-only GovTalk; MTD-for-CT is not available). Periods must therefore
be **derived** from Companies House data + statutory CT rules, with a **manual override**
path because the user's real situation can diverge from what we can derive.

The HMRC submission/poll engine itself was fixed earlier in this session (six envelope/
poll bugs) and now works end-to-end against HMRC's test service; this feature builds the
period-correctness layer above it.

## Goals

- Automatically generate the **correct** CT600 CTAPs, splitting any >12-month period of
  accounts into a 12-month CTAP + remainder CTAP(s).
- Give users a **guided, validated** way to manually create/edit/split/delete CT600
  periods when reality diverges.
- Never silently produce an invalid set of periods on a penalty-bearing filing.

## Scope decisions (resolved in brainstorm)

1. **Scope:** both auto-split *and* a manual editor (one coherent feature).
2. **Editor strictness:** *guided & validated* — app auto-proposes the correct split;
   manual editing is enforced against CT rules (≤12mo, contiguous, exactly span the
   period of accounts, no gaps/overlaps).
3. **Engine approach:** **A — derived + protected overrides.** Extend the existing
   materialised-`Filing` model; no new period entity.
4. **Editor UI:** **B — dedicated "Manage periods" modal** launched from the
   Corporation Tax tab header.

## Design

### 1. Period-generation engine & CT rules

In `materialiseFilings`, stop mirroring the accounts period for CT600. Per period of
accounts, generate CTAPs via `computeCtaps(anchor, accountsPeriodEnd)`:

- `anchor = company.ctapStartDate ?? incorporation` (preserves existing
  "registered for CT mid-period / started trading later" semantics).
- 12-month chunks from the anchor; the **final chunk is the remainder** (ends on the
  period-of-accounts end). `07/02/2024–28/02/2025` → `07/02/2024–06/02/2025` +
  `07/02/2025–28/02/2025`. One CT600 `Filing` per CTAP (`startDate/endDate` = bounds,
  `periodStart/periodEnd` kept in sync).
- Subsequent ≤12-month, ARD-aligned periods → one CTAP each (unchanged behaviour).

**Deadline correctness:** the CT600 filing deadline is **12 months after the end of the
period of accounts**, and *every* CTAP in that period of accounts shares it (e.g. both
due `28/02/2026`). Replace per-CTAP `calculateCT600Deadline(ctapEnd)` with
`accountsPeriodEnd + 12 months`. Payment deadlines (per-CTAP) are nil/£0 for dormant
returns and are deliberately **not** surfaced (YAGNI).

**Resync protection (permanent rule):** on (re)materialise, for CT600 only, regenerate
**only** CT600s that are system-generated, still `outstanding`, and `ctapUserEdited=false`.
Never touch CT600s in `submitted/accepted/rejected/failed/filed_elsewhere` or with
`ctapUserEdited=true`.

### 2. Data model

- **New field:** `Filing.ctapUserEdited Boolean @default(false)`. Set `true` on any
  manual create/edit/split. Keys the resync-protection rule. No new tables.
- Reuse existing columns: `startDate/endDate` (CTAP bounds), `deadline` (shared
  accounts-end + 12mo), `status` (lifecycle). `periodStart/periodEnd` kept in sync with
  CTAP bounds (the `@@unique([companyId, periodStart, periodEnd, filingType])` and the
  UI depend on them).

### 3. Manual editor UI (modal)

Entry: a **"Manage periods"** button in the Corporation Tax tab header (Outstanding
view). Opens a dedicated modal containing:

- Read-only period of accounts (from the accounts `Filing` covering the span) + a
  plain-English explainer of the >12-month split rule.
- The auto-proposed CTAP chain, pre-filled and editable: per-row date inputs, **Split**,
  delete (×), **+ Add period**, a live validation summary.
- **Reset to suggested** — re-runs `computeCtaps` to restore the correct default.
- Immutable rows (`submitted/accepted/filed_elsewhere`) shown read-only for context.
- Cancel / Save (Save disabled until the whole set is valid).

### 4. Validation & API

Validation (enforced **client- and server-side**; server is authoritative):

- Each CTAP ≤ 12 months (`end ≤ start + 12 months − 1 day`).
- Contiguous: each next `start = previous end + 1 day`; no gaps, no overlaps.
- Chain spans exactly the period of accounts: first `start` = accounts start (or
  `ctapStartDate` anchor if set), last `end` = accounts-period end.
- Only `outstanding/failed/rejected` rows are editable; immutable rows cannot be
  modified or deleted.
- Inline messages explain each violation; invalid sets cannot be saved.

API: `POST /api/company/ct600-periods`
`{ companyId, accountsPeriodEndISO, periods: [{ startISO, endISO }] }`.
Auth = session + company ownership (mirrors `company/update` & `mark-filed`). Server
revalidates, then in a Prisma `$transaction` replaces the *editable* CT600 set for that
period of accounts with the submitted CTAPs: sets `ctapUserEdited=true`, recomputes each
`deadline = accountsPeriodEnd + 12mo`, leaves immutable CT600s untouched. Delete-then-
recreate avoids `@@unique` collisions.

### 5. Migration & rollout

CT600 filing was never live in production (feature-flagged off), so there are no real
submitted/accepted CT600s to protect — but companies registered for Corp Tax already
have the wrong single long-period `outstanding` CT600 rows.

- **Forward fix:** corrected `materialiseFilings` flows through the existing per-company
  "Sync with CH" and global resync paths — no new plumbing.
- **One-off backfill:** a `scripts/` script (mirroring `scripts/migrate-materialise-
  periods.ts`) that per company deletes system-generated `outstanding`
  (`ctapUserEdited=false`) CT600s and regenerates correct CTAPs in a transaction.
  Idempotent; protection rule keeps user-edited / filed periods intact.
- **Ship together:** schema field + corrected engine + backfill script + modal/API as
  one cohesive change. `prisma migrate deploy` runs in the build; backfill is a one-time
  post-deploy script run.

### 6. Error handling & testing

**Error handling**

- API returns structured 400 listing each violation; modal renders inline; invalid sets
  never save.
- Save is a single `$transaction` (delete → recreate); any failure rolls back the whole
  CTAP chain.
- Period turned immutable between modal-open and save (concurrent submit) → server
  rejects: "already filed — reopen to refresh".
- Auth/ownership → 401/403; missing company/period → 404. Engine edge cases (anchor past
  accounts end, missing ARD/incorporation) → no CT600s generated, no crash (existing
  guard).
- Backfill + resync idempotent.

**Testing**

- Unit (Vitest, mirrors `src/__tests__/lib`): generation incl. the **Anouar case**
  (`07/02/2024–28/02/2025` → two exact CTAPs), ≤12mo → 1 CTAP, `ctapStartDate` anchor
  respected, subsequent ARD periods → 1 each; shared-deadline rule; each validation rule
  (table-driven); resync-protection; backfill idempotency.
- Route: `POST /api/company/ct600-periods` — auth, ownership, server-side rejection,
  transactional replace, immutable protection.
- E2E (headed Chrome): Manage-periods modal → auto-split shown → adjust → save → two
  correct CT600 cards → file one to HMRC test end-to-end.
- Regression: HMRC submit/poll suite stays green.

## Out of scope (YAGNI)

- Separate CTAP/`TaxPeriod` entity (Approach B).
- Per-CTAP payment deadlines (nil/£0 for dormant).
- General automatic handling of non-long-period CTAP divergence (trading start/stop,
  mid-period cessation) — covered by the manual editor, not auto-derived.
- Any dependence on an HMRC "CT obligations/history" API (does not exist for vendors).

## Verification

End-to-end against HMRC's **test** service, reusing this session's headed-Chrome
walkthrough: create/resync a company with a >12-month first period → confirm two correct
outstanding CT600 cards auto-appear → open Manage periods, adjust and save → file one
CTAP and confirm HMRC acknowledgement + poll. Plus the unit/route suites above.

## Critical files

- `src/lib/companies-house/materialise-filings.ts` — generation (the root fix)
- `src/lib/ctap.ts` — `computeCtaps` (reused; possibly extended for remainder/anchor)
- `src/lib/utils.ts` — `calculateCT600Deadline` (deadline rule change)
- `prisma/schema.prisma` — `Filing.ctapUserEdited` (+ migration)
- `src/components/corp-tax-tab.tsx` — "Manage periods" entry + modal
- `src/app/api/company/ct600-periods/route.ts` — new validated endpoint
- `scripts/` — one-off backfill (mirror `migrate-materialise-periods.ts`)

## Open questions

None blocking. Anchor semantics, deadline rule, and resync-protection were resolved
during brainstorm.
