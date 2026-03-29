# Dashboard Company Card Redesign

## Problem

The dashboard company cards are heavy — each one contains filing rows with individual deadlines, File/Retry action buttons, inline UTR editing, EnableCorpTax widget, and status badges. Now that the company detail page exists at `/company/[companyId]`, these inline actions are redundant. The cards should be summary-only, linking through to the company page for all actions.

## Solution

Strip the cards down to: company header, deadline summary with urgency colouring, and outstanding period count. The entire card is a clickable link to `/company/[companyId]`. No buttons, no inline editing, no filing actions.

## Card content

### Header
- Company icon (existing style)
- Company name (truncated with ellipsis)
- CRN
- No inline UTR editing

### Deadline summary
- **Accounts deadline** for the current (oldest unfiled) period, with urgency colouring:
  - Overdue (deadline passed): `var(--color-danger)` — text: "Accounts overdue — due DD MMM YYYY" (or "X years overdue" if 2+ years)
  - Due within 30 days: `var(--color-due-soon)` — text: "Accounts due in Xd — DD MMM YYYY"
  - Normal: `var(--color-text-secondary)` — text: "Accounts due DD MMM YYYY"
- **CT600 deadline** (second line, only if `registeredForCorpTax`), same urgency colouring pattern
- If company is all caught up (no outstanding periods): green "All caught up" text with next period due date

### Outstanding badge
- `outstandingCount > 0`: pill badge "N outstanding ›"
  - 4+ outstanding: danger colour
  - 1-3 outstanding: warning colour
- `outstandingCount === 0`: no badge (the "All caught up" text covers it)

### Clickable card
- The entire card is wrapped in a `<Link href={/company/${company.id}}>` (or `<a>`)
- Hover state: slightly brighter background
- Remove all interior `<Link>` and `<button>` elements

## What's removed from the card

- `EditUTR` component usage and import
- `EnableCorpTax` component usage and import
- `FilingStatusBadge` import and usage
- `accountsFiling` and `ct600Filing` lookups
- `filingBtnStyle` and all action buttons (File, Retry)
- `canFile` and `hasMultiplePeriods` conditional button logic
- "View all periods" link at the bottom
- Period date row (`Period DD MMM YYYY – DD MMM YYYY`)

## What stays

- Grid layout: `repeat(auto-fill, minmax(420px, 1fr))`
- Card container styling (background, border, shadow, border-radius)
- Company icon with primary background
- Data fetching: company with filings, period computation (needed for deadline/urgency)
- Dashboard header, filters, search, pagination, subscription banner — all untouched

## Files changed

- `src/app/(app)/dashboard/page.tsx` — the only file. Replace the card JSX (~lines 380-580) with the simplified version. Remove unused imports (`EditUTR`, `EnableCorpTax`, `FilingStatusBadge`).
