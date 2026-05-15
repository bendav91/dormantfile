# Onboarding Activation Checklist — Design

**Date:** 2026-05-15
**Status:** Approved (brainstorming)
**Topic:** First-run onboarding to drive new users to their first submitted filing

## Problem

New users sign up but a guided tour was the proposed solution to a vaguer goal.
After interrogating intent, the real problem is **activation**: users register and
then don't reach a submitted filing. The blocker is confidence and "what do I do
first?", not UI navigation. A feature-pointing spotlight tour would be low value
and is explicitly rejected.

The current "onboarding" route (`/onboarding`) is only the add-company form. There
is no progress guidance and no first-run reassurance anywhere. There are no tour
libraries installed and none will be added.

## Goal & Definition of Done

- **Goal:** move a new user from empty dashboard to their **first submitted filing**.
- **Activated ("done"):** the user has **one filing** with status `submitted` or
  `accepted` (Accounts *or* CT600 — whichever is due first). After that, onboarding
  guidance disappears.

## Activation Path (from the codebase)

`register → verify email → add company (/onboarding) → choose plan / subscribe
(/choose-plan) → file Accounts (Companies House) or CT600 (HMRC) via
/company/[companyId] → filing submitted`.

Filing pages are gated behind `subscriptionStatus ∈ {active, cancelling}`.

### Launch flags (two independent paths)

`src/lib/launch-mode.ts` exposes two flags that gate the two filing paths
independently:

- **`isFilingLive()`** (`NEXT_PUBLIC_FILING_LIVE`) — the **Accounts / Companies
  House** path. Also gates the `/choose-plan` page (redirects away / disables the
  CTA when false), the subscription banner, and the reminders cron.
- **`isTaxFilingLive()`** (`NEXT_PUBLIC_TAX_FILING_LIVE`) — the **CT600 / HMRC**
  path (`ct600` filing page redirect, submit API, corp-tax tab actions).

The checklist must adapt per flag: each path's step turns on/off with its flag,
and the "Choose plan" step mirrors the existing `/choose-plan` gate
(`isFilingLive()`).

**Noted dependency (not in scope to change):** `/choose-plan` is gated only by
`isFilingLive()`. So if *only* `isTaxFilingLive()` is true, subscription cannot
be purchased and the path is blocked at the plan step. This is existing product
behaviour; the checklist mirrors it rather than working around it. Flagged here
so the planner doesn't try to "fix" it.

## Approach

Bespoke. **No tour library, no spotlight/coach-mark engine.**

**State model — fully derived + one dismissal field.** Progress is computed live
from data the dashboard already loads. A single nullable
`User.onboardingDismissedAt` lets a user hide the panel early.

Rejected alternative: explicit per-step boolean/timestamp flags on `User` — more
schema, must stay in sync with Stripe webhooks and filing-status transitions,
drifts from reality. Not worth it for three derived steps.

## Design

### A. Onboarding state helper

`src/lib/onboarding.ts` exposes a pure function:

```
getOnboardingState(input: {
  companyCount: number;            // active companies (deletedAt = null)
  subscriptionStatus: SubscriptionStatus;
  hasSubmittedFiling: boolean;     // any filing status ∈ {submitted, accepted}
  dismissedAt: Date | null;
  accountsFilingLive: boolean;     // isFilingLive()
  ct600FilingLive: boolean;        // isTaxFilingLive()
  firstCompanyId: string | null;   // for the "file" step href
}): {
  steps: { key: "company" | "plan" | "file"; label: string;
           subLabel?: string; done: boolean; locked: boolean;
           lockedNote?: string; href: string }[];
  activeStepKey: "company" | "plan" | "file" | null;
  complete: boolean;               // hasSubmittedFiling === true
  visible: boolean;                // !complete && !dismissed
}
```

The function is pure: launch flags are passed in by the caller (which calls
`isFilingLive()` / `isTaxFilingLive()`), keeping it fully unit-testable.

Steps (derived):

1. **Add your company** — `done` when `companyCount > 0`. Never `locked`.
   `href: /onboarding`.
2. **Choose your plan** — `done` when `subscriptionStatus ∈ {active,
   cancelling}`. `locked` when `!accountsFilingLive` (mirrors the existing
   `/choose-plan` gate). `lockedNote: "Opens soon — we'll email you."`
   `href: /choose-plan`.
3. **File your first return** — `done` when `hasSubmittedFiling`. `locked` when
   neither path is live (`!accountsFilingLive && !ct600FilingLive`).
   `href` → company hub `/company/[firstCompanyId]` (or `/dashboard` if
   `firstCompanyId` is null). `subLabel` adapts to available paths:
   - both live → `"Accounts or CT600 — whichever's due first."`
   - accounts only → `"File your dormant accounts."`
   - CT600 only → `"File your CT600."`
   - neither → omit subLabel; `lockedNote: "Filing opens soon — we'll email
     you the moment it does."`

`activeStepKey` = the first step that is **not `done` and not `locked`** (drives
emphasis / primary CTA). If every not-done step is locked, `activeStepKey` is
`null` — the panel still renders, showing completed progress plus locked steps
so a pre-launch user sees they're set up and waiting.

`complete` overrides `dismissed`: never show a stale panel; once a filing is
submitted the panel is gone regardless of the dismissed flag.

### B. Checklist component

Server component `OnboardingChecklist`, rendered at the top of `/dashboard` in
**both** the zero-company empty-state branch and the populated branch (above
`SubscriptionBanner` / heading).

- When `visible`: a structured numbered progress strip. Active step emphasized;
  completed steps quietly checked (not loud green). Incomplete + unlocked steps
  link to their `href`; the active step is the primary call to action. **Locked**
  steps render de-emphasised, are not links, and show their `lockedNote` (e.g.
  "Opens soon — we'll email you"). A pre-launch user therefore sees: company
  added (actionable now), plan + file shown as "opening soon".
- When `complete` (transient, until next load clears it): a brief "You're set"
  state with one soft line pointing to the *other* filing, since a dormant
  company genuinely needs both Accounts and CT600. This is **static reassurance
  copy** ("your other return — Accounts or CT600 — is on your company page when
  you're ready"), not a data-driven which-one-is-done determination.
  `getOnboardingState` deliberately exposes only a single `hasSubmittedFiling`
  boolean; no per-path submitted state is needed. Body copy, **not** a blocking
  fourth step.
- A subtle "Hide this" text button (not a large X) calls the dismiss action.

### C. First-filing reassurance note

A single first-time `FirstFilingNote` shown once at the entry of the first filing
(company hub `/company/[companyId]`), **only** when `hasSubmittedFiling` is false
**and at least one filing path is live** (`accountsFilingLive || ct600FilingLive`).
Pre-launch (no path live) there is nothing to file yet, so the note does not show.

- Plain-English content: it's a nil return, nothing is owed, we submit directly
  to HMRC / Companies House, it takes ~10 minutes.
- One placement only. The filing flows already carry good inline security copy
  (e.g. "transmitted securely over HTTPS directly to HMRC"); do not duplicate it
  or add per-step coach marks.
- Derived from the same `hasSubmittedFiling` signal — disappears permanently
  after the first submission. No separate flag.

### D. Visual intent

Audience: an anxious non-accountant making an official HMRC / Companies House
filing. Tone: calm, restrained, confidence-building, light.

- Existing design tokens (`bg-card`, `text-foreground`, `text-secondary`,
  `bg-primary`, `border-border`) and IBM Plex Sans. One accent for the active step.
- Subtle staggered reveal on first paint; completed-step check eases out (no
  bounce). Respect `prefers-reduced-motion`.
- **Banned (AI tells):** icon-above-heading cards, `border-left`/`border-right`
  accent stripes, gradient text, decorative glassmorphism.
- On a zero-company dashboard the checklist **replaces** the current bland empty
  state and becomes the screen's hero — a dead screen turned into a guided start.

### E. Data flow

The dashboard page (`src/app/(app)/dashboard/page.tsx`) fetches `user` via two
`findUnique` calls *before* a `Promise.all`, then the `Promise.all` resolves
`allCompanyCount`, `hasAcceptedFiling` (used only for the unrelated review
prompt), and `existingReview`.

Add **one more member** to that `Promise.all`: `hasSubmittedFiling` — a
`filing.findFirst` with `status ∈ {submitted, accepted}`. Do **not** repurpose
the existing `hasAcceptedFiling`/`showReviewPrompt` logic; it gates the review
prompt and must stay as-is. Pass `companyCount`, `subscriptionStatus`,
`hasSubmittedFiling`, `dismissedAt` (new `user.onboardingDismissedAt`),
`isFilingLive()`, `isTaxFilingLive()`, and the first active company's id into
`getOnboardingState`. One added query; no other round-trips.

The zero-company empty-state branch returns *early* and never reaches the
populated render — the checklist must be rendered in **both** `return` blocks
(two distinct edit sites in the same file).

Dismiss: a server action in `src/lib/onboarding.ts` (not an API route) sets
`onboardingDismissedAt = now()` for the session user and revalidates
`/dashboard`.

### F. Error handling

Onboarding UI is best-effort and must never block the dashboard:

- If `getOnboardingState` or its data fetch throws, render nothing.
- Dismiss failure → optimistic client-side hide, reconcile on next load.
  Non-critical.

### G. Testing (Vitest, mirrors `src/lib`)

`src/__tests__/lib/onboarding.test.ts` — pure `getOnboardingState`:

- Each step's `done` condition individually.
- `activeStepKey` = first step that is not-done **and** not-locked; `null` when
  all done, and `null` when every not-done step is locked.
- `complete` true when `hasSubmittedFiling`; `visible` false when complete.
- `dismissedAt` set → `visible` false while not complete.
- `complete` overrides `dismissed` (panel not "visible" but `complete` true; the
  component treats complete as the resolved state, never stale).
- Soft-deleted companies excluded (caller passes `companyCount` already filtered
  on `deletedAt = null`; test documents this contract).
- **Launch-flag matrix** for the `plan` and `file` steps:
  - `accountsFilingLive=false` → `plan` step `locked` with `lockedNote`.
  - neither path live → `file` step `locked`, no subLabel, `lockedNote` set.
  - accounts only / CT600 only / both → `file` step unlocked with the matching
    subLabel string.
  - pre-launch (neither live) with company added → `visible` true,
    `activeStepKey` null, steps 2–3 locked (regression guard for the
    pre-launch experience).

Component render: correct active step for a given state; renders nothing when
`!visible && !complete`.

### H. Migration

One Prisma migration: add `onboardingDismissedAt DateTime?` to `User`.

## Out of Scope (YAGNI)

- No tour / spotlight / coach-mark library or engine.
- No per-step analytics events in v1.
- No "replay onboarding" control in settings.
- No fourth blocking step for the second filing (soft pointer only).

## Affected Files

- `prisma/schema.prisma` (+ migration) — add `onboardingDismissedAt`.
- `src/lib/onboarding.ts` — new: state helper + dismiss action.
- `src/components/OnboardingChecklist.tsx` — new.
- `src/components/FirstFilingNote.tsx` — new.
- `src/app/(app)/dashboard/page.tsx` — render checklist in both branches; extend
  the existing `Promise.all`.
- `src/app/(app)/company/[companyId]/page.tsx` — render `FirstFilingNote` when
  no submitted filing.
- `src/__tests__/lib/onboarding.test.ts` — new tests.
