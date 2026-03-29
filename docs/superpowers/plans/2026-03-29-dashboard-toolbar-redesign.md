# Dashboard Toolbar Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dashboard's 7 filter pills + 5 sort links with a compact segmented control (4 filters with counts) + search row with sort dropdown, cutting toolbar height from ~140px to ~80px.

**Architecture:** All filtering moves from separate Prisma queries to post-fetch JS predicates over the already-fetched companies array. Filter counts are computed in a single pass. Sort moves from inline pills to a client-side dropdown popover. The segmented control is server-rendered; the sort dropdown is a new client component.

**Tech Stack:** Next.js App Router (server component), React 19 client components, CSS custom properties, Vitest.

**Spec:** `docs/superpowers/specs/2026-03-29-dashboard-toolbar-redesign.md`

---

### Task 1: Extract and test filter predicates

**Files:**
- Create: `src/lib/dashboard-filters.ts`
- Create: `src/__tests__/lib/dashboard-filters.test.ts`

These pure functions are the core logic and can be tested in isolation before touching any UI.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/lib/dashboard-filters.test.ts
import { describe, it, expect, vi } from "vitest";
import {
  matchesNeedsAttention,
  matchesRecentlyFiled,
  matchesIssues,
  computeFilterCounts,
} from "@/lib/dashboard-filters";
import type { PeriodInfo } from "@/lib/periods";

// Helper to build a minimal filing object
function filing(overrides: Record<string, unknown> = {}) {
  return {
    status: "pending" as string,
    confirmedAt: null as Date | null,
    filingType: "accounts" as string,
    periodStart: new Date("2024-04-01"),
    periodEnd: new Date("2025-03-31"),
    ...overrides,
  };
}

// Helper to build a minimal period
function period(overrides: Partial<PeriodInfo> = {}): PeriodInfo {
  return {
    periodStart: new Date("2024-04-01"),
    periodEnd: new Date("2025-03-31"),
    accountsDeadline: new Date("2026-01-01"),
    ct600Deadline: new Date("2026-03-31"),
    accountsFiled: false,
    ct600Filed: false,
    isComplete: false,
    isOverdue: false,
    hasEarlierGaps: false,
    isDisclosureTerritory: false,
    isBlockedTerritory: false,
    ...overrides,
  };
}

describe("matchesNeedsAttention", () => {
  it("returns true when a period is overdue", () => {
    const periods = [period({ isOverdue: true })];
    expect(matchesNeedsAttention(periods, false)).toBe(true);
  });

  it("returns true when accounts deadline is within 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-10"));
    const periods = [period({ accountsDeadline: new Date("2026-01-20") })];
    expect(matchesNeedsAttention(periods, false)).toBe(true);
    vi.useRealTimers();
  });

  it("returns true when ct600 deadline is within 30 days for corp tax company", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15"));
    const periods = [period({ ct600Deadline: new Date("2026-03-31") })];
    expect(matchesNeedsAttention(periods, true)).toBe(true);
    vi.useRealTimers();
  });

  it("returns false when ct600 is due soon but company not registered for corp tax", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15"));
    const periods = [period({ ct600Deadline: new Date("2026-03-31"), accountsDeadline: new Date("2027-01-01") })];
    expect(matchesNeedsAttention(periods, false)).toBe(false);
    vi.useRealTimers();
  });

  it("returns false when all periods are complete", () => {
    const periods = [period({ isComplete: true, isOverdue: true })];
    expect(matchesNeedsAttention(periods, false)).toBe(false);
  });

  it("returns false when no deadlines are near", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01"));
    const periods = [period({ accountsDeadline: new Date("2026-01-01"), ct600Deadline: new Date("2026-03-31") })];
    expect(matchesNeedsAttention(periods, false)).toBe(false);
    vi.useRealTimers();
  });
});

describe("matchesRecentlyFiled", () => {
  it("returns true when a filing was accepted within 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));
    const filings = [filing({ status: "accepted", confirmedAt: new Date("2026-03-15") })];
    expect(matchesRecentlyFiled(filings)).toBe(true);
    vi.useRealTimers();
  });

  it("returns false when accepted filing is older than 30 days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));
    const filings = [filing({ status: "accepted", confirmedAt: new Date("2026-01-01") })];
    expect(matchesRecentlyFiled(filings)).toBe(false);
    vi.useRealTimers();
  });

  it("returns false when filing is not accepted", () => {
    const filings = [filing({ status: "submitted", confirmedAt: new Date() })];
    expect(matchesRecentlyFiled(filings)).toBe(false);
  });
});

describe("matchesIssues", () => {
  it("returns true when a filing is rejected", () => {
    expect(matchesIssues([filing({ status: "rejected" })])).toBe(true);
  });

  it("returns true when a filing is failed", () => {
    expect(matchesIssues([filing({ status: "failed" })])).toBe(true);
  });

  it("returns false when all filings are accepted", () => {
    expect(matchesIssues([filing({ status: "accepted" })])).toBe(false);
  });

  it("returns false with no filings", () => {
    expect(matchesIssues([])).toBe(false);
  });
});

describe("computeFilterCounts", () => {
  it("counts companies matching each filter", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-29"));

    const companies = [
      {
        periods: [period({ isOverdue: true })],
        registeredForCorpTax: false,
        filings: [filing({ status: "accepted", confirmedAt: new Date("2026-03-15") })],
      },
      {
        periods: [period({ isComplete: true })],
        registeredForCorpTax: false,
        filings: [filing({ status: "rejected" })],
      },
      {
        periods: [period()],
        registeredForCorpTax: false,
        filings: [],
      },
    ];

    const counts = computeFilterCounts(companies);
    expect(counts.all).toBe(3);
    expect(counts.needsAttention).toBe(1);
    expect(counts.recentlyFiled).toBe(1);
    expect(counts.issues).toBe(1);

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/lib/dashboard-filters.test.ts`
Expected: FAIL — module `@/lib/dashboard-filters` does not exist.

- [ ] **Step 3: Implement the filter predicates**

```ts
// src/lib/dashboard-filters.ts
import type { PeriodInfo } from "@/lib/periods";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

interface FilingLike {
  status: string;
  confirmedAt: Date | null;
}

interface CompanyForCounts {
  periods: PeriodInfo[];
  registeredForCorpTax: boolean;
  filings: FilingLike[];
}

export interface FilterCounts {
  all: number;
  needsAttention: number;
  recentlyFiled: number;
  issues: number;
}

export type FilterType = "needs-attention" | "recently-filed" | "issues" | "";

export function matchesNeedsAttention(periods: PeriodInfo[], registeredForCorpTax: boolean): boolean {
  const now = Date.now();
  return periods.some((p) => {
    if (p.isComplete) return false;
    if (p.isOverdue) return true;
    const accountsDueSoon =
      !p.accountsFiled &&
      p.accountsDeadline.getTime() >= now &&
      p.accountsDeadline.getTime() <= now + THIRTY_DAYS_MS;
    const ct600DueSoon =
      registeredForCorpTax &&
      !p.ct600Filed &&
      p.ct600Deadline.getTime() >= now &&
      p.ct600Deadline.getTime() <= now + THIRTY_DAYS_MS;
    return accountsDueSoon || ct600DueSoon;
  });
}

export function matchesRecentlyFiled(filings: FilingLike[]): boolean {
  const cutoff = Date.now() - THIRTY_DAYS_MS;
  return filings.some(
    (f) => f.status === "accepted" && f.confirmedAt && f.confirmedAt.getTime() >= cutoff,
  );
}

export function matchesIssues(filings: FilingLike[]): boolean {
  return filings.some((f) => f.status === "rejected" || f.status === "failed");
}

export function computeFilterCounts(companies: CompanyForCounts[]): FilterCounts {
  const counts: FilterCounts = { all: 0, needsAttention: 0, recentlyFiled: 0, issues: 0 };
  for (const c of companies) {
    counts.all++;
    if (matchesNeedsAttention(c.periods, c.registeredForCorpTax)) counts.needsAttention++;
    if (matchesRecentlyFiled(c.filings)) counts.recentlyFiled++;
    if (matchesIssues(c.filings)) counts.issues++;
  }
  return counts;
}

export function matchesFilter(
  filter: FilterType,
  periods: PeriodInfo[],
  registeredForCorpTax: boolean,
  filings: FilingLike[],
): boolean {
  switch (filter) {
    case "needs-attention":
      return matchesNeedsAttention(periods, registeredForCorpTax);
    case "recently-filed":
      return matchesRecentlyFiled(filings);
    case "issues":
      return matchesIssues(filings);
    case "":
      return true;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/lib/dashboard-filters.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dashboard-filters.ts src/__tests__/lib/dashboard-filters.test.ts
git commit -m "feat: add dashboard filter predicates and counts"
```

---

### Task 2: Create the sort dropdown component

**Files:**
- Create: `src/components/sort-dropdown.tsx`

A client component that renders a dropdown trigger + popover for sort options. Navigates via URL params on selection.

- [ ] **Step 1: Create the sort dropdown component**

```tsx
// src/components/sort-dropdown.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, ChevronDown } from "lucide-react";

const SORT_OPTIONS = [
  { key: "most-overdue", label: "Most Overdue" },
  { key: "most-outstanding", label: "Most Outstanding" },
  { key: "name-asc", label: "A\u2013Z" },
  { key: "date-added-newest", label: "Newest first" },
  { key: "date-added-oldest", label: "Oldest first" },
] as const;

export type SortType = (typeof SORT_OPTIONS)[number]["key"];

export default function SortDropdown({ currentSort }: { currentSort: SortType }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentLabel = SORT_OPTIONS.find((s) => s.key === currentSort)?.label ?? "Most Overdue";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSelect(key: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (key === "most-overdue") {
      params.delete("sort");
    } else {
      params.set("sort", key);
    }
    params.delete("page");
    router.push(`/dashboard${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        className="focus-ring"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "5px",
          background: "var(--color-bg-card)",
          border: "1px solid var(--color-border)",
          borderRadius: "8px",
          padding: "7px 12px",
          fontSize: "12px",
          fontWeight: 500,
          color: "var(--color-text-body)",
          cursor: "pointer",
          transition: "border-color 200ms",
        }}
      >
        <ArrowUpDown size={12} strokeWidth={2} style={{ color: "var(--color-text-muted)" }} />
        <span className="sort-dropdown-label">{currentLabel}</span>
        <ChevronDown size={10} strokeWidth={2.5} style={{ color: "var(--color-text-muted)" }} />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Sort options"
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 4px)",
            background: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            padding: "4px",
            zIndex: 50,
            minWidth: "160px",
          }}
        >
          {SORT_OPTIONS.map((s) => (
            <button
              key={s.key}
              role="option"
              aria-selected={currentSort === s.key}
              onClick={() => handleSelect(s.key)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "12px",
                fontWeight: currentSort === s.key ? 600 : 400,
                color: currentSort === s.key ? "var(--color-text-primary)" : "var(--color-text-body)",
                background: currentSort === s.key ? "var(--color-bg-inset)" : "transparent",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "background-color 150ms",
              }}
              onMouseEnter={(e) => {
                if (currentSort !== s.key) e.currentTarget.style.backgroundColor = "var(--color-bg-inset)";
              }}
              onMouseLeave={(e) => {
                if (currentSort !== s.key) e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/sort-dropdown.tsx
git commit -m "feat: add sort dropdown component"
```

---

### Task 3: Update globals.css — remove old classes, add segmented control

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Remove old filter/sort pill classes and add segmented control styles**

Remove these lines from `globals.css`:
```css
/* Dashboard filter/sort active pill hover states */
.filter-pill.active:hover {
  background-color: var(--color-primary-hover) !important;
}
.sort-pill.active:hover {
  background-color: var(--color-text-body) !important;
}
```

Add these new classes:
```css
/* Segmented filter control */
.segmented-tab:hover {
  background-color: color-mix(in srgb, var(--color-bg-card) 50%, transparent);
}
.segmented-tab[aria-selected="true"]:hover {
  background-color: var(--color-bg-card);
}

/* Sort dropdown: hide label text on mobile */
@media (max-width: 639px) {
  .sort-dropdown-label {
    display: none;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/globals.css
git commit -m "refactor: replace filter/sort pill CSS with segmented control styles"
```

---

### Task 4: Update CompanySearch margin

**Files:**
- Modify: `src/components/company-search.tsx`

The search component moves below the segmented control and shares a row with the sort dropdown. Its wrapper margin needs to change.

- [ ] **Step 1: Change the wrapper margin**

In `src/components/company-search.tsx`, change the wrapper div style from:
```tsx
<div style={{ position: "relative", marginBottom: "24px" }}>
```
to:
```tsx
<div style={{ position: "relative", flex: 1 }}>
```

The parent in `page.tsx` will handle margin and layout (flexbox row with the sort dropdown).

- [ ] **Step 2: Commit**

```bash
git add src/components/company-search.tsx
git commit -m "refactor: adjust CompanySearch for flex row layout"
```

---

### Task 5: Rewrite dashboard page toolbar

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

This is the main change — replace the filter pills, sort pills, and filtering logic with the new segmented control, sort dropdown, and JS-predicate filtering.

- [ ] **Step 1: Update imports**

At the top of `src/app/(app)/dashboard/page.tsx`, replace the `ArrowUpDown` import from lucide-react (it moves to the sort dropdown component). Add the new imports:

```tsx
// Remove ArrowUpDown from the lucide-react import line
import { Building2, Plus, AlertTriangle, ChevronRight } from "lucide-react";

// Add new imports
import SortDropdown, { type SortType } from "@/components/sort-dropdown";
import {
  type FilterType,
  type FilterCounts,
  matchesFilter,
  computeFilterCounts,
} from "@/lib/dashboard-filters";
```

- [ ] **Step 2: Update the type definitions and constants**

Remove the old `FilterType`, `SortType`, and `SORT_OPTIONS` definitions (lines 27-36 of the current file). They now come from imports.

- [ ] **Step 3: Update the filter/sort parameter validation**

Replace the current filter validation (lines 73-76) with:

```tsx
const validFilters: FilterType[] = ["needs-attention", "recently-filed", "issues"];
const filter: FilterType = validFilters.includes(filterParam as FilterType)
  ? (filterParam as FilterType)
  : "";
const validSorts: SortType[] = ["most-overdue", "most-outstanding", "name-asc", "date-added-newest", "date-added-oldest"];
const sort: SortType = validSorts.includes(sortParam as SortType) ? (sortParam as SortType) : "most-overdue";
```

- [ ] **Step 4: Remove the old filterIds Prisma queries**

Remove the entire block from `let filterIds: string[] | null = null;` through the closing brace of the last `else if` (lines 79-123). Also remove `filterIds` from `baseWhere` (remove the `...(filterIds !== null ? { id: { in: filterIds } } : {})` line).

- [ ] **Step 5: Add filter counts computation and JS-predicate filtering**

After the `companiesWithSortData` sort block (after line 179), add:

```tsx
// Compute filter counts over the search-filtered set (counts reflect what the user sees)
const filterCounts: FilterCounts = computeFilterCounts(
  companiesWithSortData.map((c) => ({
    periods: c.periods,
    registeredForCorpTax: c.company.registeredForCorpTax,
    filings: c.company.filings,
  })),
);

// Apply active filter as JS predicate
const filteredCompanies = filter
  ? companiesWithSortData.filter((c) =>
      matchesFilter(filter, c.periods, c.company.registeredForCorpTax, c.company.filings),
    )
  : companiesWithSortData;
```

Then update the pagination to use `filteredCompanies` instead of `companiesWithSortData`:

```tsx
const totalCompanies = filteredCompanies.length;
const totalPages = Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));
const currentPage = Math.max(1, Math.min(totalPages, parseInt(pageParam ?? "1", 10) || 1));
const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
```

- [ ] **Step 6: Replace the toolbar JSX**

Replace the entire toolbar block — from the `{(allCompanyCount > 1 || search || filter) && (` comment (line 280) through its closing `</>` and `)}` — with the new segmented control + search row:

```tsx
{/* Filters, search, and sort — show when there are 2+ companies, or when a search/filter is active */}
{(allCompanyCount > 1 || search || filter) && (
  <>
    {/* Segmented filter control */}
    <div
      style={{
        display: "inline-flex",
        backgroundColor: "var(--color-bg-inset)",
        borderRadius: "8px",
        padding: "3px",
        marginBottom: "10px",
      }}
    >
      {([
        { key: "" as FilterType, label: "All", mobileLabel: "All", count: filterCounts.all, urgent: false },
        { key: "needs-attention" as FilterType, label: "Needs Attention", mobileLabel: "Attention", count: filterCounts.needsAttention, urgent: true },
        { key: "recently-filed" as FilterType, label: "Recently Filed", mobileLabel: "Filed", count: filterCounts.recentlyFiled, urgent: false },
        { key: "issues" as FilterType, label: "Issues", mobileLabel: "Issues", count: filterCounts.issues, urgent: true },
      ]).map((f) => {
        const isActive = filter === f.key;
        const params = new URLSearchParams();
        if (f.key) params.set("filter", f.key);
        if (search) params.set("q", search);
        if (sort !== "most-overdue") params.set("sort", sort);
        const href = `/dashboard${params.toString() ? `?${params}` : ""}`;
        const showUrgentBadge = f.urgent && f.count > 0;
        return (
          <Link
            key={f.key}
            href={href}
            role="tab"
            aria-selected={isActive}
            className="focus-ring segmented-tab"
            style={{
              padding: "6px 14px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: isActive ? 600 : 500,
              textDecoration: "none",
              whiteSpace: "nowrap",
              transition: "background-color 150ms, box-shadow 150ms",
              backgroundColor: isActive ? "var(--color-bg-card)" : "transparent",
              color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
            }}
          >
            <span className="segmented-tab-label-full">{f.label}</span>
            {" "}
            {showUrgentBadge ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "var(--color-danger-bg)",
                  color: "var(--color-danger)",
                  padding: "1px 6px",
                  borderRadius: "9999px",
                  fontSize: "10px",
                  fontWeight: 600,
                  minWidth: "18px",
                }}
              >
                {f.count}
              </span>
            ) : (
              <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>{f.count}</span>
            )}
          </Link>
        );
      })}
    </div>

    {/* Search + sort row */}
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
      <CompanySearch />
      <SortDropdown currentSort={sort} />
    </div>
  </>
)}
```

- [ ] **Step 7: Run the dev server and verify visually**

Run: `npm run dev`

Check the dashboard at `http://localhost:3000/dashboard`:
- Segmented control shows 4 tabs with counts
- Search + sort dropdown on the row below
- Clicking filter tabs navigates and filters correctly
- Sort dropdown opens, selects, and navigates
- Counts update when filter is active

- [ ] **Step 8: Run lint**

Run: `npm run lint`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/(app)/dashboard/page.tsx
git commit -m "feat: replace dashboard toolbar with segmented control and sort dropdown"
```

---

### Task 6: Mobile responsive styles

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/(app)/dashboard/page.tsx`
- Modify: `src/components/company-search.tsx`

All mobile responsive changes are consolidated in this task.

- [ ] **Step 1: Add all mobile CSS**

Add to `globals.css`:

```css
/* Mobile: shorten segmented tab labels */
@media (max-width: 639px) {
  .segmented-tab-label-full {
    display: none;
  }
  .segmented-tab-label-short {
    display: inline;
  }
  .add-company-label {
    display: none;
  }
}
@media (min-width: 640px) {
  .segmented-tab-label-short {
    display: none;
  }
}
```

- [ ] **Step 2: Update the segmented tab JSX to include both label variants**

In `src/app/(app)/dashboard/page.tsx`, replace the label span inside the segmented tab `Link` with:

```tsx
<span className="segmented-tab-label-full">{f.label}</span>
<span className="segmented-tab-label-short">{f.mobileLabel}</span>
```

(Remove the existing single `<span className="segmented-tab-label-full">` line.)

- [ ] **Step 3: Add overflow-x to segmented control container**

In `src/app/(app)/dashboard/page.tsx`, add `overflowX: "auto"` to the segmented control wrapper div's style:

```tsx
<div
  style={{
    display: "inline-flex",
    backgroundColor: "var(--color-bg-inset)",
    borderRadius: "8px",
    padding: "3px",
    marginBottom: "10px",
    overflowX: "auto",
  }}
>
```

- [ ] **Step 4: Make the Add company button responsive**

In `src/app/(app)/dashboard/page.tsx`, update the "Add company" `Link` to hide the label text on mobile:

```tsx
<Link
  href="/onboarding"
  style={{
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--color-primary)",
    color: "var(--color-bg-card)",
    padding: "10px 20px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "14px",
    textDecoration: "none",
    transition: "opacity 200ms, background-color 200ms",
    flexShrink: 0,
  }}
>
  <Plus size={16} strokeWidth={2.5} />
  <span className="add-company-label">Add company</span>
</Link>
```

- [ ] **Step 5: Make the search placeholder responsive**

In `src/components/company-search.tsx`, update the placeholder to use a shorter value on mobile. Since the placeholder is a static prop, use a CSS approach — add a `data-placeholder-short` attribute and swap via media query, or simply use the shorter placeholder "Search..." since the `aria-label` provides the full context for screen readers:

Change the `placeholder` prop to `"Search..."` and update the `aria-label` to retain the full description:

```tsx
placeholder="Search\u2026"
aria-label="Search by company name or number"
```

- [ ] **Step 6: Verify on narrow viewport**

Open Chrome DevTools, toggle device toolbar to 375px width. Verify:
- Tab labels shorten ("Attention", "Filed")
- Sort dropdown shows icon only (label hidden via `.sort-dropdown-label` class added in Task 3)
- Add company button shows icon only
- Search placeholder shows "Search..."
- Segmented control scrolls horizontally if needed

- [ ] **Step 7: Commit**

```bash
git add src/app/globals.css src/app/(app)/dashboard/page.tsx src/components/company-search.tsx
git commit -m "feat: add mobile responsive styles for dashboard toolbar"
```

---

### Task 7: Final cleanup and verification

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx` (cleanup only)

- [ ] **Step 1: Remove any unused imports**

Check `page.tsx` for unused imports — `ArrowUpDown` should already be removed. Verify no dead code from the old filter/sort system remains.

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: All tests pass, including the new `dashboard-filters.test.ts`.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Commit any cleanup**

```bash
git add -A
git commit -m "chore: clean up unused imports after toolbar redesign"
```

(Skip if no changes.)
