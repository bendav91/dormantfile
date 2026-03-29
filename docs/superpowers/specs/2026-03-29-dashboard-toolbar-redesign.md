# Dashboard Toolbar Redesign

## Problem

The dashboard filter/sort toolbar is space-inefficient, visually noisy, and has inconsistent styling. Three visual rows (search, 7 filter pills, 5 sort links) consume ~140px of vertical space before any company data is visible. Filters and sort use different visual languages (blue bordered pills vs muted text links), creating a disjointed UI.

## Design

### Filter Categories

Replace 7 filters with 4 intent-based categories:

| Filter              | Matches                      | Replaces          |
| ------------------- | ---------------------------- | ----------------- |
| **All**             | Every company                | All               |
| **Needs Attention** | Overdue + due within 30 days | Overdue, Due Soon |
| **Recently Filed**  | Accepted in last 30 days     | Recently Filed    |
| **Issues**          | Rejected + failed filings    | Rejected, Failed  |

**Rationale:** Current filters mix urgency (Overdue, Due Soon) and filing status (Accepted, Rejected, Failed) — two taxonomies in one row. The new set maps to user intent ("what needs my attention?" vs "what has problems?") and follows Hick's Law by reducing choices from 7 to 4.

**Dropped filter — Accepted:** The standalone `Accepted` filter is removed. Companies with accepted filings are visible via the `Recently Filed` filter (accepted in last 30 days) and always visible under `All`. A dedicated "Accepted" filter adds little value — users don't typically need to browse all historically-accepted companies.

### URL Parameters

- `?filter=` values change: `needs-attention`, `recently-filed`, `issues` (empty = All)
- `?sort=` values unchanged: `most-overdue` (default), `most-outstanding`, `name-asc`, `date-added-newest`, `date-added-oldest`
- `?q=` and `?page=` unchanged

### Layout: Segmented Control + Search Row

Two compact rows replace the current three:

**Row 1 — Segmented filter control:**

- `display: inline-flex` container with `background: var(--color-bg-inset)`, `border-radius: 8px`, `padding: 3px`
- Active tab: `background: var(--color-bg-card)`, `font-weight: 600`, `box-shadow: 0 1px 2px rgba(0,0,0,0.06)`
- Inactive tabs: no background, `color: var(--color-text-secondary)`
- Each tab shows a count badge (see Count Badges below)

**Row 2 — Search + sort dropdown:**

- Search input takes `flex: 1`, same styling as current but shares the row
- Sort control: a custom dropdown button with popover, replacing the 5 inline pills
  - Trigger shows: sort icon (ArrowUpDown) + current sort label + chevron-down
  - `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `border-radius: 8px`
  - `flex-shrink: 0` to prevent compression
  - Popover contains the 5 sort options as a simple list; clicking navigates via URL params (same as current server-side rendering approach)

**Note:** The render order changes from the current layout. Currently search appears above filters; in the new layout, filters (segmented control) appear above the search + sort row. The `CompanySearch` component's wrapper margin will need adjusting.

### Count Badges

Each filter tab displays a count of matching companies:

- **All**: plain grey count (`color: var(--color-text-muted)`)
- **Needs Attention**: red badge when count > 0 (`background: var(--color-danger-bg)`, `color: var(--color-danger)`, pill-shaped). Grey text when 0.
- **Recently Filed**: plain grey count
- **Issues**: red badge when count > 0 (same style as Needs Attention). Grey text when 0.

Counts are computed server-side alongside the existing filter logic. Tabs with 0 count remain visible (no hiding) to keep the bar dimensionally stable.

### Sort Dropdown

Replace 5 inline sort pills with a single dropdown control:

- Trigger displays: sort icon (ArrowUpDown) + current sort label + chevron-down
- Options: Most Overdue, Most Outstanding, A–Z, Newest first, Oldest first
- Implementation: a client-side popover component (not native `<select>`, since the trigger needs custom styling with icon + label + chevron)
- Selecting an option navigates via URL params (same as current behaviour, server-side rendering)

### Mobile (< 640px)

- **Filter labels shorten**: "Needs Attention" → "Attention", "Recently Filed" → "Filed"
- **Segmented control**: `overflow-x: auto` for horizontal scroll if needed, `white-space: nowrap` on tabs
- **Sort dropdown**: collapses to icon-only button (36x36px, just the ArrowUpDown icon). Opens the same popover.
- **Add company button**: icon-only (36x36px, just the Plus icon)
- **Search placeholder**: shortens to "Search..."

### Spacing

- `margin-bottom: 10px` between filter row and search row (down from current 16px + 20px across three rows)
- `margin-bottom: 16px` between search row and company cards grid
- Total toolbar height: ~80px (down from ~140px)

## Files to Change

| File                                | Change                                                                                                                                                     |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(app)/dashboard/page.tsx`  | Replace filter pills + sort pills with segmented control + sort dropdown. Add count computation. Update `FilterType` union. Reorder: filters above search. |
| `src/components/company-search.tsx` | Adjust wrapper margin for new row layout (currently has `marginBottom: 24px`).                                                                             |
| `src/components/sort-dropdown.tsx`  | New client component: sort dropdown trigger + popover.                                                                                                     |
| `src/app/globals.css`               | Remove `.filter-pill` and `.sort-pill` classes. Add `.segmented-control`, `.segmented-tab` classes.                                                        |

## Filter Logic Changes

### Architecture change

All filtering moves to post-fetch JS predicates. The separate `filterIds` Prisma queries for `overdue`, `due-soon`, `recently-filed`, `accepted`, `rejected`, and `failed` are removed. Instead, all companies are fetched once (as currently done for sorting), and each filter predicate is evaluated in JS over the `companiesWithSortData` array. This also enables computing all four counts in the same pass.

### `needs-attention` filter

Combines current `overdue` and `due-soon` logic — matches companies with any incomplete period that is overdue or has a deadline within 30 days:

```js
periods.some((p) => {
  if (p.isComplete) return false;
  if (p.isOverdue) return true;
  const accountsDueSoon =
    !p.accountsFiled &&
    p.accountsDeadline.getTime() >= now &&
    p.accountsDeadline.getTime() <= now + thirtyDaysMs;
  const ct600DueSoon =
    c.registeredForCorpTax &&
    !p.ct600Filed &&
    p.ct600Deadline.getTime() >= now &&
    p.ct600Deadline.getTime() <= now + thirtyDaysMs;
  return accountsDueSoon || ct600DueSoon;
});
```

### `recently-filed` filter

Matches companies with any filing accepted in the last 30 days:

```js
company.filings.some(
  (f) => f.status === "accepted" && f.confirmedAt && f.confirmedAt.getTime() >= now - thirtyDaysMs,
);
```

### `issues` filter

Matches companies that have any filing with rejected or failed status (any period, not just current — matches existing behaviour):

```js
company.filings.some((f) => f.status === "rejected" || f.status === "failed");
```

### Count computation

All four counts are computed in a single pass over the `companiesWithSortData` array. Each company is evaluated against all four filter predicates; the active filter determines the display list, and all counts are accumulated as a side effect. No additional database queries needed.

## Out of Scope

- Company card redesign (separate effort)
- Pagination changes
- Dark mode changes (existing CSS tokens handle this automatically)
