# Company Detail Page Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a tabbed company detail page (`/company/[companyId]`) with Filings, Settings, and Overview tabs, migrating the existing filing selector into it and adding corp tax removal, share capital editing, and CH company info display.

**Architecture:** New `/company/[companyId]` server component page with tab routing via `?tab=` search param. Filings tab extracts the existing filing selector into a component. Settings tab is a client component with inline editing. Overview tab fetches CH API data server-side. The existing `/file/[companyId]` becomes a redirect. API route restructured for corp tax removal.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma, Companies House REST API, Tailwind/CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-29-company-page-design.md`

---

### Task 1: Restructure the company update API route

Add corp tax removal (Case 1) and share capital editing (Case 0) to the existing PATCH route. This must be done first as the Settings tab depends on it.

**Files:**
- Modify: `src/app/api/company/update/route.ts`

- [ ] **Step 1: Read the current route**

Read `src/app/api/company/update/route.ts` to understand the existing case structure.

- [ ] **Step 2: Restructure the route handler**

Replace the entire handler body after the company fetch (from line 37 onward) with the new case structure. The key change is checking for disable intent (`registeredForCorpTax === false` with strict equality) BEFORE the existing UTR-required guard.

New logic after the `if (!company)` check:

```typescript
  // Case 0: Share capital update (can combine with other cases)
  if (typeof shareCapital === "number" && shareCapital >= 0) {
    await prisma.company.update({
      where: { id: companyId },
      data: { shareCapital: Math.round(shareCapital) },
    });
  }

  // Case 1: Disable Corp Tax (strict equality — must be explicitly false, not just absent)
  if (registeredForCorpTax === false && company.registeredForCorpTax) {
    await prisma.$transaction([
      prisma.company.update({
        where: { id: companyId },
        data: { registeredForCorpTax: false, uniqueTaxReference: null },
      }),
      prisma.reminder.deleteMany({
        where: { companyId, filingType: "ct600" },
      }),
    ]);
    return NextResponse.json({ success: true });
  }

  // Case 2: Corp Tax already enabled — allow UTR update only
  if (company.registeredForCorpTax) {
    if (!uniqueTaxReference) {
      // If no UTR and no share capital update, nothing to do
      if (typeof shareCapital !== "number") {
        return NextResponse.json({ error: "No changes to apply" }, { status: 400 });
      }
      return NextResponse.json({ success: true });
    }
    if (!validateUTR(uniqueTaxReference)) {
      return NextResponse.json({ error: "UTR must be exactly 10 digits" }, { status: 400 });
    }
    await prisma.company.update({
      where: { id: companyId },
      data: { uniqueTaxReference },
    });
    return NextResponse.json({ success: true });
  }

  // Case 3: Enabling Corp Tax for the first time
  if (!registeredForCorpTax) {
    // If only a share capital update was done, return success
    if (typeof shareCapital === "number") {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "No changes to apply" }, { status: 400 });
  }

  // ... existing enable logic (unchanged) ...
```

Also add `shareCapital` to the destructured body: `const { companyId, registeredForCorpTax, uniqueTaxReference, shareCapital } = body;`

Move the UTR validation (`if (uniqueTaxReference && !validateUTR(...)`) to Case 2 and Case 3 only (not top-level), so it doesn't block disable requests.

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: All PASS

- [ ] **Step 4: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/app/api/company/update/route.ts
git commit -m "feat: restructure company update API — add corp tax removal and share capital editing"
```

---

### Task 2: Extract filing selector into a component

Move the filing selector content from the page into a standalone component that can be embedded in the Filings tab.

**Files:**
- Create: `src/components/filings-tab.tsx`
- Modify: `src/app/(app)/file/[companyId]/page.tsx` (temporary — will become redirect in Task 4)

- [ ] **Step 1: Create `src/components/filings-tab.tsx`**

Extract the JSX from the current `/file/[companyId]/page.tsx` — everything BELOW the company header and back link (from the disclosure territory warning through the "all caught up" section). This is roughly lines 138-404 of the current file.

The component receives props:

```typescript
import { type PeriodInfo } from "@/lib/periods";
import { type FilingStatus } from "@prisma/client";

interface Filing {
  id: string;
  filingType: string;
  periodStart: Date;
  periodEnd: Date;
  status: FilingStatus;
}

interface FilingsTabProps {
  companyId: string;
  registeredForCorpTax: boolean;
  periods: PeriodInfo[];
  filings: Filing[];
}
```

Move the `formatDate`, `formatShortDate` helper functions, the `BLOCKED_STATUSES` constant, and the `getFilingForPeriod` logic into this component.

Import `Link` from `next/link`, `AlertTriangle`, `Calendar`, `CheckCircle2` from `lucide-react`, and `FilingStatusBadge` from `@/components/filing-status-badge`.

The `filingBtnStyle` constant also moves into this component.

- [ ] **Step 2: Update the current filing selector page to use the component**

In `src/app/(app)/file/[companyId]/page.tsx`, replace the extracted JSX with:

```tsx
<FilingsTab
  companyId={companyId}
  registeredForCorpTax={company.registeredForCorpTax}
  periods={periods}
  filings={company.filings}
/>
```

Keep the company header and back link in the page for now (they'll be removed when the page becomes a redirect in Task 4).

- [ ] **Step 3: Verify the page still works**

Run: `npm run build`
Expected: Build succeeds. Manually verify the filing selector page looks the same.

- [ ] **Step 4: Commit**

```bash
git add src/components/filings-tab.tsx "src/app/(app)/file/[companyId]/page.tsx"
git commit -m "refactor: extract filing selector into FilingsTab component"
```

---

### Task 3: Create the company page with tab layout and Filings tab

Build the new `/company/[companyId]` page with the tab bar and the Filings tab working.

**Files:**
- Create: `src/app/(app)/company/[companyId]/page.tsx`

- [ ] **Step 1: Create the page**

Server component. Fetches company with filings from DB, computes periods, renders the tab layout.

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { getOutstandingPeriods } from "@/lib/periods";
import FilingsTab from "@/components/filings-tab";

interface PageProps {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ tab?: string }>;
}
```

Page layout:
1. Back link to `/dashboard`
2. Company header (icon, name, CRN, outstanding count) — same markup as current filing selector page lines 78-136
3. Tab bar — three `<Link>` elements: `?tab=filings` (or no param), `?tab=settings`, `?tab=overview`. Current tab gets a bottom border highlight.
4. Tab content — for now, only render `<FilingsTab>` (settings and overview come in later tasks)

The tab bar links use `href={`/company/${companyId}?tab=X`}`. The active tab is determined by `searchParams.tab` (default: `"filings"`). Invalid values default to `"filings"`.

For Settings and Overview tabs, render a placeholder: `<p>Coming soon</p>`

- [ ] **Step 2: Verify the page works**

Run: `npm run build`
Expected: Build succeeds. Navigate to `/company/[id]` and verify tabs render with Filings tab showing the period list.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/company/[companyId]/page.tsx"
git commit -m "feat: company detail page with tab layout and Filings tab"
```

---

### Task 4: Redirect old filing selector and update all links

Replace the old filing selector page with a redirect and update all links pointing to it.

**Files:**
- Modify: `src/app/(app)/file/[companyId]/page.tsx` — replace with redirect
- Modify: `src/app/(app)/dashboard/page.tsx` — update `fileHref` and outstanding badge link
- Modify: `src/app/(app)/file/[companyId]/accounts/page.tsx` — update breadcrumb and redirect targets
- Modify: `src/app/(app)/file/[companyId]/ct600/page.tsx` — update breadcrumb and redirect targets

- [ ] **Step 1: Replace filing selector with redirect**

Replace the entire content of `src/app/(app)/file/[companyId]/page.tsx` with:

```typescript
import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function FilingSelectorRedirect({ params }: PageProps) {
  const { companyId } = await params;
  redirect(`/company/${companyId}`);
}
```

- [ ] **Step 2: Update dashboard links**

In `src/app/(app)/dashboard/page.tsx`:

Change `fileHref` (line 371):
```typescript
// Before:
const fileHref = `/file/${company.id}`;
// After:
const fileHref = `/company/${company.id}`;
```

This updates the outstanding badge link (line 440), the multi-period action link (line 557), and the "Retry" links for multi-period companies (lines 498, 543). The direct filing links (`/file/${company.id}/accounts`, `/file/${company.id}/ct600`) stay unchanged.

- [ ] **Step 3: Update accounts filing flow page**

In `src/app/(app)/file/[companyId]/accounts/page.tsx`:

Line 39 — redirect on invalid periodEnd:
```typescript
// Before:
if (isNaN(periodEnd.getTime())) redirect(`/file/${companyId}`);
// After:
if (isNaN(periodEnd.getTime())) redirect(`/company/${companyId}`);
```

Line 66 — breadcrumb link:
```typescript
// Before:
<Link href={`/file/${companyId}`} ...>{company.companyName}</Link>
// After:
<Link href={`/company/${companyId}`} ...>{company.companyName}</Link>
```

- [ ] **Step 4: Update CT600 filing flow page**

In `src/app/(app)/file/[companyId]/ct600/page.tsx`:

Line 32 — redirect when not registered for corp tax:
```typescript
// Before:
if (!company.registeredForCorpTax) redirect(`/file/${companyId}`);
// After:
if (!company.registeredForCorpTax) redirect(`/company/${companyId}`);
```

Line 40 — redirect on invalid periodEnd:
```typescript
// Before:
if (isNaN(periodEnd.getTime())) redirect(`/file/${companyId}`);
// After:
if (isNaN(periodEnd.getTime())) redirect(`/company/${companyId}`);
```

Line 66 — breadcrumb link:
```typescript
// Before:
<Link href={`/file/${companyId}`} ...>{company.companyName}</Link>
// After:
<Link href={`/company/${companyId}`} ...>{company.companyName}</Link>
```

- [ ] **Step 5: Run build and tests**

Run: `npm run build && npm test`
Expected: Both succeed

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/file/[companyId]/page.tsx" "src/app/(app)/dashboard/page.tsx" "src/app/(app)/file/[companyId]/accounts/page.tsx" "src/app/(app)/file/[companyId]/ct600/page.tsx"
git commit -m "feat: redirect /file/[id] to /company/[id] and update all links"
```

---

### Task 5: Settings tab — corp tax toggle and share capital

Build the Settings tab client component with corp tax enable/disable, UTR editing, share capital editing, and company deletion.

**Files:**
- Create: `src/components/settings-tab.tsx`
- Modify: `src/app/(app)/company/[companyId]/page.tsx` — wire up Settings tab

- [ ] **Step 1: Create `src/components/settings-tab.tsx`**

Client component (`"use client"`). Props:

```typescript
interface SettingsTabProps {
  companyId: string;
  registeredForCorpTax: boolean;
  uniqueTaxReference: string | null;
  shareCapital: number; // in pence
  activeCT600Count: number; // count of CT600 filings with status submitted/pending/polling_timeout
}
```

The component manages local state for:
- `showEnableForm` — toggle for the UTR input when enabling
- `editingUTR` — toggle for inline UTR editing
- `editingShareCapital` — toggle for inline share capital editing
- `showRemoveConfirm` — toggle for the corp tax removal confirmation dialog
- `showDeleteConfirm` — toggle for the company deletion confirmation dialog

**Corporation Tax section:**

When `!registeredForCorpTax`:
- Row: "Corporation Tax" label, "Not enabled" value, "Enable CT600" button
- On click: expand inline UTR input with Save/Cancel (same API call pattern as `EnableCorpTax`: `PATCH /api/company/update` with `{ companyId, registeredForCorpTax: true, uniqueTaxReference }`)

When `registeredForCorpTax`:
- Row: "Corporation Tax" label, UTR value, "Edit" and "Remove" buttons
- Edit: inline input for UTR (same API call as `EditUTR`)
- Remove: shows confirmation dialog
  - If `activeCT600Count > 0`: warning message about in-progress filings
  - If `activeCT600Count === 0`: simpler message
  - Confirm: `PATCH /api/company/update` with `{ companyId, registeredForCorpTax: false }`
  - On success: `router.refresh()`

**Share Capital section:**
- Row: "Share Capital" label, value formatted as GBP (e.g. `£${(shareCapital / 100).toFixed(2)}`), "Edit" button
- Edit: inline input (in pounds, converted to pence on save)
- Save: `PATCH /api/company/update` with `{ companyId, shareCapital: Math.round(pounds * 100) }`

**Delete Company section:**
- Visually separated with danger styling
- "Remove company" button
- Confirmation dialog: "This will remove [company name] from your account. Your filing history will be preserved."
- Confirm: `DELETE` or existing soft-delete mechanism (check how the global settings page does it)
- On success: `router.push("/dashboard")`

Style all rows consistently: flex row with label on left, value + actions on right. Use `var(--color-*)` tokens throughout.

- [ ] **Step 2: Wire up the Settings tab in the company page**

In `src/app/(app)/company/[companyId]/page.tsx`:

Import `SettingsTab` and compute the `activeCT600Count`:

```typescript
const activeCT600Count = company.filings.filter(
  (f) => f.filingType === "ct600" && ["submitted", "pending", "polling_timeout"].includes(f.status)
).length;
```

Replace the Settings tab placeholder with:

```tsx
<SettingsTab
  companyId={companyId}
  registeredForCorpTax={company.registeredForCorpTax}
  uniqueTaxReference={company.uniqueTaxReference}
  shareCapital={company.shareCapital}
  activeCT600Count={activeCT600Count}
/>
```

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/settings-tab.tsx "src/app/(app)/company/[companyId]/page.tsx"
git commit -m "feat: Settings tab with corp tax toggle, share capital editing, and company deletion"
```

---

### Task 6: Overview tab — CH company info

Build the Overview tab that displays read-only company information from the CH API.

**Files:**
- Create: `src/components/overview-tab.tsx`
- Modify: `src/app/(app)/company/[companyId]/page.tsx` — wire up Overview tab

- [ ] **Step 1: Create `src/components/overview-tab.tsx`**

Server component (no `"use client"`). Props:

```typescript
interface OverviewTabProps {
  companyNumber: string;
}
```

The component fetches CH data directly:

```typescript
async function fetchCompanyProfile(companyNumber: string) {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) return null;

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  try {
    const res = await fetch(
      `${endpoint}/company/${encodeURIComponent(companyNumber)}`,
      { headers: { Authorization: `Basic ${basicAuth}` }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function fetchRecentFilings(companyNumber: string) {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) return null;

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  try {
    const res = await fetch(
      `${endpoint}/company/${encodeURIComponent(companyNumber)}/filing-history?items_per_page=5`,
      { headers: { Authorization: `Basic ${basicAuth}` }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}
```

Fetch both in parallel with `Promise.allSettled`. Render three sections:

**Company Details:** name, number, status, incorporation date, address (from `registered_office_address`), SIC codes (`sic_codes` array), company type (`type`).

**Accounts Status:** last accounts (`accounts.last_accounts.made_up_to`), next accounts due (`accounts.next_accounts.due_on`, with "Overdue" badge if `accounts.next_accounts.overdue`), ARD (`accounts.accounting_reference_date`).

**Recent Filings:** table/list of last 5 items from filing history — description, date, action_date. Link to full history on CH website.

If either API call fails, show a warning: "Could not load some company information from Companies House."

Style using `var(--color-*)` tokens, consistent with the rest of the app. Use section headers with the same uppercase label pattern as the filing selector page.

- [ ] **Step 2: Wire up the Overview tab in the company page**

In `src/app/(app)/company/[companyId]/page.tsx`:

Import `OverviewTab` and replace the Overview tab placeholder:

```tsx
<OverviewTab companyNumber={company.companyRegistrationNumber} />
```

Since `OverviewTab` is an async server component, it can be rendered directly inside the page.

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/overview-tab.tsx "src/app/(app)/company/[companyId]/page.tsx"
git commit -m "feat: Overview tab with CH company info and recent filings"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Run full test suite**

Run: `npm test`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No new lint errors from our changed files

- [ ] **Step 4: Commit any fixes if needed**

```bash
git add -A
git commit -m "fix: address build/lint issues from company page implementation"
```
