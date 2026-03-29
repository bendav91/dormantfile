# Preview Launch Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the app behind a `NEXT_PUBLIC_LAUNCH_MODE=preview` env var so it can be soft-launched for SEO while filing and checkout are disabled.

**Architecture:** A single build-time constant `isPreviewMode` controls all preview behaviour. Components import it and conditionally render. No middleware, no runtime checks. Removing the env var and redeploying flips everything to live.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-29-preview-launch-mode-design.md`

---

### Task 1: Launch mode helper

**Files:**
- Create: `src/lib/launch-mode.ts`

- [ ] **Step 1: Create the helper module**

```ts
export const isPreviewMode = process.env.NEXT_PUBLIC_LAUNCH_MODE === 'preview'
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/launch-mode.ts
git commit -m "feat: add isPreviewMode build-time constant"
```

---

### Task 2: LaunchBanner component

**Files:**
- Create: `src/components/launch-banner.tsx`

- [ ] **Step 1: Create the component**

A slim, full-width strip above the nav. Accepts a `variant` prop to switch copy between marketing and app contexts. Only renders when `isPreviewMode` is true.

```tsx
import { isPreviewMode } from "@/lib/launch-mode";

interface LaunchBannerProps {
  variant: "marketing" | "app";
}

const COPY = {
  marketing: "We're launching soon — sign up now to be ready when filing goes live.",
  app: "Filing is coming soon — we'll let you know when it's live.",
};

export function LaunchBanner({ variant }: LaunchBannerProps) {
  if (!isPreviewMode) return null;

  return (
    <div
      style={{
        backgroundColor: "var(--color-primary)",
        color: "var(--color-bg-card)",
        textAlign: "center",
        padding: "10px 16px",
        fontSize: "14px",
        fontWeight: 500,
      }}
    >
      {COPY[variant]}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/launch-banner.tsx
git commit -m "feat: add LaunchBanner component"
```

---

### Task 3: Add banner to marketing layout

**Files:**
- Modify: `src/app/(marketing)/layout.tsx`

- [ ] **Step 1: Add import and render LaunchBanner above MarketingNav**

Add to imports:
```ts
import { LaunchBanner } from "@/components/launch-banner";
```

Inside the outer `<div>`, add `<LaunchBanner variant="marketing" />` directly above `<MarketingNav />` (line 23).

- [ ] **Step 2: Commit**

```bash
git add src/app/\(marketing\)/layout.tsx
git commit -m "feat: add launch banner to marketing layout"
```

---

### Task 4: Add banner and soften CTAs on homepage

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add imports**

Add to existing imports:
```ts
import { LaunchBanner } from "@/components/launch-banner";
import { isPreviewMode } from "@/lib/launch-mode";
```

- [ ] **Step 2: Add LaunchBanner above MarketingNav**

Inside the outer `<div>` (line 61), add `<LaunchBanner variant="marketing" />` directly above the `<MarketingNav />` (line 63).

- [ ] **Step 3: Soften hero CTA**

On line 92, change the CTA text from a hardcoded string to a conditional:

```tsx
{isPreviewMode ? "Get started" : "Start filing"} <ArrowRight size={18} />
```

- [ ] **Step 4: Soften final CTA**

On line 467, change the final CTA text from a hardcoded string to a conditional:

```tsx
{isPreviewMode ? "Get started today" : "Start filing today"} <ArrowRight size={18} />
```

- [ ] **Step 5: Verify locally**

Run: `npm run dev`

Check the homepage at `http://localhost:3000`:
- With `NEXT_PUBLIC_LAUNCH_MODE=preview` in `.env`: banner shows, CTAs say "Get started" / "Get started today"
- Without the env var (or any other value): no banner, CTAs say "Start filing" / "Start filing today"

- [ ] **Step 6: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: add launch banner and soften CTAs on homepage"
```

---

### Task 5: Add banner to app layout

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Add import and render LaunchBanner above the nav**

Add to imports:
```ts
import { LaunchBanner } from "@/components/launch-banner";
```

Inside the outer `<div>` (line 29), add `<LaunchBanner variant="app" />` directly above the `<nav>` element (line 36).

- [ ] **Step 2: Commit**

```bash
git add src/app/\(app\)/layout.tsx
git commit -m "feat: add launch banner to app layout"
```

---

### Task 6: Hide file/retry buttons in filings tab

**Files:**
- Modify: `src/components/filings-tab.tsx`

- [ ] **Step 1: Add import**

Add to imports:
```ts
import { isPreviewMode } from "@/lib/launch-mode";
```

- [ ] **Step 2: Hide the accounts "File" button**

On line 394-401, the accounts "File" `<Link>` is rendered as the else branch when there's no existing filing. Wrap it with a preview mode check:

Replace:
```tsx
) : (
  <Link
    href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`}
    style={filingBtnStyle}
  >
    File
  </Link>
)}
```

With:
```tsx
) : !isPreviewMode ? (
  <Link
    href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`}
    style={filingBtnStyle}
  >
    File
  </Link>
) : null}
```

- [ ] **Step 3: Hide the accounts "Retry" button**

On lines 386-391, the accounts retry link renders when status is failed/rejected. Wrap it:

Replace:
```tsx
{(accountsFiling.status === "failed" ||
  accountsFiling.status === "rejected") && (
  <Link
    href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`}
    style={filingBtnStyle}
  >
    Retry
  </Link>
)}
```

With:
```tsx
{!isPreviewMode &&
  (accountsFiling.status === "failed" ||
    accountsFiling.status === "rejected") && (
    <Link
      href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`}
      style={filingBtnStyle}
    >
      Retry
    </Link>
  )}
```

- [ ] **Step 4: Hide the CT600 "File" button**

On lines 456-462, the CT600 file link. Replace:

```tsx
<>
  <MarkFiledButton companyId={companyId} periodEnd={periodEndISO} />
  <Link
    href={`/file/${companyId}/ct600?periodEnd=${periodEndISO}`}
    style={filingBtnStyle}
  >
    File
  </Link>
</>
```

With:
```tsx
<>
  <MarkFiledButton companyId={companyId} periodEnd={periodEndISO} />
  {!isPreviewMode && (
    <Link
      href={`/file/${companyId}/ct600?periodEnd=${periodEndISO}`}
      style={filingBtnStyle}
    >
      File
    </Link>
  )}
</>
```

- [ ] **Step 5: Hide the CT600 "Retry" button**

On lines 443-449, the CT600 retry link. Replace:

```tsx
{(ct600Filing.status === "failed" ||
  ct600Filing.status === "rejected") && (
  <Link
    href={`/file/${companyId}/ct600?periodEnd=${periodEndISO}`}
    style={filingBtnStyle}
  >
    Retry
  </Link>
)}
```

With:
```tsx
{!isPreviewMode &&
  (ct600Filing.status === "failed" ||
    ct600Filing.status === "rejected") && (
    <Link
      href={`/file/${companyId}/ct600?periodEnd=${periodEndISO}`}
      style={filingBtnStyle}
    >
      Retry
    </Link>
  )}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/filings-tab.tsx
git commit -m "feat: hide file/retry buttons in preview mode"
```

---

### Task 7: Suppress SubscriptionBanner in preview mode

**Files:**
- Modify: `src/components/subscription-banner.tsx`

- [ ] **Step 1: Add import and early return**

Add to imports:
```ts
import { isPreviewMode } from "@/lib/launch-mode";
```

At the top of the `SubscriptionBanner` function body (line 11, before the existing `if` checks), add:

```ts
if (isPreviewMode) return null;
```

This suppresses the entire banner in preview mode. The `<LaunchBanner>` in the app layout handles the "coming soon" messaging instead.

- [ ] **Step 2: Commit**

```bash
git add src/components/subscription-banner.tsx
git commit -m "feat: suppress SubscriptionBanner in preview mode"
```

---

### Task 8: Disable checkout on choose-plan page

**Files:**
- Modify: `src/app/(app)/choose-plan/page.tsx`
- Modify: `src/components/plan-picker.tsx`

- [ ] **Step 1: Pass preview mode prop from choose-plan page**

In `src/app/(app)/choose-plan/page.tsx`, add import:
```ts
import { isPreviewMode } from "@/lib/launch-mode";
```

Pass it to PlanPicker on line 47:
```tsx
<PlanPicker currentTier={user.subscriptionTier} isUpgrade={isUpgrade} disabled={isPreviewMode} />
```

- [ ] **Step 2: Accept and use disabled prop in PlanPicker**

In `src/components/plan-picker.tsx`, update the interface (line 8-11):

```ts
interface PlanPickerProps {
  currentTier: SubscriptionTier;
  isUpgrade: boolean;
  disabled?: boolean;
}
```

Update the destructuring on line 53:
```ts
export default function PlanPicker({ currentTier, isUpgrade, disabled }: PlanPickerProps) {
```

On line 163, update `isDisabled` to include the new prop:
```ts
const isDisabled = loading !== null || isCurrent || !!disabled;
```

- [ ] **Step 3: Add "coming soon" note when disabled**

In `src/components/plan-picker.tsx`, after the closing `</div>` of the plans grid (after line 311) and before the `{isUpgrade && ...}` block (line 313), add:

```tsx
{disabled && (
  <p
    style={{
      fontSize: "14px",
      color: "var(--color-text-secondary)",
      textAlign: "center",
      marginTop: "20px",
      fontWeight: 500,
    }}
  >
    Plans will be available when filing goes live.
  </p>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/choose-plan/page.tsx src/components/plan-picker.tsx
git commit -m "feat: disable checkout in preview mode"
```

---

### Task 9: Suppress reminder emails in preview mode

**Files:**
- Modify: `src/app/api/cron/reminders/route.ts`

- [ ] **Step 1: Add import and early return**

Add to imports:
```ts
import { isPreviewMode } from "@/lib/launch-mode";
```

Inside the `GET` handler, immediately after the auth check (after line 68), add:

```ts
if (isPreviewMode) {
  return NextResponse.json({ sent: 0, skipped: "preview mode" });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/reminders/route.ts
git commit -m "feat: skip reminder emails in preview mode"
```

---

### Task 10: Build check and final commit

- [ ] **Step 1: Add env var to .env**

Add `NEXT_PUBLIC_LAUNCH_MODE=preview` to your local `.env` file.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Manual verification**

Run `npm run dev` and check:
1. Homepage: banner visible, CTAs say "Get started" / "Get started today"
2. Any marketing page (e.g. `/pricing`): banner visible above nav
3. Dashboard (logged in): app banner visible, no subscription banner for tier "none" users
4. Company page: no "File" or "Retry" buttons in outstanding filings
5. `/choose-plan`: plan buttons disabled, "Plans will be available when filing goes live." note visible

Then remove `NEXT_PUBLIC_LAUNCH_MODE` from `.env`, restart dev server, and verify everything reverts.
