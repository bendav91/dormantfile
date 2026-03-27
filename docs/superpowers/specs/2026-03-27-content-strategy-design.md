# Content Strategy: SEO + Trust Layer for DormantFile

**Date:** 2026-03-27
**Status:** Approved
**Audience:** Individual dormant company directors (UK)
**Content management:** MDX files in the repo, rendered at build time

---

## Overview

DormantFile currently has a landing page, privacy policy, and terms of service. No other public-facing content exists. No blog, no guides, no sitemap, no structured data.

This spec defines a comprehensive content layer using a hybrid approach:
- **Trust layer** — 6 pages that build confidence and convert visitors
- **SEO layer** — 20 pages (10 guides + 10 answers) that attract organic traffic
- **SEO infrastructure** — sitemap, robots.txt, structured data, Open Graph tags

The trust layer addresses the #1 conversion blocker: directors don't trust an unknown site with their HMRC credentials. The SEO layer targets the search terms confused directors type after the CATO portal closure.

---

## Technical Infrastructure

### MDX Setup

Add `next-mdx-remote` for rendering MDX files at build time.

Content directory at the **project root** (alongside `src/`, not inside it). MDX files are read via `fs` with `path.join(process.cwd(), 'content')`:

```
/content/
  guides/          # Long-form SEO articles (800-1500 words)
  answers/         # Short-form "what is X" pages (300-500 words)
  pages/           # Trust layer pages (about, security, etc.)
```

Slugs are derived from the MDX **filename** (e.g. `how-to-file-dormant-accounts.mdx` → slug `how-to-file-dormant-accounts`). No slug field in frontmatter.

Each MDX file has frontmatter:

```yaml
---
title: "Page title"
description: "Meta description for search engines"
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing" | "deadlines" | "getting-started" | "costs" | "eligibility" | "alternatives" | "admin"
keywords: ["keyword1", "keyword2"]
---
```

Category values:
- **filing** — how to file specific returns
- **deadlines** — when things are due, penalty info
- **getting-started** — first-time and new company guidance
- **costs** — pricing comparisons, what things cost
- **eligibility** — dormancy definitions, whether you qualify
- **alternatives** — CATO replacement options, comparisons
- **admin** — closing companies, general company admin

### Routing

- `/guides/[slug]` — dynamic route rendering guide MDX files
- `/answers/[slug]` — dynamic route rendering answer MDX files
- `/about`, `/security`, `/how-it-works`, `/pricing`, `/faq`, `/contact` — dedicated routes for trust pages (can use MDX from `/content/pages/` or be TSX components as appropriate)
- `/guides` — index page listing all guides by category
- `/answers` — index page listing all answers alphabetically

### Shared Content Layout

Currently, the landing page, privacy page, and terms page each inline their own nav and footer. This work introduces a shared layout via a Next.js route group.

**Route group: `src/app/(marketing)/`**

All public content pages live under a `(marketing)` route group with a shared `layout.tsx` that provides:
- Site navigation (extracted from the current landing page nav into a shared `<MarketingNav>` component)
- Readable max-width container (~720px) for content
- Breadcrumbs (e.g. Home > Guides > How to file dormant company accounts)
- Consistent CTA block at the bottom of every page
- Site footer (extracted into a shared `<MarketingFooter>` component)

**Migration:** `/privacy` and `/terms` move into the `(marketing)` group so they share the same nav/footer. The landing page (`/`) stays in `src/app/page.tsx` with its own layout since it has a distinct full-width design.

**Related content:** Guides and answers show a "Related articles" section **below the content** (single-column, not sidebar). This keeps the layout simple and works well on mobile. Each page's MDX frontmatter doesn't need to specify related links — they're auto-derived from shared categories.

**Shared components created:**
- `src/components/marketing/MarketingNav.tsx` — nav bar with Resources dropdown
- `src/components/marketing/MarketingFooter.tsx` — footer with site links
- `src/components/marketing/Breadcrumbs.tsx` — breadcrumb trail
- `src/components/marketing/ContentCTA.tsx` — the bottom CTA block
- `src/components/marketing/RelatedContent.tsx` — related articles section

---

## Trust Layer (6 pages)

### 1. `/about` — Who's behind DormantFile

- Why DormantFile was built (CATO closed, founder had dormant companies, saw the gap)
- Personal, honest tone — solo founder, UK-based, runs real companies
- The mission: make dormant filing affordable and painless
- Tone: "I built this because I needed it."

### 2. `/security` — How we handle your data

- Dedicated page expanding the "credentials never stored" promise
- Explains the submission flow: HMRC Gateway credentials used once via API, then discarded from memory
- TLS encryption in transit, bcrypt password hashing, no tracking cookies
- Links to privacy policy for full legal detail
- Exists to kill the #1 objection: "Can I trust this site with my HMRC login?"

### 3. `/how-it-works` — Detailed filing walkthrough

- Step-by-step with screenshots/illustrations of the actual filing flow
- Sign up → add company → get deadline reminders → file → receive confirmation
- Separate sections for "filing annual accounts" vs "filing CT600"
- Emphasis on speed (under 2 minutes)

### 4. `/pricing` — Standalone pricing page

- Same three tiers as landing page, with more detail
- Comparison table: DormantFile vs hiring an accountant vs doing it manually vs other software
- "What's included" breakdown per tier
- Billing-specific FAQ: refunds, cancellation, upgrade/downgrade

### 5. `/faq` — Expanded standalone FAQ

Expand from current 5 questions to 15-20, grouped into categories:

- **Filing:** What filings does DormantFile handle? What if my company isn't registered for Corporation Tax? Can I use this if my company is trading? What happens after I file? How long does filing take? What do I need before I start? What accounting periods can I file for?
- **Security:** Is my data secure? Are my HMRC credentials stored? What data do you collect?
- **Pricing:** How much does it cost? Is there a free trial? Can I cancel anytime? What happens if my subscription lapses?
- **Account:** Can I manage multiple companies? How do I add or remove a company? How do I delete my account?

Each answer links to the relevant guide or trust page for deeper reading. Page uses JSON-LD `FAQPage` schema for Google rich results.

### 6. `/contact` — Contact page

- Email address (hello@dormantfile.co.uk)
- Optional: simple contact form via Resend
- Expected response time
- Small page but a missing contact page is a red flag for cautious users

---

## SEO Layer — Guides (10 articles, 800-1500 words each)

Long-form articles targeting the search terms directors are typing. Each answers a specific question and funnels toward sign-up.

### Guide 1: "How to file dormant company accounts with Companies House"
- **Category:** filing
- **Target keyword:** file dormant company accounts
- Step-by-step walkthrough of what's required
- AA02 form, legal definition of dormant, deadlines, penalties
- CTA: "Or let DormantFile do it for you in 2 minutes."

### Guide 2: "How to file a nil CT600 tax return with HMRC"
- **Category:** filing
- **Target keyword:** nil CT600 tax return
- What a nil return is, who needs to file one, old CATO process vs now
- UTR, HMRC Gateway, accounting periods

### Guide 3: "CATO has closed — what are your options now?"
- **Category:** alternatives
- **Target keyword:** CATO closed / HMRC free filing closed
- What CATO was, why it closed (31 March 2026), what alternatives exist
- Honest comparison: accountant, general software, DormantFile

### Guide 4: "What happens if you don't file your dormant company accounts"
- **Category:** deadlines
- **Target keyword:** late filing penalties dormant company
- Companies House penalty scale (£150 → £1,500), HMRC surcharges
- Risk of striking off, director consequences

### Guide 5: "Do I need to file a CT600 for a dormant company?"
- **Category:** filing
- **Target keyword:** dormant company CT600
- Not every dormant company is registered for Corporation Tax
- Decision tree: registered for CT? → yes = CT600, no = accounts only
- Links to Guide 1 and Guide 2

### Guide 6: "How to check if your company is dormant"
- **Category:** eligibility
- **Target keyword:** is my company dormant
- Dormancy under Companies Act 2006 vs HMRC's definition (they differ)
- Common scenarios: holding company, formed but never traded

### Guide 7: "Dormant company filing deadlines explained"
- **Category:** deadlines
- **Target keyword:** dormant company filing deadline
- Accounting reference date, 9-month rule (accounts), 12-month rule (CT600)
- First year after incorporation vs subsequent years

### Guide 8: "How much does it cost to file dormant company accounts?"
- **Category:** costs
- **Target keyword:** cost to file dormant company accounts
- Comparison: accountant fees (£50-£150+), general software (£100+/yr), DormantFile (£19/yr)
- Honest, not salesy — acknowledges when an accountant might be the right choice

### Guide 9: "How to close a dormant company (and when to keep it open)"
- **Category:** admin
- **Target keyword:** close dormant company
- DS01 striking off process, costs, timelines
- Reasons to keep it open: future use, protecting company name, holding assets
- "If you're keeping it, you still need to file."

### Guide 10: "First year filing for a new dormant company"
- **Category:** getting-started
- **Target keyword:** new company first filing
- Newly incorporated companies: confirmation statement, first accounts, first CT600
- Timeline from incorporation to first filing deadlines

---

## SEO Layer — Answers (10 pages, 300-500 words each)

Short-form pages targeting long-tail "what is" searches. Each captures a specific query and links to the relevant guide.

Format for every answer page:
1. Plain English definition (no jargon explaining jargon)
2. Why it matters to a dormant company director
3. What you need to do about it
4. Link to the relevant guide
5. CTA block at the bottom

### Answer pages:

1. **"What is a CT600?"** → links to Guide 2
2. **"What is a UTR number?"** → links to Guide 2
3. **"What is an accounting reference date?"** → links to Guide 7
4. **"What is a Companies House authentication code?"** → links to Guide 1
5. **"What are dormant company accounts (AA02)?"** → links to Guide 1
6. **"What is the HMRC Gateway?"** → links to Guide 2
7. **"What is a confirmation statement (CS01)?"** → links to Guide 10
8. **"What are Companies House late filing penalties?"** → links to Guide 4
9. **"What does 'dormant' mean under the Companies Act?"** → links to Guide 6
10. **"What is the difference between dissolved and dormant?"** → links to Guide 9

---

## Cross-Linking & CTA Strategy

### Internal linking rules

- Every guide links to 2-3 related guides and 1-2 answer pages
- Every answer page links to its parent guide
- Every content page links to at least one trust page (security, how-it-works, or pricing)
- Every content page ends with a consistent CTA block

### CTA block (consistent across all content pages)

```
Ready to file your dormant company returns?
Set up in minutes. File in seconds. Done for the year.
[Get started →]
```

### Example visitor flow

1. Director Googles "what is a CT600"
2. Lands on `/answers/what-is-a-ct600`
3. Clicks through to `/guides/how-to-file-nil-ct600`
4. Reads guide, clicks "how we handle your credentials"
5. Reads `/security` page, feels confident
6. Clicks "Get started" → `/register`

### Navigation updates

The current landing page nav has only "Sign in" and "Get started". The marketing layout nav expands this:

**Top-level nav links (all content pages):**
- Pricing (`/pricing`)
- Resources (dropdown containing: Guides, FAQ, Security)
- Sign in
- "Get started" CTA button

**Footer links (all content pages including landing):**
- About, Security, FAQ, Contact, Privacy, Terms

The **landing page** keeps its own nav/layout but the footer is updated to include the new pages. The landing page "How it works" section should link to `/how-it-works` ("See the full walkthrough →") so the two stay connected.

- `/guides` index page listing all guides grouped by category
- `/answers` index page listing all answers alphabetically
- Breadcrumbs on every content page for navigation and SEO

---

## SEO Technical Infrastructure

### Sitemap (`src/app/sitemap.ts`)

Auto-generated from:
- Static routes (home, about, security, how-it-works, pricing, faq, contact, privacy, terms)
- All MDX guide files
- All MDX answer files

### Robots (`src/app/robots.ts`)

- Allow all crawlers
- Reference sitemap URL

### Open Graph metadata (every page)

- `og:title` — page title
- `og:description` — page meta description
- `og:type` — "article" for guides/answers, "website" for trust pages
- `og:url` — canonical URL
- `og:site_name` — "DormantFile"

### JSON-LD structured data

- **Homepage:** `Organization` schema (name, url, logo, contact)
- **FAQ page:** `FAQPage` schema (enables Google FAQ rich results)
- **Each guide:** `Article` schema (headline, datePublished, dateModified, author)
- **All content pages:** `BreadcrumbList` schema

### Canonical URLs

Every page sets a canonical URL to prevent duplicate content issues.

### Root metadata update

Current: "DormantFile - Nil CT600 Filing Made Simple"
Updated: "DormantFile - Dormant Company Filing Made Simple" (reflects the dual accounts + CT600 service)

---

## Page Summary

| Layer | Count | Pages |
|-------|-------|-------|
| Trust | 6 | `/about`, `/security`, `/how-it-works`, `/pricing`, `/faq`, `/contact` |
| Guides | 10 | 10 long-form articles at `/guides/[slug]` |
| Answers | 10 | 10 short-form pages at `/answers/[slug]` |
| Index | 2 | `/guides` index, `/answers` index |
| SEO infra | — | Sitemap, robots.txt, Open Graph, JSON-LD, canonical URLs |
| **Total** | **28 content pages + SEO infrastructure** |

---

## Out of Scope

- Blog with chronological posts (not needed yet — guides are evergreen)
- CMS integration (MDX in repo is sufficient for solo founder)
- Analytics integration (separate concern)
- Accountant-targeted content (future phase)
- Social media / link building strategy (separate concern)
- Image/illustration creation (placeholder or simple diagrams for now)
