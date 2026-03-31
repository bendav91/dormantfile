# Feature Surfacing — Landing Page + /features Page

## Context

DormantFile has significant capabilities that aren't visible to potential customers: automatic gap detection from incorporation, multi-tier deadline intelligence with penalty amounts, daily Companies House resync, external filing detection, audit trail storage, and portfolio-level management. The current marketing focuses tightly on "file in two minutes for £19/yr" which converts the acute-pain visitor but undersells the product's depth.

**Goal:** Surface these capabilities to (a) convert more existing visitors by building trust and (b) hint at use cases beyond single-company filing — without a major marketing overhaul.

**Approach:** Three changes — a compact "behind the scenes" section on the landing page, updated pricing feature lists, and a new `/features` page.

---

## 1. Landing Page — "Behind the scenes" section

**Position:** Between the "Three steps. Under two minutes." timeline section and the "See it in action" video explainer section.

**Layout:** Section heading + 3 items in a horizontal grid (stacks on mobile). Each item: icon, heading, one-liner description. Matches existing section styling (same max-width, font sizes, spacing patterns as "How it works").

### Items

| # | Heading | Description | Icon |
|---|---------|-------------|------|
| 1 | Filing history from day one | We check Companies House for every unfiled period since your company was incorporated. Nothing slips through. | `History` or `Search` |
| 2 | Deadline intelligence | Reminders at 90, 30, 14, 7, 3, and 1 day before each filing is due — with penalty amounts so you know the stakes. | `Bell` |
| 3 | Keeps itself current | Your company data is synced against Companies House daily. Periods filed elsewhere are detected and marked automatically. | `RefreshCw` |

**Link at bottom:** "See all features →" linking to `/features`.

### Section heading

- **H2:** "More than a filing form"
- **Subheading:** "Here's what's working behind the scenes."

---

## 2. Pricing Section — Updated feature lists

Update the feature bullet points in the landing page pricing cards to be more specific about what the product actually does. Keep the same visual structure (CheckCircle + text).

### Basic (£19/yr)

Current:
- Annual accounts to Companies House
- Nil CT600 return to HMRC
- File any outstanding period
- Email deadline reminders
- Direct submission via official APIs

Updated:
- Annual accounts to Companies House
- Nil CT600 return to HMRC
- Automatic gap detection from incorporation
- Deadline reminders with penalty warnings
- Direct submission via official APIs

**Changes:** "File any outstanding period" → "Automatic gap detection from incorporation" (more specific, surfaces the smart bit). "Email deadline reminders" → "Deadline reminders with penalty warnings" (adds the penalty detail).

### Multiple (£39/yr)

Current:
- Accounts + CT600 for up to 10 companies
- One dashboard — all companies at a glance
- File any outstanding period per company
- Email deadline reminders for every company
- Direct submission via official APIs

Updated:
- Accounts + CT600 for up to 10 companies
- Portfolio dashboard with filtering and search
- Automatic gap detection per company
- Deadline reminders with penalty warnings
- All companies synced daily with Companies House

**Changes:** Dashboard description more specific. Gap detection replaces "file any outstanding period". Daily sync replaces generic API mention.

### Agent (£49/yr)

Current:
- Accounts + CT600 for up to 100 companies
- File as agent on behalf of your clients
- One dashboard — all clients at a glance
- File any outstanding period per company
- Email deadline reminders for every company

Updated:
- Accounts + CT600 for up to 100 companies
- File as agent on behalf of your clients
- Portfolio dashboard with filtering and search
- Automatic gap detection per company
- Deadline reminders across all client companies

**Changes:** Agent wording kept simple (credentials are HMRC-only, not both APIs, so don't overstate). Dashboard description more specific. Gap detection replaces generic outstanding period text.

### Also update the PlanPicker component

The `src/components/plan-picker.tsx` has its own feature lists used on the `/choose-plan` page. Update to match, adapted to the PlanPicker's "Everything in X" progressive disclosure pattern:

**Basic:**
- Both filings — accounts and CT600
- Automatic gap detection from incorporation
- Deadline reminders with penalty warnings
- Filing confirmation receipt

**Multiple:**
- Everything in Basic
- File for up to 10 dormant companies
- Portfolio dashboard with filtering and search
- All companies synced daily with Companies House

**Agent:**
- Everything in Multiple
- File for up to 100 dormant companies
- File as agent on behalf of your clients
- Automatic gap detection per company

---

## 3. New `/features` Page

**Route:** `src/app/(marketing)/features/page.tsx` — lives inside the `(marketing)` layout which provides consistent nav/footer and a max-width container. This page is a single-column text-heavy page (like `/about` or `/security`), not a full-bleed section-based page like the landing page. The marketing layout's container is appropriate here.

**Nav:** Add "Features" as the second top-level link in `MARKETING_CONFIG`, after "How it works" and before "Pricing".

**Link from landing page:** "See all features →" in the new behind-the-scenes section.

### Page structure

**Hero area:**
- H1: "Everything DormantFile does for you"
- Subheading: "Purpose-built for dormant companies. Here's what's under the hood."

**5 feature groups**, each with a heading and 3-4 items. Each item: icon + heading + 2-3 sentence description.

#### Group 1: Smart setup
- **Companies House lookup** — Enter your company number and we pull your name, incorporation date, accounting reference date, registered address, and SIC codes automatically.
- **Automatic gap detection** — We fetch your full Companies House filing history and calculate every unfiled period since incorporation. Years behind? You'll see exactly what needs filing.
- **Share capital extraction** — If your company has issued shares, we pull the amount from your latest confirmation statement. It's pre-filled — just confirm and move on.

#### Group 2: Filing
- **iXBRL document generation** — We generate the iXBRL accounts and tax computation documents required by Companies House and HMRC. You never see the XML — it's handled automatically.
- **Direct API submission** — Your filings go through the same official HMRC GovTalk and Companies House Software Filing APIs that Xero and FreeAgent use.
- **Real-time status tracking** — After submission, we poll HMRC and Companies House for your filing result. If it's accepted, you'll know within minutes. If there's an issue, you'll see exactly why.
- **Catch-up filing** — File any outstanding period, not just the current one. If you're years behind, work through them one at a time in a single sitting.

#### Group 3: Monitoring
- **Deadline intelligence** — Reminders at 90, 30, 14, 7, 3, and 1 day before each filing is due. Overdue alerts at 1, 7, 30, and 90+ days after. One consolidated email per day, penalty amounts included.
- **Daily Companies House sync** — Your company data is refreshed against Companies House every day. If your accounting reference date changes or a period is filed elsewhere, we detect it automatically.
- **External filing detection** — Filed a period through your accountant or another tool? We detect it in your Companies House filing history and mark it as done — no manual cleanup.
- **Period suppression** — Have a period you're handling separately? Suppress it so it stops appearing in reminders and your needs-attention list.

#### Group 4: Security and trust
- **Credentials never stored** — Your HMRC Government Gateway password is used once at submission and immediately discarded from memory. Never written to disk, never logged.
- **Filing audit trail** — Every response from HMRC and Companies House is stored against your filing record — correlation IDs, timestamps, and full response payloads. Yours to reference if you ever need proof.
- **Payments via Stripe** — Card details are handled entirely by Stripe. We never see or store your payment information.
- **14-day refund guarantee** — Full refund within 14 days if you haven't submitted a filing. No questions.

#### Group 5: Multi-company and agent filing
- **Portfolio dashboard** — All your companies in one view. Filter by needs-attention, recently filed, or issues. Search and sort as the list grows.
- **Consolidated reminders** — One email per day covering every company's upcoming and overdue deadlines. No email per company — just one summary.
- **Agent filing mode** (Agent plan) — File CT600 returns on behalf of clients using your own HMRC Government Gateway credentials. The submission declares you as agent — your clients don't need to share their login.
- **Scales to 100 companies** (Agent plan) — Manage up to 100 dormant companies from one account at 49p per company per year.

### Bottom CTA
Standard CTA block: "Get your dormant filings sorted." + pricing summary + "Get started" button.

---

## Files to modify

| File | Change |
|------|--------|
| `src/app/page.tsx` | Add "behind the scenes" 3-item section between "How it works" and video. Update pricing feature lists. Add "See all features →" link. |
| `src/components/plan-picker.tsx` | Update feature lists to match new pricing copy. |
| `src/app/(marketing)/features/page.tsx` | **New file.** Full features page. |
| `src/components/SiteNav.tsx` | Add "Features" link to marketing nav. |

---

## Verification

1. `npm run build` — ensure no build errors from new page/modified components
2. `npm run lint` — clean lint
3. Visual check: dev server → landing page → confirm new section appears between "How it works" and video
4. Visual check: landing page pricing → confirm updated feature lists
5. Visual check: `/features` page → confirm all 5 groups render correctly
6. Visual check: nav → confirm "Features" link appears and navigates correctly
7. Visual check: responsive — check mobile layout for new section and /features page
8. Click "See all features →" from landing page → confirm it navigates to `/features`
