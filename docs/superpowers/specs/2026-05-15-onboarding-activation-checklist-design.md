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
}): {
  steps: { key: "company" | "plan" | "file"; label: string;
           subLabel?: string; done: boolean; href: string }[];
  activeStepKey: "company" | "plan" | "file" | null;
  complete: boolean;               // hasSubmittedFiling === true
  visible: boolean;                // !complete && !dismissed
}
```

Steps (derived):

1. **Add your company** — `done` when `companyCount > 0`. `href: /onboarding`.
2. **Choose your plan** — `done` when `subscriptionStatus ∈ {active, cancelling}`.
   `href: /choose-plan`.
3. **File your first return** — `done` when `hasSubmittedFiling`. `href` →
   company hub `/company/[companyId]` (first active company).
   `subLabel: "Accounts or CT600 — whichever's due first."`

`activeStepKey` = first step that is not `done` (drives emphasis).
`complete` overrides `dismissed`: never show a stale panel; once a filing is
submitted the panel is gone regardless of the dismissed flag.

### B. Checklist component

Server component `OnboardingChecklist`, rendered at the top of `/dashboard` in
**both** the zero-company empty-state branch and the populated branch (above
`SubscriptionBanner` / heading).

- When `visible`: a structured numbered progress strip. Active step emphasized;
  completed steps quietly checked (not loud green). Each incomplete step links to
  its `href`; the active step is the primary call to action.
- When `complete` (transient, until next load clears it): a brief "You're set"
  state with one soft line pointing to the *other* filing, since a dormant
  company genuinely needs both Accounts and CT600. This is body copy, **not** a
  blocking fourth step.
- A subtle "Hide this" text button (not a large X) calls the dismiss action.

### C. First-filing reassurance note

A single first-time `FirstFilingNote` shown once at the entry of the first filing
(company hub `/company/[companyId]`), **only** when `hasSubmittedFiling` is false.

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

The dashboard page already runs a `Promise.all` fetching `user`,
`allCompanyCount`, and an accepted-filing existence check. Extend it to also
resolve `hasSubmittedFiling` (status ∈ {submitted, accepted}) and pass the inputs
into `getOnboardingState`. No meaningful extra round-trips.

Dismiss: a server action (in `src/lib/onboarding.ts` or an `api/account` route)
sets `onboardingDismissedAt = now()` for the session user and revalidates
`/dashboard`.

### F. Error handling

Onboarding UI is best-effort and must never block the dashboard:

- If `getOnboardingState` or its data fetch throws, render nothing.
- Dismiss failure → optimistic client-side hide, reconcile on next load.
  Non-critical.

### G. Testing (Vitest, mirrors `src/lib`)

`src/__tests__/lib/onboarding.test.ts` — pure `getOnboardingState`:

- Each step's `done` condition individually.
- `activeStepKey` is the first not-done step; `null` when all done.
- `complete` true when `hasSubmittedFiling`; `visible` false when complete.
- `dismissedAt` set → `visible` false while not complete.
- `complete` overrides `dismissed` (panel not "visible" but `complete` true; the
  component treats complete as the resolved state, never stale).
- Soft-deleted companies excluded (caller passes `companyCount` already filtered
  on `deletedAt = null`; test documents this contract).

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
