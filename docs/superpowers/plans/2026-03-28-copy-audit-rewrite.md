# Copy Audit & Rewrite Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite all website copy (legal, marketing, content articles) to be legally accurate, SEO-optimised, and consistent — plus create 13 new content pages.

**Architecture:** MDX content files in `content/` drive all marketing/legal pages via Next.js route shells in `src/app/(marketing)/`. Each page has frontmatter for metadata and structured data. The homepage is a standalone TSX file. New legal pages need new route shells following the established pattern.

**Tech Stack:** Next.js 16, MDX (next-mdx-remote/rsc), gray-matter, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-28-copy-audit-rewrite-design.md`

---

## File Map

### Files to create

- `content/pages/acceptable-use.mdx` — new legal page
- `content/pages/refund.mdx` — new legal page
- `src/app/(marketing)/acceptable-use/page.tsx` — route shell for acceptable use
- `src/app/(marketing)/refund/page.tsx` — route shell for refund policy
- `content/answers/what-is-making-tax-digital.mdx` — new answer
- `content/answers/what-is-a-sic-code.mdx` — new answer
- `content/answers/what-is-a-registered-office-address.mdx` — new answer
- `content/answers/what-are-persons-with-significant-control.mdx` — new answer
- `content/answers/what-is-companies-house-webfiling.mdx` — new answer
- `content/answers/what-does-no-significant-accounting-transactions-mean.mdx` — new answer
- `content/guides/do-i-need-an-accountant-dormant-company.mdx` — new guide
- `content/guides/how-to-reactivate-dormant-company.mdx` — new guide
- `content/guides/dormant-vs-non-trading-company.mdx` — new guide
- `content/guides/what-happens-if-companies-house-strikes-off-company.mdx` — new guide
- `content/guides/annual-accounts-vs-confirmation-statement.mdx` — new guide
- `src/lib/content/json-ld.tsx` — add HowToJsonLd component (modify existing)

### Files to modify

- `content/pages/terms.mdx` — full rewrite
- `content/pages/privacy.mdx` — full rewrite
- `content/pages/cookies.mdx` — rewrite
- `content/pages/about.mdx` — rewrite
- `content/pages/how-it-works.mdx` — rewrite
- `content/pages/pricing.mdx` — rewrite
- `content/pages/faq.mdx` — rewrite
- `content/pages/security.mdx` — rewrite
- `content/pages/contact.mdx` — rewrite
- `src/app/page.tsx` — homepage rewrite
- `src/app/(marketing)/how-it-works/page.tsx` — add HowToJsonLd
- `src/components/marketing/MarketingFooter.tsx` — add acceptable-use and refund links
- `src/app/sitemap.ts` — add new pages
- All 10 existing answer MDX files — rewrite
- All 10 existing guide MDX files — rewrite

---

## Parallelism Notes

For agentic execution, these tasks can run in parallel within their phase:

- **Phase 1:** Tasks 1, 2, 3 in parallel. Tasks 4, 5 in parallel. Task 6 after 4+5 complete.
- **Phase 2:** Tasks 7, 8, 10, 11, 12, 13, 13.5 in parallel. Task 9 is independent but creates the HowToJsonLd component first.
- **Phase 3+4:** Tasks 14, 15 can run in parallel with each other. Each can be split into sub-batches of 5 files for subagent dispatch.
- **Phase 5:** Tasks 16, 17 in parallel.
- **Phase 6:** Task 18 after all prior phases. Task 19 after 18.

---

## Phase 1: Legal Pages

### Task 1: Terms of Service

**Files:**

- Modify: `content/pages/terms.mdx`

- [ ] **Step 1: Read current terms**

Read `content/pages/terms.mdx` in full. Note all gaps identified in the spec:

- CT600-only scope (must cover both filings)
- Missing Companies House auth code handling
- Missing consumer rights provisions
- Missing cooling-off period
- Missing ADR disclosure
- Missing entity placeholders

- [ ] **Step 2: Write the rewritten terms**

Replace the entire content of `content/pages/terms.mdx` with the rewritten terms. Requirements:

**Frontmatter:**

```yaml
---
title: "Terms of Service"
description: "Terms and conditions for using DormantFile, the dormant company filing service."
updatedAt: "2026-03-28"
breadcrumbs:
  - label: "Terms of Service"
showCTA: false
showUpdatedAt: true
openGraph:
  title: "Terms of Service | DormantFile"
  description: "Terms and conditions for using DormantFile."
  type: "website"
---
```

**Sections required (in order):**

1. **About the service** — covers BOTH filings (accounts to CH, CT600 to HMRC). States we are software, not an accountancy firm. States service is exclusively for genuinely dormant companies with nil balances.
2. **Eligibility** — must be a director/authorised officer of a UK limited company. Must confirm company was dormant. For CT600: must have valid Government Gateway account. For accounts: must have CH authentication code.
3. **Your account** — responsible for security, notify us of unauthorised use.
4. **How the service works** — describes both filing types:
   - Accounts: user provides CH auth code at point of filing, transmitted to CH, not stored in our database.
   - CT600: user provides HMRC Gateway credentials at point of filing, transmitted to HMRC over TLS, never written to database, discarded from server memory immediately after HMRC responds.
   - Key distinction: CH auth codes and HMRC Gateway credentials are handled differently — make this clear.
5. **Accuracy of information** — user responsible for all info provided (company name, registration number, UTR, accounting periods, auth codes).
6. **Subscription and payment** — annual subscription, prices on website, Stripe, auto-renewal, cancel anytime via billing portal, no refund for partial periods. Link to refund policy.
7. **Your right to cancel (Consumer Contracts Regulations 2013)** — 14-day cooling-off period from date of subscription. User may consent to service beginning immediately. If a filing is submitted within the 14-day period, the right to cancel is lost (with prior explicit consent). Reference the separate refund & cancellation policy.
8. **Not professional advice** — DormantFile is software, not an accountancy practice, tax adviser, or regulated financial services provider. We do not provide accounting, tax, or legal advice. Filing via the tool is on the user's own authority as a company director. If in doubt about dormancy status, consult a qualified accountant.
9. **Service availability** — aim for availability but no guarantee. Depends on HMRC and Companies House systems. Not liable for third-party downtime.
10. **Limitation of liability** — service provided "as is". Total liability capped at fees paid in preceding 12 months. Exclude indirect/consequential damages. Statutory carve-outs: nothing limits liability for death/personal injury from negligence, or fraud/fraudulent misrepresentation.
11. **Force majeure** — not liable for failure due to events beyond reasonable control including HMRC/CH outages, government policy changes, internet disruptions.
12. **Your responsibilities** — only use for dormant companies, no fraudulent filings, remain responsible for tax obligations, check filing acceptance.
13. **Termination** — we may suspend/terminate for breach. User may close account anytime.
14. **Complaints** — contact us at hello@dormantfile.co.uk. If dissatisfied with response, may escalate.
15. **Dispute resolution** — in accordance with Alternative Dispute Resolution for Consumer Disputes Regulations 2015, we are required to inform you that ADR is available. [State whether DormantFile participates in an ADR scheme or not — use placeholder if undecided: `[ADR DECISION PENDING — state whether you will use an ADR entity before launch]`]
16. **Changes to these terms** — notify by email or website notice. Continued use = acceptance.
17. **Electronic Commerce Regulations** — service provided by `[TRADING NAME]`, `[REGISTERED ADDRESS]`, contact: hello@dormantfile.co.uk. `[VAT NUMBER IF APPLICABLE]`.
18. **Governing law** — England and Wales.
19. **Contact** — hello@dormantfile.co.uk

**Style:** Plain English. Short paragraphs. No unnecessary legalese but precise where legally required. Professional "we/you" voice.

- [ ] **Step 3: Verify internal links**

Check that all links in the terms point to valid routes:

- `/refund` (will be created in Task 5)
- `/acceptable-use` (will be created in Task 4)
- `/privacy`
- `/cookies`
- `/security`
- `/contact`

- [ ] **Step 4: Commit**

```bash
git add content/pages/terms.mdx
git commit -m "legal: rewrite terms of service

Cover both filings (accounts + CT600), add consumer rights provisions,
cooling-off period, ADR disclosure, force majeure, entity placeholders,
and E-Commerce Regulations compliance."
```

---

### Task 2: Privacy Policy

**Files:**

- Modify: `content/pages/privacy.mdx`

- [ ] **Step 1: Read current privacy policy**

Read `content/pages/privacy.mdx` in full.

- [ ] **Step 2: Write the rewritten privacy policy**

Replace the entire content of `content/pages/privacy.mdx`.

**Frontmatter:**

```yaml
---
title: "Privacy Policy"
description: "How DormantFile collects, uses, and protects your personal data under UK GDPR."
updatedAt: "2026-03-28"
breadcrumbs:
  - label: "Privacy Policy"
showCTA: false
showUpdatedAt: true
openGraph:
  title: "Privacy Policy | DormantFile"
  description: "How DormantFile collects, uses, and protects your personal data."
  type: "website"
---
```

**Sections required:**

1. **Introduction** — commitment to protecting personal data. Applies to all users.
2. **Data controller** — `[TRADING NAME]`, `[REGISTERED ADDRESS]`. Contact: privacy@dormantfile.co.uk. `[ICO REGISTRATION NUMBER]`.
3. **What data we collect** — table format:
   - Account info: email, name, hashed password
   - Company details: name, registration number, UTR, accounting period dates
   - Filing records: submission timestamps, correlation IDs, response payloads, filing type (accounts/CT600)
   - Payment: Stripe customer ID (card details held by Stripe)
   - HMRC Gateway credentials: used at moment of filing only, transmitted to HMRC over TLS, never written to database
   - Companies House authentication code: entered at filing, transmitted to CH, not stored
4. **How we use your data and legal basis** — per-activity table:
   | Processing activity | Data used | Lawful basis |
   | Create/manage account | Email, password, name | Contract performance |
   | Submit filings | Company details, credentials | Contract performance |
   | Deadline reminders | Email, company details, deadlines | Legitimate interests |
   | Filing confirmations | Email, filing records | Contract performance |
   | Process payments | Email, Stripe customer ID | Contract performance |
   | Analytics (if consented) | Anonymised usage data | Legitimate interests (cookie placement requires PECR consent) |
5. **Third-party services** — who we share with and why:
   - HMRC: company details + Gateway credentials for CT600 filing
   - Companies House: company details + auth code for accounts filing
   - Stripe: email + payment data (independent controller — link to Stripe privacy policy)
   - Resend: email address for transactional emails (processor)
   - Google Analytics: anonymised usage data if consented (processor)
6. **International transfers** — Stripe and Resend are US-based. Transfers covered by UK adequacy regulations / standard contractual clauses. Google Analytics data may be processed internationally.
7. **Data storage and security** — PostgreSQL database. TLS in transit. Passwords hashed with bcrypt. HMRC credentials never persisted. CH auth codes not stored.
8. **Data retention** —
   - Account data: retained while account active + 12 months after cancellation
   - Filing records: retained for 6 years from filing date (HMRC record-keeping requirements)
   - After retention period or upon written request (subject to legal retention requirements): deleted
9. **Your rights** — full list under UK GDPR:
   - Access
   - Rectification
   - Erasure (subject to legal retention obligations)
   - Restriction of processing
   - Data portability
   - Object to processing
   - Withdraw consent (for analytics cookies — does not affect lawfulness of prior processing)
   - Complain to ICO (Information Commissioner's Office, ico.org.uk)
   - Contact: privacy@dormantfile.co.uk
10. **Children's data** — service not directed at persons under 18. We do not knowingly collect data from minors.
11. **Automated decision-making** — we do not use automated decision-making or profiling.
12. **Cookies** — brief summary, link to cookie policy.
13. **Changes to this policy** — notify by email or website notice.

- [ ] **Step 3: Commit**

```bash
git add content/pages/privacy.mdx
git commit -m "legal: rewrite privacy policy

Per-activity lawful basis table, international transfer disclosure,
6-year filing record retention, full data subject rights, Companies
House as data recipient, children's data statement."
```

---

### Task 3: Cookie Policy

**Files:**

- Modify: `content/pages/cookies.mdx`

- [ ] **Step 1: Read current cookie policy**

Read `content/pages/cookies.mdx` in full.

- [ ] **Step 2: Write the rewritten cookie policy**

Replace entire content. Keep structure similar but add specificity.

**Frontmatter:**

```yaml
---
title: "Cookie Policy"
description: "How DormantFile uses cookies. We use essential session cookies and optional analytics cookies with your consent."
updatedAt: "2026-03-28"
breadcrumbs:
  - label: "Cookie Policy"
showCTA: false
showUpdatedAt: true
openGraph:
  title: "Cookie Policy | DormantFile"
  description: "How DormantFile uses cookies."
  type: "website"
---
```

**Content requirements:**

- Introduction explaining what cookies are and link to ICO cookie guidance
- **Essential cookies table:**
  | Cookie | Purpose | Duration | Type |
  | `next-auth.session-token` | Keeps you logged in | Session (deleted on sign-out/browser close) | Essential |
  | `next-auth.csrf-token` | Prevents cross-site request forgery | Session | Essential |
  | `next-auth.callback-url` | Remembers redirect after login | Session | Essential |
- **Cookie consent** — stored in browser local storage (not a cookie), remembers accept/decline preference
- **Analytics cookies table (optional, consent required):**
  | Cookie | Purpose | Duration | Type |
  | `_ga` | Distinguishes unique visitors (Google Analytics) | 2 years | Analytics |
  | `_ga_*` | Maintains session state (Google Analytics) | 2 years | Analytics |
- Statement: analytics cookies only set if user clicks "Accept" on consent banner
- **Advertising cookies** — none used
- **How to manage** — change preference by clearing local storage (banner reappears), browser settings, link to privacy policy
- Reference to ICO guidance on cookies

- [ ] **Step 3: Commit**

```bash
git add content/pages/cookies.mdx
git commit -m "legal: rewrite cookie policy

Add explicit cookie name/duration table, ICO guidance reference,
consent mechanism description."
```

---

### Task 4: Acceptable Use Policy (new)

**Files:**

- Create: `content/pages/acceptable-use.mdx`
- Create: `src/app/(marketing)/acceptable-use/page.tsx`

- [ ] **Step 1: Create the MDX content file**

Create `content/pages/acceptable-use.mdx`:

**Frontmatter:**

```yaml
---
title: "Acceptable Use Policy"
description: "Rules for using DormantFile responsibly. What you can and cannot do with the service."
updatedAt: "2026-03-28"
breadcrumbs:
  - label: "Acceptable Use Policy"
showCTA: false
showUpdatedAt: true
openGraph:
  title: "Acceptable Use Policy | DormantFile"
  description: "Rules for using DormantFile responsibly."
  type: "website"
---
```

**Sections:**

1. **Introduction** — this policy sets out what you may and may not do when using DormantFile. By using the service, you agree to comply with this policy.
2. **Permitted use** — DormantFile is provided for the sole purpose of filing dormant company accounts with Companies House and nil CT600 returns with HMRC on behalf of UK limited companies that are genuinely dormant.
3. **You must not:**
   - Use the service to file returns for companies that are not genuinely dormant
   - Submit false, misleading, or fraudulent information to HMRC or Companies House
   - Use another person's HMRC Gateway credentials or Companies House authentication code without proper authorisation
   - Attempt to access, interfere with, or disrupt any part of the service, its servers, or connected networks
   - Reverse engineer, decompile, or attempt to extract source code from the service
   - Use the service in any way that breaches applicable law or regulation
   - Create multiple accounts to circumvent subscription limits
4. **Consequences** — if we reasonably believe you have breached this policy, we may suspend or terminate your account without notice. We may also report suspected fraudulent filings to HMRC or Companies House.
5. **Reporting** — if you become aware of any misuse, contact us at hello@dormantfile.co.uk
6. **Changes** — we may update this policy. Continued use after changes = acceptance.

- [ ] **Step 2: Create the route shell**

Create `src/app/(marketing)/acceptable-use/page.tsx` following the exact pattern from `src/app/(marketing)/terms/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

const SLUG = "acceptable-use";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug(SLUG);
  if (!page) return {};
  const { title, metaTitle, description, openGraph } = page.frontmatter;
  const resolvedTitle = metaTitle || `${title} | DormantFile`;
  return {
    title: resolvedTitle,
    description,
    openGraph: {
      title: openGraph?.title || resolvedTitle,
      description: openGraph?.description || description,
      type: (openGraph?.type as "website" | "article") || "website",
      siteName: "DormantFile",
    },
  };
}

export default async function AcceptableUsePage() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();

  const { title, subtitle, showCTA, showUpdatedAt, updatedAt, centeredHeading, breadcrumbs } =
    page.frontmatter;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const align = centeredHeading ? ("center" as const) : undefined;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          ...breadcrumbs.map((b) => ({
            name: b.label,
            ...(b.href ? { url: `${baseUrl}${b.href}` } : {}),
          })),
        ]}
      />
      <Breadcrumbs items={breadcrumbs} />
      <article>
        <h1
          style={{
            fontSize: "36px",
            fontWeight: 700,
            color: "#1E293B",
            margin: "0 0 12px 0",
            letterSpacing: "-0.02em",
            textAlign: align,
          }}
        >
          {title}
        </h1>
        {showUpdatedAt && updatedAt && (
          <p style={{ fontSize: "14px", color: "#94A3B8", margin: "0 0 40px 0" }}>
            Last updated:{" "}
            {new Date(updatedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
        {subtitle && (
          <p
            style={{
              fontSize: "17px",
              lineHeight: 1.7,
              color: "#475569",
              marginBottom: "32px",
              textAlign: align,
            }}
          >
            {subtitle}
          </p>
        )}
        {page.content}
      </article>
      {showCTA && <ContentCTA />}
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add content/pages/acceptable-use.mdx src/app/\(marketing\)/acceptable-use/page.tsx
git commit -m "legal: create acceptable use policy

New page covering permitted use, prohibited activities, and
consequences for misuse."
```

---

### Task 5: Refund & Cancellation Policy (new)

**Files:**

- Create: `content/pages/refund.mdx`
- Create: `src/app/(marketing)/refund/page.tsx`

- [ ] **Step 1: Create the MDX content file**

Create `content/pages/refund.mdx`:

**Frontmatter:**

```yaml
---
title: "Refund & Cancellation Policy"
description: "How to cancel your DormantFile subscription and our refund policy, including your 14-day cooling-off rights."
updatedAt: "2026-03-28"
breadcrumbs:
  - label: "Refund & Cancellation"
showCTA: false
showUpdatedAt: true
openGraph:
  title: "Refund & Cancellation | DormantFile"
  description: "How to cancel your DormantFile subscription and our refund policy."
  type: "website"
---
```

**Sections:**

1. **Your right to cancel (14-day cooling-off period)** — Under the Consumer Contracts (Information, Cancellation and Additional Charges) Regulations 2013, you have the right to cancel your subscription within 14 days of purchase without giving a reason.

   When you subscribe, you may give your explicit consent for the service to begin immediately. If you do so and subsequently submit a filing within the 14-day period, you acknowledge that you will lose your right to cancel and receive a full refund for that billing period, because the service has been fully performed.

   If you cancel within 14 days and have not submitted a filing, we will issue a full refund within 14 days of your cancellation.

2. **How to cancel** — cancel via the billing portal accessible from your account settings page. Cancellation takes effect at the end of your current billing period. You retain access to the service until then.

3. **Refunds after the cooling-off period** — after the 14-day cooling-off period, we do not offer refunds for partial billing periods. Your subscription remains active until the end of the current billing period.

4. **What happens to your data** — after cancellation:
   - Your account and company details are retained for 12 months to allow reactivation
   - Filing records are retained for 6 years from the filing date (in line with HMRC record-keeping requirements)
   - After the retention period, all personal data is deleted
   - You may request earlier deletion of account data (but not filing records within the 6-year retention period) by emailing privacy@dormantfile.co.uk

5. **How to request a refund** — email hello@dormantfile.co.uk with your account email and reason for the request. We aim to respond within 5 working days.

6. **Contact** — hello@dormantfile.co.uk

- [ ] **Step 2: Create the route shell**

Create `src/app/(marketing)/refund/page.tsx` — copy the exact code from Task 4 step 2, changing only `const SLUG = "refund"` and the function name to `RefundPage`.

- [ ] **Step 3: Commit**

```bash
git add content/pages/refund.mdx src/app/\(marketing\)/refund/page.tsx
git commit -m "legal: create refund and cancellation policy

14-day cooling-off period with consent waiver, data retention
post-cancellation, HMRC 6-year filing record retention."
```

---

### Task 5.5: Build check for new route shells

- [ ] **Step 1: Verify build**

Run: `npm run build`
Expected: Build succeeds without errors. This catches any import or type issues in the new TSX route shells before moving to Phase 2.

---

### Task 6: Update footer and sitemap for new legal pages

**Files:**

- Modify: `src/components/marketing/MarketingFooter.tsx`
- Modify: `src/app/sitemap.ts`

- [ ] **Step 1: Update the footer**

In `src/components/marketing/MarketingFooter.tsx`, add the new legal pages to the `footerLinks` array. Insert them alongside the existing legal links. The current array is:

```typescript
const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/guides", label: "Guides" },
  { href: "/answers", label: "Answers" },
  { href: "/security", label: "Security" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
  { href: "/terms", label: "Terms" },
];
```

Add after "Terms":

```typescript
  { href: "/acceptable-use", label: "Acceptable Use" },
  { href: "/refund", label: "Refund Policy" },
```

- [ ] **Step 2: Update the sitemap**

In `src/app/sitemap.ts`, add `/cookies`, `/acceptable-use`, and `/refund` to the `staticRoutes` array (after `/terms`). Note: `/cookies` is an existing page already missing from the sitemap.

- [ ] **Step 3: Commit**

```bash
git add src/components/marketing/MarketingFooter.tsx src/app/sitemap.ts
git commit -m "chore: add acceptable use and refund pages to footer and sitemap"
```

---

## Phase 2: Marketing Pages

### Task 7: Homepage

**Files:**

- Modify: `src/app/page.tsx`

- [ ] **Step 1: Read current homepage**

Read `src/app/page.tsx` in full.

- [ ] **Step 2: Rewrite the homepage copy**

Modify `src/app/page.tsx`. Keep the existing component structure and styling. Change the copy in these sections:

**Add metadata export** at the top of the file (after imports):

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DormantFile — Dormant Company Filing Made Simple",
  description:
    "File your dormant company accounts and nil CT600 tax returns online. Direct submission to Companies House and HMRC from one dashboard. From £19/year.",
  openGraph: {
    title: "DormantFile — Dormant Company Filing Made Simple",
    description:
      "File your dormant company accounts and nil CT600 tax returns online. From £19/year.",
    type: "website",
    siteName: "DormantFile",
  },
};
```

**Hero section:**

- H1: "Dormant company filing, sorted" — with "sorted" in the accent colour
- Subheading: Clear description covering both filings, mentioning Companies House and HMRC by name
- Below CTA: Add prominent dormant-only scope statement: "For genuinely dormant companies only — no trading activity, no assets, no income."

**Trust indicators:** Keep existing three (credentials never stored, file in under 2 minutes, direct submission). Verify copy matches spec consistency rules.

**How it works:** Keep 3-step summary. Tighten copy. Ensure step 3 mentions both filings.

**Problem statement:**

- Update to explicitly mention CATO closure in past tense: "HMRC's free filing tool (CATO) closed on 31 March 2026"
- Frame the problem positively: directors need an affordable, purpose-built alternative
- Don't use doom-and-gloom language

**Pricing section:** Verify all prices match (£19/£39/£49). Ensure features lists are accurate against codebase.

**FAQ section:**

- Keep existing questions, tighten answers for accuracy
- Add `FAQPageJsonLd` component import and render it with the FAQ items
- Import: `import { FAQPageJsonLd } from "@/lib/content/json-ld";`
- Render before the FAQ section: `<FAQPageJsonLd items={faqItems} />`
- Define `faqItems` array from the existing FAQ data

**Final CTA:** Keep. Tighten copy.

- [ ] **Step 3: Verify build**

Run: `npm run build` (or the project's build command)
Expected: Build succeeds without errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "copy: rewrite homepage

Stronger H1 with target keywords, CATO closure context, dormant-only
scope statement, FAQ schema markup, consistent pricing, meta tags."
```

---

### Task 8: About page

**Files:**

- Modify: `content/pages/about.mdx`

- [ ] **Step 1: Read current about page**

Read `content/pages/about.mdx`.

- [ ] **Step 2: Rewrite the about page**

Replace entire content. Key changes:

- Voice: "Our founder built..." for origin story, then "we" throughout
- Mention BOTH filings (accounts + CT600)
- Mention reminder functionality
- Keep the founding story but reframe: "DormantFile was built out of necessity..." not "I built DormantFile because I needed it myself"
- "Who's behind it" → "Who we are" — solo founder, UK-based, software engineer not accountant
- "Our approach" → keep the three pillars (affordable, secure, simple), update copy for "we" voice
- Internal links to /security, /pricing, /how-it-works
- Dormant-only scope statement

**Frontmatter:** Keep existing structure, update `updatedAt` to `2026-03-28`. Ensure `metaTitle` is under 60 chars.

- [ ] **Step 3: Commit**

```bash
git add content/pages/about.mdx
git commit -m "copy: rewrite about page

Shift to company voice, cover both filings, add reminder mention,
internal links to security/pricing/how-it-works."
```

---

### Task 9: How It Works page

**Files:**

- Modify: `content/pages/how-it-works.mdx`
- Modify: `src/app/(marketing)/how-it-works/page.tsx`
- Modify: `src/lib/content/json-ld.tsx`

- [ ] **Step 1: Add HowToJsonLd component**

Add to `src/lib/content/json-ld.tsx`:

```tsx
interface HowToStep {
  name: string;
  text: string;
}

export function HowToJsonLd({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: HowToStep[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    step: steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.name,
      text: step.text,
    })),
  };
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
```

- [ ] **Step 2: Rewrite the how-it-works MDX**

Replace content of `content/pages/how-it-works.mdx`. Key changes:

- Tighten step descriptions
- Clarify accounts and CT600 are independent (you can do one without the other)
- Verify reminder intervals: 90, 30, 14, 7, 3, and 1 day before deadline
- Keep the Callout about CT600 being optional
- Ensure all steps match actual codebase flow

- [ ] **Step 3: Add HowToJsonLd to the route shell**

Modify `src/app/(marketing)/how-it-works/page.tsx` to import and render `HowToJsonLd` with the step data extracted from frontmatter or hardcoded to match the MDX content.

- [ ] **Step 4: Commit**

```bash
git add src/lib/content/json-ld.tsx content/pages/how-it-works.mdx src/app/\(marketing\)/how-it-works/page.tsx
git commit -m "copy: rewrite how-it-works page, add HowTo schema

Tighten step descriptions, clarify independent filings, add
HowToJsonLd structured data."
```

---

### Task 10: Pricing page

**Files:**

- Modify: `content/pages/pricing.mdx`

- [ ] **Step 1: Rewrite the pricing page**

Replace content of `content/pages/pricing.mdx`. Key changes:

- Verify prices: Basic £19 (1 company), Multiple £39 (up to 10), Agent £49 (up to 100)
- Verify features lists against codebase (subscription.ts tier limits)
- Comparison table: DormantFile, Accountant, General accounting software, DIY
- DIY row: "Free (accounts only) — no CT600 option since CATO closed"
- Billing FAQ: consistent with new terms (14-day cooling-off, cancel via portal, no partial refunds)
- No VAT mention

- [ ] **Step 2: Commit**

```bash
git add content/pages/pricing.mdx
git commit -m "copy: rewrite pricing page

Verify prices against codebase, update comparison table, align billing
FAQ with new terms."
```

---

### Task 11: FAQ page

**Files:**

- Modify: `content/pages/faq.mdx`

- [ ] **Step 1: Rewrite the FAQ page**

Replace content of `content/pages/faq.mdx`. Audit every Q&A against:

- The codebase (features, behaviour)
- The rewritten terms (refund policy, cancellation)
- The spec consistency rules

Key changes:

- Filing category: ensure both filings described, add question about Companies House auth code
- Security category: differentiate HMRC credential handling from CH auth code handling
- Pricing category: update refund answer to reference new refund policy, ensure prices match
- Account category: verify against dashboard behaviour
- Voice consistency: "we" throughout

- [ ] **Step 2: Commit**

```bash
git add content/pages/faq.mdx
git commit -m "copy: rewrite FAQ page

Audit all Q&As against codebase and rewritten terms, cover both
filings, differentiate credential handling."
```

---

### Task 12: Security page

**Files:**

- Modify: `content/pages/security.mdx`

- [ ] **Step 1: Rewrite the security page**

Replace content of `content/pages/security.mdx`. Key changes:

- Add Companies House authentication code handling — entered at filing, transmitted to CH, not stored in database
- Keep HMRC credential handling (accurate as-is)
- Differentiate the two clearly: HMRC credentials = never stored, CH auth code = not stored
- Verify cookie description matches rewritten cookie policy
- Third-party services: add Companies House alongside HMRC, Stripe, Resend
- Link to privacy policy for full legal detail

- [ ] **Step 2: Commit**

```bash
git add content/pages/security.mdx
git commit -m "copy: rewrite security page

Add Companies House auth code handling, differentiate from HMRC
credentials, update third-party services list."
```

---

### Task 13: Contact page

**Files:**

- Modify: `content/pages/contact.mdx`

- [ ] **Step 1: Rewrite the contact page**

Minor changes to `content/pages/contact.mdx`:

- Add brief context about what to contact about (questions, issues, feedback, data requests)
- Mention privacy@dormantfile.co.uk for data protection queries specifically
- Keep contact form
- Keep response time ("within one working day")

- [ ] **Step 2: Commit**

```bash
git add content/pages/contact.mdx
git commit -m "copy: update contact page

Add context for common query types, separate data protection contact."
```

---

### Task 13.5: Guides & Answers index pages

**Files:**

- Modify: `src/app/(marketing)/guides/page.tsx`
- Modify: `src/app/(marketing)/answers/page.tsx`

- [ ] **Step 1: Read both index pages**

Read `src/app/(marketing)/guides/page.tsx` and `src/app/(marketing)/answers/page.tsx`.

- [ ] **Step 2: Update guides index page**

In the guides index page, update:

- Meta title: `"Guides | DormantFile"` (under 60 chars)
- Meta description: tighten to target "dormant company filing guides" keyword
- Intro text (h1 and description paragraph): sharpen for clarity and SEO

- [ ] **Step 3: Update answers index page**

In the answers index page, update:

- Meta title: `"Answers | DormantFile"` (already good)
- Meta description: tighten to target "dormant company filing questions" keyword
- Intro text: sharpen for clarity

- [ ] **Step 4: Commit**

```bash
git add src/app/\(marketing\)/guides/page.tsx src/app/\(marketing\)/answers/page.tsx
git commit -m "copy: sharpen guides and answers index pages

Update intro text and meta descriptions for SEO."
```

---

## Phase 3: Existing Content Articles (Answers)

### Task 14: Rewrite all 10 existing answer articles

**Files:**

- Modify: all 10 files in `content/answers/`

- [ ] **Step 1: Read all 10 answer files**

Read each file. For each, note:

- Any inaccurate claims
- Missing internal links
- Voice inconsistencies ("I" vs "we")
- Missing or weak CTAs linking to product pages

- [ ] **Step 2: Rewrite each answer file**

For each of the 10 answers, rewrite the content. Apply these rules consistently:

- Voice: "we" throughout (no first-person)
- Every answer links to its parent guide where applicable
- Every answer links to at least one product page (how-it-works, pricing, or security) where natural
- Verify all legal/regulatory claims are accurate
- Tighten descriptions, remove waffle
- Ensure `keywords` array in frontmatter targets relevant search terms
- Update `updatedAt` to `2026-03-28`
- Keep under ~400 words per answer (they're meant to be quick)

**Files in order:**

1. `what-are-companies-house-late-filing-penalties.mdx`
2. `what-are-dormant-company-accounts-aa02.mdx`
3. `what-does-dormant-mean-companies-act.mdx`
4. `what-is-a-companies-house-authentication-code.mdx`
5. `what-is-a-confirmation-statement-cs01.mdx`
6. `what-is-a-ct600.mdx`
7. `what-is-a-utr-number.mdx`
8. `what-is-an-accounting-reference-date.mdx`
9. `what-is-the-difference-between-dissolved-and-dormant.mdx`
10. `what-is-the-hmrc-gateway.mdx`

- [ ] **Step 3: Commit**

```bash
git add content/answers/
git commit -m "copy: rewrite all 10 existing answer articles

Consistent voice, accuracy audit, improved internal linking, updated
keywords and meta descriptions."
```

---

## Phase 4: Existing Content Articles (Guides)

### Task 15: Rewrite all 10 existing guide articles

**Files:**

- Modify: all 10 files in `content/guides/`

- [ ] **Step 1: Read all 10 guide files**

Read each file. For each, note:

- Inaccurate claims
- CATO references that need past-tense update
- Missing internal links to answers or product pages
- Voice inconsistencies

- [ ] **Step 2: Rewrite each guide file**

For each of the 10 guides, rewrite the content. Apply these rules:

- Voice: "we" throughout
- CATO closure: always past tense ("closed on 31 March 2026")
- Every guide links to relevant answer articles for definitions
- Every guide links to product pages where natural
- Verify penalty amounts, deadlines, and legal references are accurate
- Tighten copy, remove redundancy between guides
- Ensure `keywords` array targets relevant search terms
- Update `updatedAt` to `2026-03-28`
- Guides can be longer than answers (500-1000 words)

**Files in order:**

1. `cato-closed-options.mdx`
2. `cost-to-file-dormant-accounts.mdx`
3. `do-i-need-ct600-dormant-company.mdx`
4. `dormant-company-filing-deadlines.mdx`
5. `first-year-filing-new-company.mdx`
6. `how-to-check-company-dormant.mdx`
7. `how-to-close-dormant-company.mdx`
8. `how-to-file-dormant-company-accounts.mdx`
9. `how-to-file-nil-ct600.mdx`
10. `late-filing-penalties.mdx`

- [ ] **Step 3: Commit**

```bash
git add content/guides/
git commit -m "copy: rewrite all 10 existing guide articles

Accuracy audit, CATO past-tense, consistent voice, improved internal
linking, updated keywords."
```

---

## Phase 5: New Content Articles

### Task 16: Create 6 new answer articles

**Files:**

- Create: 6 new files in `content/answers/`

- [ ] **Step 1: Write each new answer**

Create each file with proper frontmatter (title, description, publishedAt, updatedAt, category, keywords) and content.

**1. `what-is-making-tax-digital.mdx`**

- Category: `filing`
- Cover: what MTD is, which taxes it applies to, that MTD for Corporation Tax doesn't yet mandate software for dormant companies, but CATO's closure is the practical effect
- Link to: cato-closed-options guide, how-to-file-nil-ct600 guide

**2. `what-is-a-sic-code.mdx`**

- Category: `admin`
- Cover: what SIC codes are, that dormant companies typically use 99999, where to find/change yours
- Link to: confirmation statement answer, first-year-filing guide

**3. `what-is-a-registered-office-address.mdx`**

- Category: `admin`
- Cover: legal requirement, where auth codes are posted, can be changed
- Link to: authentication code answer

**4. `what-are-persons-with-significant-control.mdx`**

- Category: `admin`
- Cover: PSC register requirements, who counts, confirmation statement reporting
- Link to: confirmation statement answer

**5. `what-is-companies-house-webfiling.mdx`**

- Category: `alternatives`
- Cover: what WebFiling is, free accounts filing, no CT600 capability, how DormantFile differs
- Link to: how-to-file-dormant-company-accounts guide, pricing page

**6. `what-does-no-significant-accounting-transactions-mean.mdx`**

- Category: `eligibility`
- Cover: expand on the dormant definition, what counts/doesn't count, common edge cases (bank interest, director loans)
- Link to: dormant definition answer, how-to-check-company-dormant guide

Each answer should be 200-400 words, plain English, with internal links.

- [ ] **Step 2: Commit**

```bash
git add content/answers/
git commit -m "content: create 6 new answer articles

MTD, SIC codes, registered office, PSC, WebFiling, significant
accounting transactions."
```

---

### Task 17: Create 5 new guide articles

**Files:**

- Create: 5 new files in `content/guides/`

- [ ] **Step 1: Write each new guide**

Create each file with proper frontmatter and content.

**1. `do-i-need-an-accountant-dormant-company.mdx`**

- Category: `costs`
- Cover: when you don't need one (genuinely dormant, confident in status), when you do (any doubt, partial trading, assets), cost comparison, honest recommendation
- Link to: cost comparison guide, how-to-check-company-dormant guide, pricing page

**2. `how-to-reactivate-dormant-company.mdx`**

- Category: `admin`
- Cover: notifying HMRC, notifying Companies House, registering for CT, first trading accounts, practical steps
- Note: DormantFile cannot help with this (out of scope) but it's valuable authority-building content
- Link to: dissolved vs dormant answer, do-i-need-ct600 guide

**3. `dormant-vs-non-trading-company.mdx`**

- Category: `eligibility`
- Cover: Companies House definition of dormant vs HMRC definition of non-trading, when they differ, practical implications for filing
- Link to: dormant definition answer, how-to-check-company-dormant guide

**4. `what-happens-if-companies-house-strikes-off-company.mdx`**

- Category: `admin`
- Cover: compulsory strike-off process, warning notices in The Gazette, bona vacantia, how to object, restoration options
- Link to: late-filing-penalties guide, how-to-close-dormant-company guide

**5. `annual-accounts-vs-confirmation-statement.mdx`**

- Category: `getting-started`
- Cover: what each is, different deadlines, different content, common confusion, both required for dormant companies
- Link to: confirmation statement answer, dormant-company-accounts answer, filing-deadlines guide

Each guide should be 500-1000 words.

- [ ] **Step 2: Commit**

```bash
git add content/guides/
git commit -m "content: create 5 new guide articles

Accountant need, reactivation, dormant vs non-trading, strike-off
consequences, accounts vs confirmation statement."
```

---

## Phase 6: Final Verification

### Task 18: Cross-page consistency check

- [ ] **Step 1: Verify pricing consistency**

Search all content files for price references (£19, £39, £49, £80, £100, £150). Ensure:

- Basic: £19/year, 1 company — everywhere
- Multiple: £39/year, up to 10 companies — everywhere
- Agent: £49/year, up to 100 companies — everywhere
- Accountant comparison: £80-£150+ — consistent
- Software comparison: £100+/year — consistent

- [ ] **Step 2: Verify CATO references**

Search all files for "CATO". Ensure all references use past tense: "closed on 31 March 2026".

- [ ] **Step 3: Verify credential handling language**

Search for "never stored", "credentials", "authentication code". Ensure:

- HMRC Gateway credentials: "used once and never stored"
- CH authentication code: "entered at filing, transmitted to Companies House, not stored"
- These two are described separately, never conflated

- [ ] **Step 4: Verify internal links**

Check all internal links (`(/path)` references) in all MDX files point to existing routes. Cross-reference against the sitemap routes list.

- [ ] **Step 5: Verify dormant-only scope statements**

Every page that describes the service must include a clear statement that it is for genuinely dormant companies only. Check: homepage, about, how-it-works, pricing, FAQ, terms, guides that mention DormantFile.

- [ ] **Step 6: Build and verify**

Run: `npm run build`
Expected: Clean build, no errors.

- [ ] **Step 7: Commit any fixes**

If any inconsistencies were found and fixed:

```bash
git add -A
git commit -m "copy: fix cross-page consistency issues

[describe specific fixes]"
```

---

### Task 19: Write summary document

**Files:**

- Create: `docs/superpowers/plans/2026-03-28-copy-audit-summary.md`

- [ ] **Step 1: Write the summary**

Create a summary document listing:

- Every page changed and what was changed
- Every new page created and why
- Key legal decisions made (with rationale)
- Solicitor review flags:
  - Limitation of liability clause enforceability
  - Consumer cooling-off waiver mechanism
  - Whether service constitutes "tax agent" activity
  - ADR participation decision
  - ICO registration timing
- Pre-launch requirements:
  - Establish legal entity
  - Register with ICO (£40/year)
  - Fill all `[PLACEHOLDER]` values
  - Decide ADR participation
  - VAT registration when threshold reached
  - E-Commerce Regulations compliance (entity details on site)

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/2026-03-28-copy-audit-summary.md
git commit -m "docs: add copy audit summary with solicitor review flags"
```
