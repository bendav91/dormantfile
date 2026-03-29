# Filings Tab Redesign: Outstanding / Completed Sub-Tabs

## Summary

Replace the single scrolling list in the company FilingsTab with two client-side sub-tabs — **Outstanding** and **Completed** — so users can see their full filing history with rich detail after syncing.

## Motivation

Currently completed periods are shown as dimmed rows at the bottom of the filings list. After syncing with Companies House, a company may have many completed periods that users want to review. Giving completed filings their own tab with proper detail makes the history useful rather than an afterthought.

## Design

### Sub-tab bar

- Rendered inside `FilingsTab` as a pill/segment control
- Two tabs: **Outstanding (N)** and **Completed (N)** where N is the count
- Client-side state via `useState` — no URL params
- Default to "Outstanding" tab
- Styled as a contained segment control, visually distinct from the parent page tabs:
  - Background: `var(--color-bg-inset)` with `border-radius: 10px` and `padding: 4px`
  - Each tab button: `border-radius: 8px`, `padding: 8px 16px`, `font-size: 13px`, `font-weight: 600`
  - Active tab: `background: var(--color-bg-card)`, `color: var(--color-text-primary)`, subtle box-shadow
  - Inactive tab: transparent background, `color: var(--color-text-secondary)`
  - `margin-bottom: 20px` below the control

### Outstanding tab

Identical to the current incomplete periods view — no changes to the existing cards, warnings, or action buttons. The disclosure territory warning banner stays above the tab bar since it's a company-level concern.

### Completed tab

Each completed period rendered as a full card (same card style as outstanding, not the current dimmed row):

- **Period header**: date range (e.g. "1 January 2024 – 31 December 2024")
- **Filing rows** for Accounts and CT600 (if registered for corp tax), each showing:
  - Filing type label ("Accounts" / "CT600")
  - Status badge via existing `FilingStatusBadge` component
  - Confirmed date from `confirmedAt` (e.g. "Accepted 15 Mar 2025")
  - Source hint: "Filed via DormantFile" if `submittedAt` is present, "Filed elsewhere" if not (externally synced or marked as filed)
- No action buttons — completed filings are read-only
- Cards at full opacity (not dimmed like current design)
- Ordered with most recent period first (reverse chronological — reverse the `completePeriods` array before rendering)

### Empty states

- **Outstanding tab empty**: Show existing "All caught up" message with checkmark, regardless of whether completed periods exist (change from current logic which only shows this when both arrays are empty)
- **Completed tab empty**: Simple "No completed filings yet" message
- **Both empty** (no periods at all): Show "All caught up" on the Outstanding tab

### Component changes

- `FilingsTab` (`src/components/filings-tab.tsx`):
  - Add `"use client"` directive
  - Add `useState` for active sub-tab
  - Extend the local `Filing` interface to include `confirmedAt: Date | null` and `submittedAt: Date | null` (these fields exist on the Prisma model and are already fetched by the parent page query)
  - Render sub-tab bar above content
  - Move incomplete periods into Outstanding tab content
  - Build new Completed tab content with detailed cards
  - Keep disclosure territory warning above the tab bar

Note: RSC wire format supports Date serialisation natively, so Date props from the server component parent will arrive as Date objects in the client component — no conversion needed.

### No other files change

The parent company page already passes `periods` and `filings` as props with all fields — all data needed is available. No API changes, no schema changes, no new components needed.

## Out of scope

- URL persistence for the sub-tab selection
- Filtering or searching within tabs
- Pagination within tabs (unlikely to have enough periods to need it)
- Download/export of filing history
