# Copy Audit & Rewrite — Summary

## Overview

Full audit and rewrite of all website copy across legal pages, marketing pages, and content articles. 44 pages total (31 rewrites + 13 new).

---

## Changes by page

### Legal Pages (5)

| Page                         | Action  | Key changes                                                                                                                                                                                        |
| ---------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Terms of Service             | Rewrite | Expanded from 13 to 19 sections. Now covers both filings (accounts + CT600), adds consumer rights (14-day cooling-off), ADR disclosure, force majeure, E-Commerce Regulations, entity placeholders |
| Privacy Policy               | Rewrite | Per-activity lawful basis table, Companies House as data recipient, international transfer disclosure, 6-year filing record retention, full GDPR rights list, children's data statement            |
| Cookie Policy                | Rewrite | Explicit cookie name/duration tables, ICO guidance reference, consent mechanism description, openGraph metadata added                                                                              |
| Acceptable Use Policy        | **New** | Permitted use, prohibited activities, consequences, reporting mechanism                                                                                                                            |
| Refund & Cancellation Policy | **New** | 14-day cooling-off with consent waiver, post-cancellation data retention, HMRC 6-year filing record retention                                                                                      |

### Marketing Pages (8)

| Page                     | Action  | Key changes                                                                                                                       |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Homepage                 | Rewrite | New H1 ("Dormant company filing, sorted"), CATO closure context, dormant-only scope statement, FAQ schema markup added, meta tags |
| About                    | Rewrite | "I" → "we" voice, founding story reframed as "Our founder built...", both filings + reminders mentioned, internal links           |
| How It Works             | Rewrite | Tightened steps, clarified independent filings, HowToJsonLd structured data component added                                       |
| Pricing                  | Rewrite | Prices verified (£19/£39/£49), comparison table updated, billing FAQ aligned with new terms + 14-day cooling-off                  |
| FAQ                      | Rewrite | All Q&As audited, CH auth code question added, credential handling split into two distinct answers, reminder schedule added       |
| Security                 | Rewrite | CH auth code handling added alongside HMRC credentials, both described separately, Companies House added to third-party list      |
| Contact                  | Rewrite | Added query type context, separate privacy@dormantfile.co.uk for data protection                                                  |
| Guides & Answers indexes | Rewrite | Sharpened intro text and meta descriptions                                                                                        |

### Answer Articles (16)

| Article                                                 | Action  |
| ------------------------------------------------------- | ------- |
| What are Companies House late filing penalties          | Rewrite |
| What are dormant company accounts (AA02)                | Rewrite |
| What does "dormant" mean under the Companies Act        | Rewrite |
| What is a Companies House authentication code           | Rewrite |
| What is a confirmation statement (CS01)                 | Rewrite |
| What is a CT600                                         | Rewrite |
| What is a UTR number                                    | Rewrite |
| What is an accounting reference date                    | Rewrite |
| What is the difference between dissolved and dormant    | Rewrite |
| What is the HMRC Gateway                                | Rewrite |
| What is Making Tax Digital (MTD)                        | **New** |
| What is a SIC code                                      | **New** |
| What is a registered office address                     | **New** |
| What are persons with significant control (PSC)         | **New** |
| What is the Companies House WebFiling service           | **New** |
| What does "no significant accounting transactions" mean | **New** |

### Guide Articles (15)

| Article                                                      | Action  |
| ------------------------------------------------------------ | ------- |
| CATO has closed — what are your options now                  | Rewrite |
| How much does it cost to file dormant accounts               | Rewrite |
| Do I need to file a CT600 for a dormant company              | Rewrite |
| Dormant company filing deadlines explained                   | Rewrite |
| First year filing for a new dormant company                  | Rewrite |
| How to check if your company is dormant                      | Rewrite |
| How to close a dormant company                               | Rewrite |
| How to file dormant company accounts with Companies House    | Rewrite |
| How to file a nil CT600 tax return with HMRC                 | Rewrite |
| What happens if you don't file your dormant company accounts | Rewrite |
| Do I need an accountant for a dormant company                | **New** |
| How to reactivate a dormant company                          | **New** |
| Dormant company vs non-trading company                       | **New** |
| What happens if Companies House strikes off your company     | **New** |
| Annual accounts vs confirmation statement                    | **New** |

### Structural Changes

| Change                                | Files                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| HowToJsonLd structured data component | `src/lib/content/json-ld.tsx`                                                        |
| FAQPageJsonLd added to homepage       | `src/app/page.tsx`                                                                   |
| New route shells                      | `src/app/(marketing)/acceptable-use/page.tsx`, `src/app/(marketing)/refund/page.tsx` |
| Footer links updated                  | `src/components/marketing/MarketingFooter.tsx`                                       |
| Sitemap updated                       | `src/app/sitemap.ts` (added /cookies, /acceptable-use, /refund)                      |

---

## Consistency verification

All checks passed:

- **Pricing**: £19/£39/£49 consistent across all 44 pages
- **CATO closure**: Past tense everywhere ("closed on 31 March 2026")
- **Credential handling**: HMRC and CH credentials described separately in every relevant page
- **Internal links**: All links resolve to valid routes
- **Dormant-only scope**: Present on homepage, about, FAQ, terms, and all service description pages

---

## Key legal decisions

| Decision                                          | Rationale                                                                                                                                                |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14-day cooling-off with consent waiver            | Consumer Contracts Regulations 2013 requires this. Waiver activated when filing is submitted within the period, with prior explicit consent.             |
| Liability capped at 12 months' fees               | Standard SaaS practice. Excludes indirect/consequential loss. Statutory carve-outs for death/personal injury and fraud.                                  |
| 6-year filing record retention                    | HMRC expects companies to keep records for 6 years. Filing records retained longer than account data.                                                    |
| PECR consent + legitimate interests for analytics | Cookie placement requires PECR consent (banner). Data processing uses legitimate interests to avoid impractical erasure obligations.                     |
| ADR disclosure placeholder                        | Required by Alternative Dispute Resolution for Consumer Disputes Regulations 2015. Decision on whether to participate in ADR scheme left as placeholder. |
| Entity placeholders throughout                    | No legal entity established pre-launch. All legal pages use `[TRADING NAME]`, `[REGISTERED ADDRESS]`, `[ICO REGISTRATION NUMBER]` placeholders.          |

---

## Solicitor review flags

The following areas should receive professional legal review before launch:

1. **Limitation of liability clause** — enforceability of the 12-month fee cap and exclusion of indirect damages
2. **Consumer cooling-off waiver mechanism** — the consent-to-begin-immediately + loss-of-cancellation-right mechanism when a filing is submitted
3. **HMRC agent registration** — whether operating the service (particularly the Agent tier filing on behalf of clients) constitutes "tax agent" activity requiring HMRC agent registration
4. **ADR participation** — decide whether to participate in an ADR scheme and name the entity in the terms
5. **ICO registration timing** — whether ICO registration is required before beta testing with real user data (likely yes)

---

## Pre-launch requirements

| Requirement                                | Status         | Notes                                                                       |
| ------------------------------------------ | -------------- | --------------------------------------------------------------------------- |
| Establish legal entity                     | Not done       | Limited company or sole trader registration                                 |
| Register with ICO                          | Not done       | £40/year, required before processing personal data                          |
| Fill `[PLACEHOLDER]` values in legal pages | Not done       | Trading name, registered address, ICO reg number, VAT number                |
| Decide ADR participation                   | Not done       | Update terms section 15                                                     |
| Solicitor review                           | Not done       | See flags above                                                             |
| VAT registration                           | Future         | Required when revenue exceeds £90,000 threshold — prices must then show VAT |
| E-Commerce Regulations compliance          | Partially done | Template in terms, needs entity details filled                              |
