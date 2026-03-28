# DormantFile Copy Audit & Rewrite — Design Spec

## Overview

Full audit and rewrite of all website copy across two workstreams: legal pages and marketing pages. The codebase is the source of truth for product capabilities. All existing copy is treated as untrusted and will be verified against the actual code before being published.

## Context

**Product:** DormantFile — a SaaS tool for dormant UK limited companies that:
1. Sends email reminders for Companies House and HMRC filing deadlines
2. Submits annual dormant accounts (AA02) to Companies House via their software filing API
3. Submits nil CT600 Corporation Tax returns to HMRC via their GovTalk API

**Critical constraint:** The tool is exclusively for companies reporting nil/zero balances. It does not handle companies with any financial activity, assets, liabilities, or taxable income.

**Target users:** Directors of dormant/non-trading UK limited companies who need to meet statutory filing obligations.

**Pre-launch status:** No legal entity established yet. Legal pages will use placeholders for entity name, registered address, and ICO registration number.

## Decisions

### Brand voice
- Professional small company voice: "we" not "I"
- Plain English, direct, no corporate waffle
- Calm and confident — no doom-and-gloom urgency
- Honest about scope and limitations

### Pricing (confirmed, consistent everywhere)
- Basic: £19/year, 1 company
- Multiple: £39/year, up to 10 companies
- Agent: £49/year, up to 100 companies

### Approach order
Legal pages first (they define the guardrails), then marketing pages, then content articles.

## Workstream 1: Legal Pages

### 1.1 Terms of Service (rewrite)

**Current problems:**
- Only mentions CT600/HMRC — omits Companies House accounts filing entirely
- No consumer rights provisions (Consumer Rights Act 2015, Consumer Contracts Regulations 2013)
- No cooling-off period disclosure
- No named contracting entity
- No data controller reference

**Rewrite scope:**
- Cover both filings: accounts (Companies House) and CT600 (HMRC)
- Cover both credential types: HMRC Gateway credentials and Companies House authentication codes
- Add 14-day cooling-off period with explicit consent waiver if filing submitted within that period
- Add limitation of liability: capped at 12 months' fees, excluding indirect/consequential loss, with statutory carve-outs (death/personal injury, fraud)
- Add "not professional advice" disclaimer
- Add governing law (England and Wales)
- Add entity placeholders: `[TRADING NAME]`, `[REGISTERED ADDRESS]`
- Add "entire agreement" clause
- Add force majeure covering HMRC/Companies House outages

**Solicitor review flags:**
- Limitation of liability enforceability
- Consumer cooling-off waiver mechanism
- Whether service constitutes "tax agent" activity requiring HMRC agent registration

### 1.2 Privacy Policy (rewrite)

**Current problems:**
- Data controller named as "DormantFile" with no legal entity details
- Missing Companies House as data recipient
- Lawful basis section too general — not mapped per processing activity
- No international transfer disclosure (Stripe/Resend may process outside UK)
- No DPO or specific contact for data rights
- Missing right to withdraw consent
- Missing automated decision-making disclosure (even if "we don't do this")

**Rewrite scope:**
- Data controller with entity placeholder
- Per-activity lawful basis table (account creation = contract, reminders = legitimate interests, analytics = consent)
- Add Companies House as data recipient (authentication code + company details)
- Add international transfer section (Stripe US, Resend US — covered by adequacy decisions or SCCs)
- Add explicit data retention periods per data type
- Add automated decision-making statement (none)
- Add all data subject rights including right to withdraw consent and right to complain to ICO
- Add children's data statement (service not directed at under-18s)

**Solicitor review flags:**
- Whether ICO registration needed before beta testing with real users
- International transfer mechanisms for US-based processors

### 1.3 Cookie Policy (rewrite)

**Current problems:**
- Mostly sound but missing explicit cookie names/durations for essential cookies
- No reference to consent mechanism specifics
- Missing ICO guidance reference

**Rewrite scope:**
- Table format: cookie name, purpose, duration, type (essential/analytics)
- Describe consent mechanism (banner with accept/decline)
- Reference ICO cookie guidance
- Clarify local storage usage for consent preference

### 1.4 Acceptable Use Policy (create new)

**Scope:**
- Prohibited uses: fraudulent filings, filing for non-dormant companies, unauthorized access, reverse engineering
- Account suspension/termination grounds
- Reporting mechanism
- Short, focused page

### 1.5 Refund & Cancellation Policy (create new)

**Scope:**
- 14-day cooling-off period (Consumer Contracts Regulations 2013)
- Explicit consent to begin service immediately (with acknowledgment that this may affect cancellation rights)
- If filing submitted within 14 days: reasonable deduction or full waiver of refund right (with prior consent)
- After 14 days: no refund for partial periods
- How to cancel: billing portal
- What happens to data post-cancellation: retained 12 months then deleted (consistent with privacy policy)
- How to request earlier deletion

## Workstream 2: Marketing Pages

### 2.1 Homepage (rewrite)

**File:** `src/app/page.tsx`

**Changes:**
- Stronger H1 with target keywords (dormant company filing)
- Surface CATO closure angle in hero or problem statement
- Add dormant-only scope statement prominently
- Sharpen all section copy for voice consistency
- Ensure FAQ section has FAQ schema markup
- Add meta title and description
- Verify all pricing matches confirmed figures
- Ensure internal links to how-it-works, pricing, security, guides

**Target keywords:** dormant company filing, file dormant accounts online, nil CT600 return, dormant company accounts

### 2.2 About (rewrite)

**File:** `content/pages/about.mdx`

**Changes:**
- Shift from "I" to "we" voice
- Keep founding story but frame as company origin
- Add mention of reminder functionality
- Ensure both filings described accurately
- Add internal links to security, pricing, how-it-works

### 2.3 How It Works (rewrite)

**File:** `content/pages/how-it-works.mdx`

**Changes:**
- Tighten step descriptions
- Clarify accounts and CT600 are independent filings
- Add HowTo schema structured data (new `HowToJsonLd` component)
- Verify reminder intervals match codebase (90, 30, 14, 7, 3, 1 days)

### 2.4 Pricing (rewrite)

**File:** `content/pages/pricing.mdx`

**Changes:**
- Verify all prices against codebase
- Sharpen comparison table
- No VAT mention (not VAT registered pre-launch)
- Ensure billing FAQ answers are consistent with new terms

### 2.5 FAQ (rewrite)

**File:** `content/pages/faq.mdx`

**Changes:**
- Audit every Q&A against codebase and rewritten terms
- Tighten wording for voice consistency
- Ensure FAQ schema already working (it is via `FAQPageJsonLd`)
- Add/remove questions as needed for accuracy

### 2.6 Security (rewrite)

**File:** `content/pages/security.mdx`

**Changes:**
- Add Companies House authentication code handling (currently HMRC-only)
- Verify all security claims against codebase
- Ensure third-party services list is complete and accurate

### 2.7 Contact (rewrite)

**File:** `content/pages/contact.mdx`

**Changes:**
- Minor tightening — add context about what to contact about
- Ensure email address consistent

### 2.8 Guides & Answers index pages

**Changes:**
- Sharpen intro text and meta descriptions
- No structural changes

## Workstream 3: Content Articles

### 3.1 Existing articles (20 rewrites)

**10 Answers and 10 Guides** — each will be:
- Accuracy-audited against codebase and current UK legislation
- Rewritten for consistent "we" voice
- Improved internal linking
- SEO-tightened (meta title, description, keywords)
- Cross-references verified

### 3.2 New Answers (6)

| Slug | Title | Keyword target | Category |
|------|-------|---------------|----------|
| what-is-making-tax-digital | What is Making Tax Digital (MTD)? | making tax digital dormant company | filing |
| what-is-a-sic-code | What is a SIC code? | dormant company SIC code 99999 | admin |
| what-is-a-registered-office-address | What is a registered office address? | registered office address | admin |
| what-are-persons-with-significant-control | What are persons with significant control (PSC)? | PSC confirmation statement | admin |
| what-is-companies-house-webfiling | What is the Companies House WebFiling service? | Companies House WebFiling | alternatives |
| what-does-no-significant-accounting-transactions-mean | What does "no significant accounting transactions" mean? | significant accounting transactions dormant | eligibility |

### 3.3 New Guides (5)

| Slug | Title | Keyword target | Category |
|------|-------|---------------|----------|
| do-i-need-an-accountant-dormant-company | Do I need an accountant for a dormant company? | accountant dormant company | costs |
| how-to-reactivate-dormant-company | How to reactivate a dormant company | reactivate dormant company | admin |
| dormant-vs-non-trading-company | Dormant company vs non-trading company — what's the difference? | dormant vs non trading company | eligibility |
| what-happens-if-companies-house-strikes-off-company | What happens if Companies House strikes off your company? | company struck off Companies House | admin |
| annual-accounts-vs-confirmation-statement | Annual accounts vs confirmation statement — what's the difference? | annual accounts vs confirmation statement | getting-started |

## Cross-Cutting Concerns

### Internal linking
- Answers → parent guide ("Read the full guide: ...")
- Guides → relevant answers for definitions
- Both → product pages (how-it-works, pricing, security) where natural
- Legal pages cross-reference each other
- No forced link dumps

### Meta tags
- `metaTitle`: under 60 chars, format `"[Topic] | DormantFile"`
- `description`: under 155 chars, includes target keyword

### Structured data
- Homepage: Organization schema (exists)
- FAQ: FAQPage schema (exists)
- How-it-works: HowTo schema (new component)
- Guides/Answers: Article schema (exists)
- All pages: BreadcrumbList schema (exists)

### Consistency rules
- Prices stated identically everywhere
- Both filings always described together
- Dormant-only caveat on every service description page
- CATO closure in past tense
- "used once and never stored" for credentials
- Reminder intervals: 90, 30, 14, 7, 3, 1 days
- Filing time: "under 2 minutes"

### New code
- 1 new component: `HowToJsonLd` in `src/lib/content/json-ld.tsx`
- New MDX files for new content articles
- New MDX files for new legal pages (acceptable use, refund/cancellation)
- Route shells for new legal pages if not already covered by the existing page system

### Out of scope
- Application code changes
- Visual design changes
- Content system architecture changes
- Blog or CMS creation

## Deliverables

| Category | Existing rewrites | New pages | Total |
|----------|------------------|-----------|-------|
| Legal pages | 3 | 2 | 5 |
| Marketing pages | 8 | 0 | 8 |
| Answers | 10 | 6 | 16 |
| Guides | 10 | 5 | 15 |
| **Total** | **31** | **13** | **44** |

Plus:
- HowToJsonLd structured data component
- Summary document: all changes, rationale, solicitor review flags
- One commit per logical group

## Pre-Launch Requirements (flagged for action)

1. Establish a legal entity (limited company or register as sole trader)
2. Register with ICO (£40/year)
3. Fill all `[PLACEHOLDER]` values in legal pages
4. Professional solicitor review of: limitation of liability, cooling-off waiver, HMRC agent registration question
