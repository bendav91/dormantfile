# Public reviews rating floor — design

**Date:** 2026-05-16
**Status:** Approved (user)

## Problem

Low-star reviews (1–3★) appear on the public reviews page and feed the homepage
aggregate rating and structured data. We want only positive reviews shown
publicly.

## Decision

- **Threshold:** publicly display only reviews with `rating >= 4` (hide 1–3★).
- **Scope:** all public surfaces are restricted to the same set so they stay
  internally consistent — the reviews-page cards, the homepage/JSON-LD aggregate
  average, and the rating breakdown bars.

## Change

Single source of truth in `src/lib/reviews.ts`:

```ts
const MIN_PUBLIC_RATING = 4;
const PUBLIC_REVIEW_FILTER = {
  approved: true,
  hiddenAt: null,
  rating: { gte: MIN_PUBLIC_RATING },
} as const;
```

Applied to the three public read functions:

| Function | Surface | Change |
|---|---|---|
| `getPublishedReviews()` | reviews-page cards | use `PUBLIC_REVIEW_FILTER` |
| `getReviewStats()` | homepage avg + `AggregateRatingJsonLd` | use `PUBLIC_REVIEW_FILTER` in `aggregate` |
| `getRatingBreakdown()` | reviews-page bar chart | use `PUBLIC_REVIEW_FILTER`; breakdown record becomes `{ 5: 0, 4: 0 }` so only displayable ratings are charted |

## Explicitly unchanged

- **Submission/validation** (`src/app/api/reviews/route.ts`): still accepts and
  stores 1–5. Low ratings are persisted, just not shown publicly.
- **Admin moderation** (`getPendingReviews()`, `getAllReviewsAdmin()`): admins
  still see and moderate every review, including 1–3★.
- **`MIN_REVIEWS_THRESHOLD = 3`** gating in `getReviewStats()`: retained, now
  counting only the 4★+ population.

## Consistency guarantee

All four public-facing values derive from the single `PUBLIC_REVIEW_FILTER`
constant. The page cannot show a 4.x average above a wall of 5★ cards, and the
JSON-LD aggregate cannot disagree with the visible reviews.

## Accepted risk

Publishing an aggregate rating computed only over filtered (4★+) reviews can
breach UK ASA/CMA guidance on misleading consumer reviews — the displayed
average no longer reflects all genuine feedback, and the JSON-LD aggregate
Google ingests is likewise filtered. This was flagged to the user, who chose
"restrict everything to match" with the risk understood. Recorded here as an
**accepted risk**, not a recommendation.

## Testing

New `src/__tests__/lib/reviews.test.ts` with Prisma mocked:

- `getPublishedReviews` / `getReviewStats` / `getRatingBreakdown` all pass a
  `where` containing `rating: { gte: 4 }` (plus `approved: true`, `hiddenAt: null`).
- `getRatingBreakdown` returns a breakdown keyed only by 4 and 5.
- `getReviewStats` still returns `null` below `MIN_REVIEWS_THRESHOLD`.
- `getPendingReviews` / `getAllReviewsAdmin` `where` does NOT include a rating
  floor (admins see everything).
