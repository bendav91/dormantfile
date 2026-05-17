# Filing preview & filed-document record — design

- **Date:** 2026-05-17
- **Status:** Approved (brainstorm) — pending spec review
- **Author:** Ben (with Claude)
- **Origin:** Customer feedback (Fraser) — initial 1-star review turned constructive.

## 1. Context & problem

A customer (Fraser) filed dormant accounts successfully but left a bad review, then
gave precise constructive feedback. His decomposed complaints:

1. False "filing failed" message when it had actually succeeded — **already fixed**
   (a polling/check bug) and out of scope here.
2. Could not select CH vs HMRC — a **mental-model gap**, not a feature request; he
   concluded it was probably unnecessary. Resolved by transparency, not a toggle.
3. **"I couldn't see / wasn't informed what was going to be filed. It just
   happened."** — his stated *main problem*.
4. Wanted a deliberate, user-initiated submission dialog with feedback.

Review of the codebase shows #4 is **already implemented** and post-dates Fraser's
filing: a dedicated [`FilingConfirmationDialog`](../../../src/components/filing-confirmation-dialog.tsx)
("you are about to submit … cannot be undone", Cancel / Yes), a user-initiated
submit, the director gate ([`director-confirm.tsx`](../../../src/components/director-confirm.tsx)),
a plain-English statement, and clear accepted/rejected/timeout/failed result
states in both flows
([`accounts-flow.tsx`](<../../../src/app/(app)/file/[companyId]/accounts/accounts-flow.tsx>),
[`filing-flow.tsx`](<../../../src/app/(app)/file/[companyId]/ct600/filing-flow.tsx>)).

**The genuine remaining gap is #3 — the user never sees the actual document.**
The capability to render it already exists but is **completely unwired**:
[`/api/file/preview-accounts`](../../../src/app/api/file/preview-accounts/route.ts)
and [`/api/file/preview-computations`](../../../src/app/api/file/preview-computations/route.ts)
generate the real iXBRL (with `?download=1`); `grep` confirms nothing in the UI
calls them. Post-filing, [`receipt/[filingId]/page.tsx`](<../../../src/app/(app)/company/[companyId]/receipt/[filingId]/page.tsx>)
shows only reference metadata (correlation ID, IRmark, dates) — never the document
that was filed.

This is one document-rendering capability surfaced at three lifecycle points:
**before** filing (review), **during** filing (reassurance), and **after** filing
(permanent record).

## 2. Goals / non-goals

**Goals**

- The user sees the exact document that will be filed, *before* filing, as an
  unmissable step they pass through (not a link they can skip).
- A permanent, accurate post-filing record of what was actually filed.
- For accounts: authoritative 1:1 copies from Companies House, including the
  company's full historical filing history (pre-DormantFile and non-dormant years).
- For CT600: a viewable copy of the return filed (no government equivalent exists).

**Non-goals**

- No CH/HMRC selection toggle (explicitly *not* what Fraser wanted).
- No change to the existing `FilingConfirmationDialog`, director gate, submission
  mechanics, or polling/check-status logic.
- No backfill of historical filings (see §5).
- No new cron / background infrastructure (lag handled lazily on view).

## 3. Locked decisions (from brainstorm)

| # | Decision |
|---|----------|
| D1 | Preview is its **own dedicated step** in the filing flow, not an inline panel. |
| D2 | One reusable `FiledDocumentViewer`, used at all three lifecycle points. |
| D3 | Post-filing **accounts** → official Companies House PDF (1:1), with our persisted iXBRL as a labelled interim copy during CH's publication lag. |
| D4 | Post-filing **CT600** → receipt + our rendered return (no government copy exists). |
| D5 | Persist the **exact rendered iXBRL** on the `Filing` row at submit time (immune to later template/data drift; defensible legal record). |

## 4. Design

### A. Filing flow + Preview step

New step order in both flows (accounts and CT600):

```
confirm → preview → authenticate/credentials → FilingConfirmationDialog → submitting → result
```

`preview` is inserted **after Confirm, before credentials**: review *what* is filed
(content) before authorising *how* (credentials). The existing
`FilingConfirmationDialog` is unchanged and remains the final irreversible gate;
passing through the preview step is itself the acknowledgement (no extra checkbox).

The Preview step renders:

- Header: *"This is exactly what will be submitted to Companies House / HMRC."*
- The actual rendered iXBRL document, embedded.
- A download link (preview routes already support `?download=1`).
- `Back` / `Continue`.

**CT600 nuance:** a CT600 submission carries *two* iXBRL documents — tax
computations *and* dormant accounts ([`submit/route.ts:314-322`](../../../src/app/api/file/submit/route.ts)).
The Preview step shows the **computations** as primary and notes the accounts
iXBRL is attached. The persisted snapshot stores **both**.

### B. `FiledDocumentViewer` component

One client component. Embeds the document in a sandboxed `<iframe>` pointed at the
preview route, with a download affordance and a context label.

- **Props:** `filingId`, `documentKind: "accounts" | "computations"`,
  `context: "pre-filing" | "post-ct600" | "post-accounts-interim"`,
  `downloadHref`.
- **Renders:** sandboxed iframe (`sandbox` with **no** `allow-scripts` — iXBRL is
  script-free XHTML), context label, download button.
- **Three placements:** pre-filing step; post-filing CT600 (fed persisted iXBRL);
  post-filing accounts interim (persisted iXBRL until CH publishes).
- Access control is inherited: it points at the existing owner-or-admin–guarded
  preview routes.

### C. Persistence + schema change

Two nullable `text` columns on `Filing` (Prisma `String?`):

- `filedAccountsIxbrl` — the dormant-accounts iXBRL actually transmitted.
- `filedComputationsIxbrl` — the tax-computations iXBRL (CT600 only; null for
  accounts filings).

Two typed columns (not one JSON blob) mirror how the generators/submit routes
already produce them separately. A few KB each.

**Write points** — persist the exact strings embedded in the submission, on the
**submitted/accepted transition** (the document *was* transmitted regardless of
the authority's later verdict), and **never on a pre-submission build failure**:

- The iXBRL strings are generated at
  [`submit-accounts/route.ts:311`](../../../src/app/api/file/submit-accounts/route.ts)
  and [`submit/route.ts:314-322`](../../../src/app/api/file/submit/route.ts);
  capture those exact strings and persist them at the **success
  `prisma.filing.update`** that records the submitted/accepted transition —
  `submit-accounts/route.ts:351` (`filedAccountsIxbrl`) and
  `submit/route.ts:376` (both columns). Do **not** wire the write at the
  generate site (it would persist on builds that never transmitted).

Migration is purely additive (two nullable columns; no data migration).

**Snapshot-aware preview route:** the preview routes become snapshot-aware — if
the filing has a persisted iXBRL (post-submission), serve it verbatim; otherwise
(pre-submission; the outstanding `Filing` row already exists with an id, e.g.
`/file/{companyId}/accounts?filingId=…`) generate live, which equals what submit
will send since submit reads the same live data at that moment. One route, correct
in both phases. There are currently **no** UI callers of these routes, so the
change carries no regression risk to existing screens.

### D. Companies House Filing History + Document API

The CH integration already exists:
[`src/lib/companies-house/filing-history.ts`](../../../src/lib/companies-house/filing-history.ts)
calls `${COMPANY_INFORMATION_API_ENDPOINT}/company/{number}/filing-history?category=accounts&items_per_page=100`
with Basic auth from `COMPANIES_HOUSE_API_KEY`. **Both env vars already exist and
are in production use** — no new configuration, dependency resolved.

The existing `fetchFilingHistory` / `fetchFilingHistoryStrict` are consumed by
resync and gap-detection and **discard** `links.document_metadata`. To avoid
regressing those, **add a new function** (do not modify the existing ones):

- `fetchAccountsFilingDocuments(companyNumber)` → returns richer entries per
  accounts filing: `{ madeUpDate, type, date, transactionId, documentMetadataUrl }`.
  Same endpoint/auth; keeps the existing `type` filter (`startsWith("AA")` covers
  dormant **and** non-dormant annual accounts — exactly the historical bonus).
- **Document API:** CH returns `links.document_metadata` as an **absolute URL** to
  the `document-api.company-information.service.gov.uk` host. Fetch
  `GET {document_metadata}/content` with `Accept: application/pdf` and the **same**
  Basic auth. No new endpoint env var (the URL comes from the response).
- The CH API key is secret → the PDF is fetched **server-side** via a thin proxy
  route `/api/file/official-accounts?filingId=…` that streams the PDF; owner/admin
  check mirrors the existing preview routes.

**Matching** a DormantFile filing to a CH history entry reuses the **existing
31-day tolerance** approach (`TOLERANCE_MS` in `filing-history.ts`, already
battle-tested by `detectAccountsGaps`): accounts `type` starts `"AA"` **and**
`|made_up_date − filing.periodEnd| ≤ 31 days`. No confident match (publication
lag) → fall back to a deep link to the company's CH filing-history page.

**Caching + lag:** filing history changes rarely — cache per company with a short
TTL so CH isn't hit on every page view. Post-submission the official entry won't
exist for hours/~a day; the accounts post-filing view shows our persisted iXBRL
labelled "official copy pending" and lazily re-checks CH on each visit; once
matched, the official PDF becomes primary. **No polling cron.**

### E. Post-filing UI

The hub stays the **receipt page**
([`receipt/[filingId]/page.tsx`](<../../../src/app/(app)/company/[companyId]/receipt/[filingId]/page.tsx>)),
already linked from the Completed sub-tab
([`filings-tab.tsx:432`](../../../src/components/filings-tab.tsx)) and
[`corp-tax-tab.tsx:435`](../../../src/components/corp-tax-tab.tsx). It gains a
document action:

- **Accounts:** "View the filed accounts" → `FiledDocumentViewer`. Official CH PDF
  if matched; persisted iXBRL labelled "official copy pending" during lag; CH PDF
  for legacy filings (CH holds it regardless of how it was filed).
- **CT600:** "View the return filed with HMRC" → viewer fed
  `filedComputationsIxbrl` (primary), with `filedAccountsIxbrl` also viewable.
  Legacy CT600 (no snapshot) → a dated note, no action.

The receipt page guards on `filing.status === "accepted"`
([`receipt/[filingId]/page.tsx:32`](<../../../src/app/(app)/company/[companyId]/receipt/[filingId]/page.tsx>)).
The post-filing document affordance is therefore scoped to **accepted**
filings only. The snapshot is persisted earlier (at *submitted*), but the
brief submitted-but-not-yet-accepted window is transient and already served
by the existing `result` step in the flow — it does **not** get its own
receipt-page entry point. No change to the `accepted` guard.

**Historical bonus:** a "Companies House record" panel in the Filings-tab
Completed area listing the company's *full* official accounts filing history from
CH (incl. pre-DormantFile and non-dormant years), each row a PDF view. Pure CH
passthrough; we never re-render those, so always accurate. (Alternative home: a
new company-page tab — recommending the Completed area to avoid new navigation;
easy to relocate.)

### F. Error / lag / legacy / edges

- **CH API down:** page never breaks — fall back to persisted iXBRL +
  "Companies House temporarily unavailable, showing our copy" + deep link to CH.
- **Publication lag:** lazy re-check on each visit; no cron; interim copy until
  matched.
- **Legacy (no snapshot):** accounts → CH PDF; CT600 → receipt + dated note.
  No backfill (regenerating would reintroduce the drift D5 exists to prevent).
- **CT600 without UTR:** `preview-computations` already returns 400 ("Company has
  no UTR set") — the Preview step shows that message and blocks Continue rather
  than rendering a broken iframe.
- **Non-dormant / third-party historical accounts:** listed and linked via the CH
  official PDF only; never re-rendered by us.
- **Access control:** viewer reuses the owner-or-admin–guarded preview routes; the
  CH PDF proxy enforces the same check.
- **iframe:** `sandbox` without `allow-scripts`; CSP-safe isolation.

### G. Testing (Vitest, mirrors `src/lib`)

- Submit routes persist `filedAccountsIxbrl` (+ `filedComputationsIxbrl`) on the
  submitted/accepted transition; **not** on pre-submission failure (mocked Prisma
  + mocked submission).
- Preview-route snapshot-awareness: persisted served verbatim when present,
  regenerated when absent.
- New `fetchAccountsFilingDocuments`: filing-history parse, `AA*` filter,
  `made_up_date` + `document_metadata` extraction, error/no-match path (mocked
  `fetch`). Existing `fetchFilingHistory` behaviour unchanged (regression guard).
- **Post-filing resolution** extracted to a pure function in `src/lib/`
  (`{ official | interim | legacy-none }`) — the core branching, unit-tested in
  isolation, including the 31-day tolerance match.
- `FiledDocumentViewer` renders the correct label per `context`.
- Legacy paths: filing without snapshot → CT600 note, accounts → CH fallthrough.

## 5. Assumptions & out of scope

- **Assumption (verify in implementation):** `COMPANIES_HOUSE_API_KEY` is
  authorised for the Document API as well as the public data API (the same key
  family; to confirm against a real document fetch in a non-prod environment).
- **Out of scope:** the already-fixed polling/false-failure bug; any CH/HMRC
  selection toggle; changes to the confirmation dialog, director gate, or
  submission/polling mechanics; backfilling snapshots for pre-feature filings.

## 6. Success criteria

- A first-time user filing dormant accounts sees the actual rendered accounts as a
  step they cannot bypass, then the existing confirmation gate — directly closing
  Fraser's "it just happened, I couldn't see what was going to be filed".
- After acceptance, the user can view the official Companies House PDF for that
  period (and all prior years), with a clearly-labelled interim copy during CH's
  publication lag.
- After a CT600, the user can view the exact computations/return that was filed.
- No regression to `fetchFilingHistory`/resync, the confirmation dialog, the
  director gate, or submission/polling.
