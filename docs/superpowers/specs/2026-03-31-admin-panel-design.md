# Admin Panel — Design Spec

## Context

DormantFile is run by a solo founder. Operational visibility is currently scattered across Vercel logs, Stripe dashboard, Resend logs, and the email inbox. The admin panel has only review management. This spec adds a centralised operations hub so the founder can monitor system health, investigate customer issues, and take corrective action — all from one place.

---

## 1. Database Changes

### New `ContactMessage` model

```prisma
model ContactMessage {
  id        String    @id @default(cuid())
  name      String
  email     String
  message   String
  readAt    DateTime?
  createdAt DateTime  @default(now())
}
```

The existing `/api/contact` route is modified to persist a `ContactMessage` record alongside sending the email.

### Filing model change

Add `updatedAt` to the Filing model so we can detect stale pending filings:

```prisma
// Add to Filing model:
updatedAt DateTime @updatedAt
```

This requires a migration: `npx prisma migrate dev --name add-filing-updated-at`

All other data for customer lookup, filing monitor, and dashboard stats is already queryable from User, Company, Filing, and the Stripe fields on User.

---

## 2. Admin Dashboard — `/admin`

Replaces the current redirect-to-reviews. Server-rendered page with attention cards, health stats, and recent activity.

### Attention Cards

Each card shows a count + label, coloured by severity, linking to the relevant admin page:

| Card | Query | Links to | Colour |
|---|---|---|---|
| Stuck filings | `status IN (polling_timeout) OR (status = pending AND updatedAt < now() - 5 minutes)` | `/admin/filings?status=stuck` | Red if > 0 |
| Rejected filings | `status = rejected AND confirmedAt < now() - 7 days` (rejected and unresolved for over a week) | `/admin/filings?status=rejected` | Red if > 0 |
| Failed payments | Users where `subscriptionStatus = past_due` | `/admin/customers?filter=past_due` | Yellow |
| Pending reviews | `approved = false AND hiddenAt IS NULL` | `/admin/reviews` | Yellow if > 0 |
| Unread messages | `ContactMessage WHERE readAt IS NULL` | `/admin/messages` | Yellow if > 0 |

### Health Stats

Number + label row below attention cards:

- **Active subscribers** — count by tier (basic / multi / agent)
- **Total companies** — active (non-deleted)
- **Filings this month** — accepted filings where `confirmedAt` in current calendar month
- **MRR** — calculated from active subscriber counts and annual tier prices (basic £19/yr, multi £39/yr, agent £49/yr): `(basic * 19 + multi * 39 + agent * 49) / 12`, rounded to nearest pound

### Recent Activity

Last 10 events, each one line: timestamp + icon + description + link.

- New signups (User `createdAt` in last 7 days)
- Filing status changes (submitted / accepted / rejected in last 48h)
- New contact messages

---

## 3. Customer Lookup

### List View — `/admin/customers`

Searchable, paginated table of all users.

**Search:** Single text input searching across `email`, `name`, and related company `companyName` / `companyRegistrationNumber`. Debounced, URL search param driven (`?q=`).

**Filters** (URL param driven):
- All
- Active subscribers
- Past due
- Cancelled
- No subscription

**Table columns:**
- Name + email
- Subscription tier + status (badge)
- Company count
- Outstanding filings count
- Signed up (relative date)

**Pagination:** 20 per page, URL param driven (`?page=`).

### Detail View — `/admin/customers/[userId]`

Full user profile on a single page:

**Header:** Name, email, signup date, subscription badge. External link to Stripe customer dashboard.

**Companies section:** All companies (active + soft-deleted, deleted ones greyed out). Each shows name, CRN, filing summary line.

**Filings section:** Expandable per company. Table of filings: period, type, status badge, deadline, submitted/confirmed dates. Row actions:
- **Retry** — for `polling_timeout` or `failed`, re-triggers status poll
- **Reset** — for `rejected` or `failed`, sets back to `outstanding`

**Review section:** Their review if present, with approve/hide controls.

**No destructive actions** — no user deletion or subscription cancellation from admin. Use Stripe dashboard or direct DB access for those.

---

## 4. Filings Monitor — `/admin/filings`

All filings across all users in a filterable, paginated table.

**Filters** (URL param driven, combinable):

| Filter | Options |
|---|---|
| Status | All, Outstanding, Pending, Submitted, Polling timeout, Accepted, Rejected, Failed, Stuck (shortcut: `polling_timeout` OR `pending` with `updatedAt < now() - 5 minutes`) |
| Type | All, Accounts, CT600 |
| Deadline | All, Overdue, Due within 30 days, Upcoming |

**Table columns:**
- Company name + CRN (links to customer detail)
- User email
- Type badge (accounts / ct600)
- Period (e.g. "1 Apr 2025 — 31 Mar 2026")
- Deadline + urgency indicator (red if overdue, yellow if due within 30 days)
- Status badge
- Submitted date

**Sort:** Default by deadline ascending. Clickable column headers for status, deadline, submitted date.

**Pagination:** 20 per page.

**Row actions:**
- Retry poll (for `polling_timeout`)
- Reset to outstanding (for `rejected` / `failed`)

**Bulk action:** Select multiple `polling_timeout` filings and retry all.

---

## 5. Contact Messages — `/admin/messages`

Inbox-style list of contact form submissions, ordered by `createdAt` desc.

**List items:**
- Unread indicator (dot) if `readAt` is null
- Name + email
- Message preview (first 100 chars, truncated)
- Relative timestamp

**Expanding a message:** Accordion inline expansion (not a separate page). Auto-marks as read via PATCH. Shows full message text + `mailto:` reply link with pre-filled subject.

**No pagination initially** — contact form volume is low. Add later if needed.

**No deletion** — messages kept for reference.

---

## 6. API Routes

All routes guarded by `requireAdmin()`. Currently defined inline in `/api/admin/reviews/route.ts` — extract into `src/lib/admin.ts` as a shared export so all admin routes can import it.

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/stats` | GET | Dashboard attention counts + health stats |
| `/api/admin/customers` | GET | List users with search, filters, pagination |
| `/api/admin/customers/[userId]` | GET | Full user detail (companies, filings, review) |
| `/api/admin/filings` | GET | List filings with filters, pagination |
| `/api/admin/filings` | PATCH | Retry poll or reset filing by id |
| `/api/admin/filings/bulk` | POST | Bulk retry for polling_timeout filings |
| `/api/admin/messages` | GET | List contact messages |
| `/api/admin/messages/[id]` | PATCH | Mark message as read |

### Modified Route

`/api/contact` — also persists a `ContactMessage` record alongside sending the email.

---

## 7. Shared Admin Components

**`AdminPagination.tsx`** — Server component. Takes `page`, `totalPages`, renders prev/next `<Link>` tags preserving URL params. Shows "Page X of Y" indicator. Reused across customers, filings.

**`StatusBadge.tsx`** — Coloured badge component for filing status, subscription status, review status. Replaces the inline `ReviewStatus` in the existing reviews admin table.

**`AdminSearch.tsx`** — Client component. Debounced text input updating URL search params. Used on customers and filings pages.

**`AdminFilters.tsx`** — Client component. Dropdown/tab filters updating URL search params. Configurable filter options per page.

### Admin Layout Changes

The existing `/admin/layout.tsx` nav items array is extended:

- Dashboard (`/admin`)
- Customers (`/admin/customers`)
- Filings (`/admin/filings`)
- Messages (`/admin/messages`) + unread count badge
- Reviews (`/admin/reviews`)

Active nav item highlighted based on current pathname (use `usePathname()` in a client nav component, or pass the path from the server layout).

---

## 8. Files to Create

| File | Type |
|---|---|
| `src/lib/admin.ts` | Shared `requireAdmin()` guard + data helpers for admin queries (stats, customer search, filing filters) |
| `src/app/(app)/admin/customers/page.tsx` | Customer list page |
| `src/app/(app)/admin/customers/[userId]/page.tsx` | Customer detail page |
| `src/app/(app)/admin/customers/[userId]/AdminCustomerDetail.tsx` | Client component for filing actions |
| `src/app/(app)/admin/filings/page.tsx` | Filings monitor page |
| `src/app/(app)/admin/filings/AdminFilingsTable.tsx` | Client component for row/bulk actions |
| `src/app/(app)/admin/messages/page.tsx` | Messages page |
| `src/app/(app)/admin/messages/AdminMessageList.tsx` | Client component for expand/mark-read |
| `src/app/api/admin/stats/route.ts` | Dashboard stats API |
| `src/app/api/admin/customers/route.ts` | Customer list API |
| `src/app/api/admin/customers/[userId]/route.ts` | Customer detail API |
| `src/app/api/admin/filings/route.ts` | Filings list + actions API |
| `src/app/api/admin/filings/bulk/route.ts` | Bulk retry API |
| `src/app/api/admin/messages/route.ts` | Messages list API |
| `src/app/api/admin/messages/[id]/route.ts` | Mark-as-read API |
| `src/components/admin/AdminPagination.tsx` | Shared pagination |
| `src/components/admin/StatusBadge.tsx` | Shared status badge |
| `src/components/admin/AdminSearch.tsx` | Shared search input |
| `src/components/admin/AdminFilters.tsx` | Shared filter controls |

## 9. Files to Modify

| File | Change |
|---|---|
| `prisma/schema.prisma` | Add `ContactMessage` model + `updatedAt` field on Filing model |
| `src/app/(app)/admin/layout.tsx` | Extend nav items array |
| `src/app/(app)/admin/page.tsx` | Replace redirect with dashboard page |
| `src/app/api/contact/route.ts` | Also persist `ContactMessage` record |
| `src/app/api/admin/reviews/route.ts` | Import `requireAdmin` from shared `src/lib/admin.ts` instead of inline |
| `src/app/(app)/admin/reviews/AdminReviewsTable.tsx` | Use shared `StatusBadge` |

---

## 10. Design Guidelines

- All components use existing CSS custom properties (`var(--color-*)`)
- Card style: `var(--color-bg-card)`, `1px solid var(--color-border)`, `border-radius: 12px`
- Status badges: green (accepted/active), yellow (pending/past_due), red (rejected/failed/stuck), grey (outstanding/cancelled)
- Typography: IBM Plex Sans (inherited from app layout)
- Dark mode: works via CSS variables, no hardcoded colours
- Max width: 960px (matches existing app layout)
- Pagination, search, and filters driven by URL search params (bookmarkable, shareable, back-button friendly)
- All admin API routes reuse the existing `requireAdmin()` guard pattern

---

## 11. Deliberately Excluded

- **Email sending from admin** — Resend dashboard handles this
- **Stripe billing management** — Stripe dashboard is purpose-built for this
- **User impersonation** — too risky for a solo product; read-only investigation is sufficient
- **Cron job monitoring** — Vercel dashboard covers this
- **User deletion / subscription cancellation** — destructive actions stay in Stripe / direct DB
- **Message deletion** — messages kept for reference; archiving added later if needed
- **Message pagination** — contact volume too low to justify; add later if needed
