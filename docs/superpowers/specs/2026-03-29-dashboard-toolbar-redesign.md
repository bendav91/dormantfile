# Dashboard Toolbar Redesign

## Problem

The dashboard filter/sort toolbar is space-inefficient, visually noisy, and has inconsistent styling. Three visual rows (search, 7 filter pills, 5 sort links) consume ~140px of vertical space before any company data is visible. Filters and sort use different visual languages (blue bordered pills vs muted text links), creating a disjointed UI.

## Design

### Filter Categories

Replace 7 filters with 4 intent-based categories:

| Filter | Matches | Replaces |
|--------|---------|----------|
| **All** | Every company | All |
| **Needs Attention** | Overdue + due within 30 days | Overdue, Due Soon |
| **Recently Filed** | Accepted in last 30 days | Recently Filed |
| **Issues** | Rejected + failed filings | Accepted, Rejected, Failed |

**Rationale:** Current filters mix urgency (Overdue, Due Soon) and filing status (Accepted, Rejected, Failed) — two taxonomies in one row. The new set maps to user intent ("what needs my attention?" vs "what has problems?") and follows Hick's Law by reducing choices from 7 to 4.

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
- Sort control: a `<select>`-style dropdown (or custom popover) replacing the 5 inline pills
  - Shows sort icon + current sort label + chevron
  - `background: var(--color-bg-card)`, `border: 1px solid var(--color-border)`, `border-radius: 8px`
  - `flex-shrink: 0` to prevent compression

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
- Implementation: either a native `<select>` element or a client-side popover component
- Selecting an option navigates via URL params (same as current behaviour, server-side rendering)

### Mobile (< 640px)

- **Filter labels shorten**: "Needs Attention" → "Attention", "Recently Filed" → "Filed"
- **Segmented control**: `overflow-x: auto` for horizontal scroll if needed, `white-space: nowrap` on tabs
- **Sort dropdown**: collapses to icon-only button (36x36px, just the ArrowUpDown icon). Opens the same dropdown.
- **Add company button**: icon-only (36x36px, just the Plus icon)
- **Search placeholder**: shortens to "Search..."

### Spacing

- `margin-bottom: 10px` between filter row and search row (down from current 16px + 20px across three rows)
- `margin-bottom: 16px` between search row and company cards grid
- Total toolbar height: ~80px (down from ~140px)

## Files to Change

| File | Change |
|------|--------|
| `src/app/(app)/dashboard/page.tsx` | Replace filter pills + sort pills with segmented control + sort dropdown. Add count computation. Update `FilterType` union. |
| `src/components/company-search.tsx` | No structural change — may need minor style tweaks for the shared row layout. |
| `src/app/globals.css` | Remove `.filter-pill` and `.sort-pill` classes. Add `.segmented-control`, `.segmented-tab`, `.sort-dropdown` classes. |

## Filter Logic Changes

### `needs-attention` filter
Combines current `overdue` and `due-soon` logic:
```
periods.some(p => !p.isComplete && (p.isOverdue || accountsDueSoon || ct600DueSoon))
```

### `issues` filter
Combines current `rejected` and `failed`:
```
filings.where({ status: { in: ['rejected', 'failed'] } })
```

### Count computation
All four counts are computed in a single pass over companies (before pagination), reusing the existing `companiesWithSortData` array. No additional database queries needed — the data is already fetched.

## Out of Scope

- Company card redesign (separate effort)
- Pagination changes
- Dark mode changes (existing CSS tokens handle this automatically)
- Sort dropdown popover animation (native `<select>` is fine for v1)
