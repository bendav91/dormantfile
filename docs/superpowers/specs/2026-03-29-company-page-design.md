# Company Detail Page

## Problem

Company management is scattered across the dashboard cards and filing pages. There's no way to disable Corporation Tax once enabled, no central place for company settings, and no way to view company information from Companies House. Adding features to individual company management requires either cramming more into the dashboard card or the filing selector.

## Solution

A new `/company/[companyId]` route with a tabbed layout: **Filings** (default), **Settings**, and **Overview**. The existing filing selector page migrates into the Filings tab. The Settings tab provides corp tax/UTR management (including removal), auth code, share capital, and company deletion. The Overview tab displays read-only company information from the CH API.

## Design decisions

- **Tabs via search param**: `?tab=filings|settings|overview` (default: `filings`). Server component reads the param and renders the appropriate tab content. No client-side tab state needed.
- **Filings tab is the existing filing selector**: The current `/file/[companyId]/page.tsx` content moves into a component. No functional changes to filing logic.
- **Filing flow pages stay put**: `/file/[companyId]/accounts` and `/file/[companyId]/ct600` remain at their current routes. Only their "back" breadcrumb links change.
- **Corp tax removal**: Sets `registeredForCorpTax = false`, clears `uniqueTaxReference`, deletes CT600 reminders. Existing CT600 Filing records are preserved. In-flight filings continue to poll and resolve normally.
- **Confirmation prompt for corp tax removal**: Only shown if there are active CT600 filings (`submitted`, `pending`, or `polling_timeout`). If no active filings, a simpler confirmation.
- **Overview tab fetches CH data server-side**: One API call when the tab is active. Graceful degradation if it fails.

## Route structure

### New route: `src/app/(app)/company/[companyId]/page.tsx`

Server component. Fetches the company (with filings) from the database. Reads `searchParams.tab` to determine which tab to render.

**Page layout:**
1. Back link to `/dashboard`
2. Company header: icon, name, CRN, outstanding period count
3. Tab bar: Filings | Settings | Overview (links are `?tab=X`, current tab highlighted)
4. Tab content area

### Redirect: `src/app/(app)/file/[companyId]/page.tsx`

Replace the current filing selector with a redirect to `/company/[companyId]`. Preserves bookmarks and any external links.

## Filings tab

The existing filing selector content, extracted into a component. Receives the company and filings as props from the parent page.

**Changes from current `/file/[companyId]/page.tsx`:**
- Company header removed (now in the shared page header)
- Back link removed (now in the shared page header)
- Everything else unchanged: period cards, gap warnings, disclosure warnings, blocked territory, completed periods section

**Internal links** (`/file/[companyId]/accounts?periodEnd=X` and `/file/[companyId]/ct600?periodEnd=X`) remain unchanged — the filing flow pages stay at their current routes.

## Settings tab

A single settings card with rows for each setting. Each row shows the current value and an action (Edit/Add/Remove).

### Corporation Tax / UTR

**When not registered (`registeredForCorpTax === false`):**
- Row shows "Corporation Tax" with "Not enabled" status
- "Enable CT600" button — expands inline to show UTR input (reuse existing `EnableCorpTax` component pattern)

**When registered (`registeredForCorpTax === true`):**
- Row shows "Corporation Tax" with UTR value
- "Edit" action for changing UTR (reuse existing `EditUTR` component pattern)
- "Remove" action — opens a confirmation dialog

**Confirmation dialog for removal:**
- Client component with state for showing/hiding
- Checks for active CT600 filings (`submitted`, `pending`, or `polling_timeout` status)
- If active filings exist: *"You have [N] CT600 filing(s) in progress. They will continue to be processed, but you won't be able to start new CT600 filings. Are you sure you want to disable Corporation Tax?"*
- If no active filings: *"This will remove Corporation Tax filing for this company. You can re-enable it later. Are you sure?"*
- Confirm calls `PATCH /api/company/update` with `{ companyId, registeredForCorpTax: false }`

### Company Auth Code

- Shows masked auth code (e.g. `••••AB`) or "Not set"
- "Edit" / "Add" action — inline input, save on Enter

### Share Capital

- Shows current value formatted as GBP (e.g. "£1.00")
- "Edit" action — inline input for pence value

### Delete Company

- Visually separated at the bottom (danger zone styling)
- "Remove company" button with confirmation dialog
- Existing soft-delete behaviour (`deletedAt` field), moved from wherever it currently lives in the UI

## Overview tab

Read-only company information from the CH Company Information API. Fetched server-side when `tab=overview`.

### Company details section
- Company name and number
- Company status (e.g. "Active", "Active - proposal to strike off")
- Date of incorporation
- Registered office address
- SIC codes with descriptions (e.g. "99999 — Dormant company")
- Company type (e.g. "Private limited by shares")

### Accounts status section
- Last accounts made up to (date)
- Next accounts due (date, with "Overdue" badge if applicable)
- Accounting reference date

### Recent filings section
- Last 5 filings from CH filing history (type description, date filed, period)
- Link: "View full history on Companies House" → `https://find-and-update.company-information.service.gov.uk/company/{CRN}/filing-history`

### Error handling
- If the CH API call fails, show: *"Could not load company information from Companies House. Try again later."*
- Does not block the rest of the page — tabs still work

## API changes

### `PATCH /api/company/update` — add Case 3: Disable Corp Tax

Current code has two cases:
1. Corp Tax already enabled → allow UTR update only
2. Enabling Corp Tax for the first time

Add Case 3: `registeredForCorpTax === false` when company currently has it enabled.

```
if (company.registeredForCorpTax && registeredForCorpTax === false) {
  // Transaction:
  // 1. Set registeredForCorpTax = false, uniqueTaxReference = null
  // 2. Delete CT600 reminders for this company
  // Leave existing Filing records untouched
}
```

### `GET /api/company/info` — new route (optional)

If the Overview tab fetches CH data server-side in the page component, this route isn't needed. But if we want client-side fetching (for loading states), add a simple proxy:

```
GET /api/company/info?companyId=X
→ Fetch from CH API
→ Return formatted company info
```

**Recommendation:** Server-side fetch in the page component. Simpler, no extra route needed.

## Link changes

| Current | New |
|---------|-----|
| Dashboard card → `/file/[companyId]` | Dashboard card → `/company/[companyId]` |
| Filing flow breadcrumb → `/file/[companyId]` | Filing flow breadcrumb → `/company/[companyId]` |
| `/file/[companyId]` | Redirects to `/company/[companyId]` |

## What doesn't change

- **Filing flow pages**: `/file/[companyId]/accounts` and `/file/[companyId]/ct600` stay at their current routes
- **Filing submission routes**: `/api/file/submit`, `/api/file/submit-accounts` — untouched
- **Roll-forward, period calculation, cron polling** — untouched
- **Schema** — no migration. Existing fields are sufficient
- **`EnableCorpTax` and `EditUTR` components** — reused or adapted for the Settings tab

## Testing

1. **Tab navigation**: Verify `?tab=filings`, `?tab=settings`, `?tab=overview` render the correct content. Default (no param) shows Filings.
2. **Corp tax removal — no active filings**: Disable corp tax, verify `registeredForCorpTax` is false, UTR is null, CT600 reminders deleted, CT600 rows no longer shown on Filings tab.
3. **Corp tax removal — with active filings**: Submit a CT600, then disable corp tax before it's accepted. Verify the filing continues to poll and resolves. Verify the confirmation dialog warned about active filings.
4. **Corp tax re-enable**: After removal, verify "Enable CT600" appears and works.
5. **Overview tab**: Verify company info loads from CH. Verify graceful degradation when CH API is down.
6. **Redirect**: Visit `/file/[companyId]`, verify redirect to `/company/[companyId]`.
7. **Filing flow back links**: From `/file/[companyId]/accounts`, verify breadcrumb links back to `/company/[companyId]`.
8. **Dashboard links**: Verify company card links go to `/company/[companyId]`.
