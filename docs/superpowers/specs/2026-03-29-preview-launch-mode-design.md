# Preview Launch Mode

Soft-launch DormantFile to collect SEO value while filing isn't production-ready. Users can sign up, add companies, and track deadlines — but can't file or pay yet.

## Approach

A single environment variable `NEXT_PUBLIC_LAUNCH_MODE=preview` gates all preview behaviour. Removing it (or setting any other value) activates the full app. One config change in Vercel to go live.

## Changes

### 1. Launch mode helper

New file: `src/lib/launch-mode.ts`

```ts
export const isPreviewMode = process.env.NEXT_PUBLIC_LAUNCH_MODE === 'preview'
```

A build-time constant (Next.js inlines `NEXT_PUBLIC_` values). Works both server-side and client-side.

### 2. Marketing site banner

A `<LaunchBanner>` component rendered at the top of the marketing layout (`src/app/(marketing)/layout.tsx`), above the nav. Slim, full-width, accent-coloured strip:

> "We're launching soon — sign up now to be ready when filing goes live."

Only renders when `isPreviewMode` is true.

Note: The homepage (`src/app/page.tsx`) lives outside the marketing layout — it renders its own `<MarketingNav>` and `<MarketingFooter>` directly. The `<LaunchBanner>` must also be added to the homepage above its nav, not just the marketing layout.

### 3. App banner

Same `<LaunchBanner>` component in the app layout (`src/app/(app)/layout.tsx`), with different copy for logged-in users:

> "Filing is coming soon — we'll let you know when it's live."

### 4. Homepage CTA softening

In `src/app/page.tsx`, when preview mode is active:

| Location | Current copy | Preview copy |
|----------|-------------|--------------|
| Hero CTA | "Start filing" | "Get started" |
| Final CTA | "Start filing today" | "Get started today" |

Pricing section CTAs ("Get started") stay as-is. All links still point to `/register`.

### 5. Hidden file buttons

In `src/components/filings-tab.tsx`, when preview mode is active:

- **Hide**: "File" button on outstanding periods
- **Hide**: "Retry" button on failed/rejected filings
- **Keep**: Everything else — company cards, deadlines, status badges, "Mark Filed" button, suppress functionality

Users can see what's coming and track deadlines. They just can't submit.

### 6. Disabled checkout

In `src/app/(app)/choose-plan/page.tsx`, when preview mode is active:

- Disable plan selection buttons in `<PlanPicker>`
- Show a note: "Plans will be available when filing goes live."
- Users can still see tiers and features

The marketing pricing page needs no change — its CTAs link to `/register`, which is fine.

### 7. Suppress SubscriptionBanner in preview mode

The existing `SubscriptionBanner` (`src/components/subscription-banner.tsx`) shows "Choose a plan" for users on tier `"none"` and links to `/choose-plan`. In preview mode, that page has checkout disabled — creating a confusing dead end.

In preview mode, suppress the `SubscriptionBanner` entirely. The `<LaunchBanner>` in the app layout already communicates the "coming soon" state, so no replacement is needed.

### 8. Suppress reminder emails in preview mode

The daily reminder cron (`/api/cron/reminders`) sends filing deadline emails. In preview mode, these would tell users about upcoming deadlines they can't act on. Check `isPreviewMode` at the top of the cron handler and skip sending when true.

## Going live

1. Remove `NEXT_PUBLIC_LAUNCH_MODE` from Vercel environment variables (or set to any value other than `"preview"`)
2. Redeploy

No code changes required. `isPreviewMode` evaluates to false:
- Banners disappear
- File buttons reappear
- Checkout enables
- CTAs revert to their default copy

## Transition — converting preview users to paid

No special conversion code is needed. The existing infrastructure handles it:

- Filing pages (`/file/[companyId]/accounts`, `/file/[companyId]/ct600`) require `subscriptionStatus === "active" || "cancelling"` — users without a plan get redirected to the dashboard
- `SubscriptionBanner` reappears on the dashboard, showing "Choose a plan" for users on tier `"none"`
- Filing submission APIs return 403 without an active subscription
- The choose-plan page and Stripe checkout are fully functional once preview mode is off

## Files touched

| File | Change |
|------|--------|
| `src/lib/launch-mode.ts` | New — `isPreviewMode()` helper |
| `src/app/(marketing)/layout.tsx` | Add `<LaunchBanner>` above nav |
| `src/app/(app)/layout.tsx` | Add `<LaunchBanner>` with app copy |
| `src/app/page.tsx` | Conditional CTA copy + `<LaunchBanner>` above nav |
| `src/components/filings-tab.tsx` | Hide file/retry buttons in preview |
| `src/app/(app)/choose-plan/page.tsx` | Disable checkout, show note |
| `src/components/launch-banner.tsx` | New — banner component |
| `src/components/subscription-banner.tsx` | Suppress in preview mode |
| `src/app/api/cron/reminders/route.ts` | Skip sending in preview mode |

## Out of scope

- Email announcement to preview users when filing goes live (manual send)
- Blog or content additions for SEO (existing 46 content pieces are sufficient for launch)
- Open Graph images (nice-to-have, not blocking)
- Any changes to the subscription model or pricing
