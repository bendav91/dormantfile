# Marketing Pages to MDX Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all marketing pages (except homepage) from inline TSX to MDX content files, keeping existing routes and URLs intact.

**Architecture:** Each marketing page gets an MDX file in `content/pages/`. Route files become thin shells that load MDX content via a new `getPageBySlug()` loader. Structured UI (pricing cards, FAQ accordion, numbered steps) is handled by custom MDX components registered in the existing component map.

**Tech Stack:** next-mdx-remote/rsc (already installed), gray-matter (already installed), existing MDXComponents system.

---

### Task 1: Page content types and loader

**Files:**

- Modify: `src/lib/content/types.ts`
- Modify: `src/lib/content/mdx.ts`

- [ ] **Step 1: Add PageFrontmatter type**

In `src/lib/content/types.ts`, add:

```typescript
export interface BreadcrumbDef {
  label: string;
  href?: string;
}

export interface FAQItemDef {
  question: string;
  answer: string;
}

export interface FAQCategoryDef {
  name: string;
  items: FAQItemDef[];
}

export interface PageFrontmatter {
  title: string;
  metaTitle?: string; // full <title> override — use when title alone would double up (e.g. "About DormantFile | DormantFile")
  subtitle?: string; // plain-text subtitle rendered below h1 (pricing, how-it-works, security)
  description: string;
  updatedAt: string;
  breadcrumbs: BreadcrumbDef[];
  showCTA?: boolean;
  showUpdatedAt?: boolean; // render "Last updated" line (privacy, terms, cookies)
  centeredHeading?: boolean; // center h1 + subtitle (pricing)
  faqCategories?: FAQCategoryDef[];
  openGraph?: {
    title?: string;
    description?: string;
    type?: string;
  };
}

export interface PageItem {
  slug: string;
  frontmatter: PageFrontmatter;
}
```

- [ ] **Step 2: Add getPageBySlug to mdx.ts**

In `src/lib/content/mdx.ts`, add:

```typescript
import type { PageFrontmatter } from "./types";

// Add after existing imports, alongside existing functions

export async function getPageBySlug(slug: string, contentDir = DEFAULT_CONTENT_DIR) {
  const filePath = path.join(contentDir, "pages", `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, "utf-8");

  const { content, frontmatter } = await compileMDX<PageFrontmatter>({
    source: fileContent,
    options: { parseFrontmatter: true },
    components: mdxComponents,
  });

  return { content, frontmatter, slug };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/content/types.ts src/lib/content/mdx.ts
git commit -m "feat: add PageFrontmatter type and getPageBySlug loader"
```

---

### Task 2: Custom MDX components for structured pages

**Files:**

- Create: `src/components/marketing/mdx/PricingCards.tsx`
- Create: `src/components/marketing/mdx/ComparisonTable.tsx`
- Create: `src/components/marketing/mdx/Steps.tsx`
- Create: `src/components/marketing/mdx/SecurityCards.tsx`
- Create: `src/components/marketing/mdx/Callout.tsx`
- Create: `src/components/marketing/mdx/EmailLink.tsx`
- Modify: `src/components/marketing/MDXComponents.tsx`

These components replicate the existing inline UI from the TSX pages. The styling is copied directly from the current pages — no design changes.

- [ ] **Step 1: Create PricingCards component**

`src/components/marketing/mdx/PricingCards.tsx` — renders the 3-column pricing grid with feature lists and CTA buttons. Accepts a `plans` prop array. Extracted from `pricing/page.tsx` lines 113–193. Must include the "Most popular" badge for highlighted plans, CheckCircle icons for features, and the `/register` CTA link.

```typescript
import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export function PricingCards({ plans }: { plans: Plan[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
      {plans.map((plan) => (
        <div
          key={plan.name}
          className="rounded-xl p-7 flex flex-col"
          style={{
            border: plan.highlighted ? "2px solid #2563EB" : "1px solid #E2E8F0",
            backgroundColor: "#ffffff",
            position: "relative",
          }}
        >
          {plan.highlighted && (
            <span
              style={{
                position: "absolute",
                top: "-12px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#2563EB",
                color: "#ffffff",
                padding: "3px 14px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              Most popular
            </span>
          )}
          <p className="font-semibold text-sm mb-1" style={{ color: "#2563EB" }}>
            {plan.name}
          </p>
          <div className="mb-1">
            <span className="text-4xl font-bold" style={{ color: "#1E293B" }}>
              &pound;{plan.price}
            </span>
            <span className="text-sm ml-1" style={{ color: "#64748B" }}>
              {plan.period}
            </span>
          </div>
          <p className="text-sm mb-6" style={{ color: "#64748B" }}>
            {plan.description}
          </p>
          <ul className="space-y-2.5 mb-7 flex-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <CheckCircle size={16} style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }} />
                <span className="text-sm" style={{ color: "#475569" }}>{feature}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/register"
            className="block w-full text-center font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
            style={{
              backgroundColor: plan.highlighted ? "#F97316" : "#2563EB",
              color: "#ffffff",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create ComparisonTable component**

`src/components/marketing/mdx/ComparisonTable.tsx` — renders the method comparison table from pricing page. Accepts a `rows` prop. Extracted from `pricing/page.tsx` lines 206–275.

```typescript
interface ComparisonRow {
  method: string;
  cost: string;
  time: string;
  notes: string;
}

export function ComparisonTable({ rows }: { rows: ComparisonRow[] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: "2rem" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", backgroundColor: "#ffffff" }}>
        <thead>
          <tr>
            {["Method", "Cost", "Time", "Notes"].map((h) => (
              <th
                key={h}
                style={{
                  textAlign: "left",
                  padding: "0.75rem",
                  borderBottom: "2px solid #E2E8F0",
                  fontWeight: 600,
                  color: "#1E293B",
                  fontSize: "14px",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.method}>
              <td style={{ padding: "0.75rem", borderBottom: "1px solid #E2E8F0", color: "#1E293B", fontWeight: row.method === "DormantFile" ? 600 : 400, fontSize: "14px" }}>
                {row.method}
              </td>
              <td style={{ padding: "0.75rem", borderBottom: "1px solid #E2E8F0", color: "#475569", fontSize: "14px" }}>
                {row.cost}
              </td>
              <td style={{ padding: "0.75rem", borderBottom: "1px solid #E2E8F0", color: "#475569", fontSize: "14px" }}>
                {row.time}
              </td>
              <td style={{ padding: "0.75rem", borderBottom: "1px solid #E2E8F0", color: "#475569", fontSize: "14px" }}>
                {row.notes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Create Steps and Step components**

`src/components/marketing/mdx/Steps.tsx` — numbered step sequence with blue circles. Extracted from `how-it-works/page.tsx` lines 98–140. Uses compound component pattern: `<Steps><Step title="...">description</Step></Steps>`.

```typescript
import { Children, isValidElement } from "react";

interface StepProps {
  title: string;
  children: React.ReactNode;
}

export function Step({ title, children }: StepProps) {
  // Rendered by Steps parent — not used standalone
  return null;
}

export function Steps({ children }: { children: React.ReactNode }) {
  const steps = Children.toArray(children).filter(isValidElement);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {steps.map((child, i) => {
        const { title, children: desc } = child.props as StepProps;
        return (
          <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                backgroundColor: "#2563EB",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div>
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1E293B", margin: "0 0 4px 0" }}>
                {title}
              </h3>
              <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569", margin: 0 }}>
                {desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Create SecurityCards component**

`src/components/marketing/mdx/SecurityCards.tsx` — icon + title + description cards. Extracted from `security/page.tsx` lines 61–102. Icons are passed by name string and resolved internally (avoids passing JSX through MDX props).

```typescript
import { Shield, Lock, Eye, Server } from "lucide-react";

const iconMap: Record<string, React.ElementType> = { Shield, Lock, Eye, Server };

interface SecurityCard {
  icon: string;
  title: string;
  text: string;
}

export function SecurityCards({ cards }: { cards: SecurityCard[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "2rem" }}>
      {cards.map((card) => {
        const Icon = iconMap[card.icon];
        return (
          <div
            key={card.title}
            style={{
              padding: "1.25rem",
              border: "1px solid #E2E8F0",
              borderRadius: "0.5rem",
              backgroundColor: "#ffffff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              {Icon && <Icon size={24} style={{ color: "#2563EB" }} />}
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1E293B", margin: 0 }}>
                {card.title}
              </h3>
            </div>
            <p style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569", margin: 0 }}>
              {card.text}
            </p>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 5: Create Callout component**

`src/components/marketing/mdx/Callout.tsx` — the blue info box used on how-it-works and potentially other pages. Extracted from `how-it-works/page.tsx` lines 142–159.

```typescript
export function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: "2rem",
        padding: "1.25rem",
        backgroundColor: "#EFF6FF",
        borderRadius: "0.5rem",
        border: "1px solid #DBEAFE",
      }}
    >
      <div style={{ fontSize: "15px", lineHeight: 1.7, color: "#475569" }}>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create EmailLink component**

`src/components/marketing/mdx/EmailLink.tsx` — the blue email box with mail icon from the contact page. Extracted from `contact/page.tsx` lines 52–71.

```typescript
import { Mail } from "lucide-react";

export function EmailLink({ email }: { email: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "1rem",
        backgroundColor: "#EFF6FF",
        borderRadius: "0.5rem",
        border: "1px solid #DBEAFE",
        marginBottom: "2rem",
      }}
    >
      <Mail size={20} style={{ color: "#2563EB", flexShrink: 0 }} />
      <a href={`mailto:${email}`} style={{ color: "#2563EB", fontWeight: 500, fontSize: "15px" }}>
        {email}
      </a>
    </div>
  );
}
```

- [ ] **Step 7: Register all new components in MDXComponents.tsx**

Add imports and register in the `mdxComponents` object in `src/components/marketing/MDXComponents.tsx`:

```typescript
import { PricingCards } from "@/components/marketing/mdx/PricingCards";
import { ComparisonTable } from "@/components/marketing/mdx/ComparisonTable";
import { Steps, Step } from "@/components/marketing/mdx/Steps";
import { SecurityCards } from "@/components/marketing/mdx/SecurityCards";
import { Callout } from "@/components/marketing/mdx/Callout";
import { EmailLink } from "@/components/marketing/mdx/EmailLink";
import { ContactForm } from "@/components/marketing/ContactForm";
import { ContentCTA } from "@/components/marketing/ContentCTA";

// Add to mdxComponents object:
  PricingCards,
  ComparisonTable,
  Steps,
  Step,
  SecurityCards,
  Callout,
  EmailLink,
  ContactForm,
  ContentCTA,
  // Note: FAQAccordion is NOT registered here — it is rendered by the faq route shell
  // from frontmatter data (so it can also feed FAQPageJsonLd with plain-text answers).
```

- [ ] **Step 8: Update FAQAccordion answer type to string**

In `src/components/marketing/FAQAccordion.tsx`, change the `FAQItemData` interface:

```typescript
// Before:
interface FAQItemData {
  question: string;
  answer: React.ReactNode;
}

// After:
interface FAQItemData {
  question: string;
  answer: string;
}
```

This makes it explicit that FAQ answers are plain text (matching the YAML frontmatter source). The component renders answers as text content, so this is a safe narrowing.

- [ ] **Step 9: Commit**

```bash
git add src/components/marketing/mdx/ src/components/marketing/MDXComponents.tsx src/components/marketing/FAQAccordion.tsx
git commit -m "feat: add custom MDX components for structured marketing pages"
```

---

### Task 3: Create MDX content files for prose-heavy pages

**Files:**

- Create: `content/pages/about.mdx`
- Create: `content/pages/privacy.mdx`
- Create: `content/pages/terms.mdx`
- Create: `content/pages/cookies.mdx`
- Create: `content/pages/security.mdx`
- Create: `content/pages/contact.mdx`

These pages are mostly prose with minimal structured UI. Content is extracted directly from the existing TSX files — no rewrites, just reformatting as markdown.

- [ ] **Step 1: Create about.mdx**

Extract all prose from `src/app/(marketing)/about/page.tsx`. The content uses standard markdown elements (headings, paragraphs, lists, links) plus a `<ContentCTA />` at the end.

Frontmatter:

```yaml
---
title: "About DormantFile"
metaTitle: "About DormantFile"
description: "Why DormantFile was built, who's behind it, and our mission to make dormant company filing affordable and painless."
updatedAt: "2026-03-27"
breadcrumbs:
  - label: "About"
showCTA: true
openGraph:
  title: "About DormantFile"
  description: "Why DormantFile was built, who's behind it, and our mission to make dormant company filing affordable and painless."
  type: "website"
---
```

Note: `metaTitle` is used as-is for `<title>` — no ` | DormantFile` suffix appended. This avoids "About DormantFile | DormantFile" doubling.

Body: All paragraphs, headings (`## What DormantFile does`, `## Who's behind it`, `## Our approach`), bullet lists with bold labels, and the `/security` link. Convert `&apos;` back to `'` — MDX handles escaping.

- [ ] **Step 2: Create privacy.mdx**

Extract from `src/app/(marketing)/privacy/page.tsx`. Pure prose — 10 numbered sections with headings, paragraphs, and lists. Add `updatedAt: "2026-03-27"` to frontmatter. No CTA, no breadcrumbs in the original (add breadcrumbs for consistency).

Frontmatter:

```yaml
---
title: "Privacy Policy"
description: "How DormantFile collects, uses, and protects your personal data."
updatedAt: "2026-03-27"
breadcrumbs:
  - label: "Privacy Policy"
showCTA: false
showUpdatedAt: true
---
```

The "Last updated" line is rendered by the route shell from `updatedAt` when `showUpdatedAt: true`.

- [ ] **Step 3: Create terms.mdx**

Extract from `src/app/(marketing)/terms/page.tsx`. Same structure as privacy — 13 numbered sections. Pure prose.

Frontmatter:

```yaml
---
title: "Terms of Service"
description: "Terms and conditions for using the DormantFile service."
updatedAt: "2026-03-27"
breadcrumbs:
  - label: "Terms of Service"
showCTA: false
showUpdatedAt: true
---
```

- [ ] **Step 4: Create cookies.mdx**

Extract from `src/app/(marketing)/cookies/page.tsx`. 5 sections of prose with one internal link to `/privacy`.

Frontmatter:

```yaml
---
title: "Cookie Policy"
description: "How DormantFile uses cookies. We use one essential session cookie and an optional analytics cookie with your consent."
updatedAt: "2026-03-28"
breadcrumbs:
  - label: "Cookie Policy"
showCTA: false
showUpdatedAt: true
---
```

- [ ] **Step 5: Create security.mdx**

Extract from `src/app/(marketing)/security/page.tsx`. Uses `<SecurityCards>` component for the 4 icon cards, then standard prose for "What data we store" and "Third-party services" sections.

Frontmatter:

```yaml
---
title: "How we handle your data"
subtitle: 'The number one question we get: "Can I trust you with my HMRC login?" Here''s exactly how it works.'
description: "How DormantFile handles your data and HMRC credentials. Your Gateway password is used once and never stored."
updatedAt: "2026-03-27"
breadcrumbs:
  - label: "Security"
showCTA: true
openGraph:
  title: "Security | DormantFile"
  description: "How DormantFile handles your data and HMRC credentials. Your Gateway password is used once and never stored."
  type: "website"
---
```

Body starts directly with the `<SecurityCards>` component (subtitle is rendered by the route shell):

```mdx
<SecurityCards cards={[
  { icon: "Shield", title: "Credentials never stored", text: "Your HMRC Government Gateway user ID and password..." },
  ...
]} />
```

Followed by standard markdown for the remaining sections.

- [ ] **Step 6: Create contact.mdx**

Extract from `src/app/(marketing)/contact/page.tsx`. Uses `<EmailLink>` and `<ContactForm />` components.

Frontmatter:

```yaml
---
title: "Contact us"
description: "Get in touch with DormantFile. We typically respond within one working day."
updatedAt: "2026-03-27"
breadcrumbs:
  - label: "Contact"
showCTA: false
openGraph:
  title: "Contact | DormantFile"
  description: "Get in touch with DormantFile."
  type: "website"
---
```

Body:

```mdx
Have a question or need help? We typically respond within one working day.

<EmailLink email="hello@dormantfile.co.uk" />

## Or send us a message

<ContactForm />
```

- [ ] **Step 7: Commit**

```bash
git add content/pages/
git commit -m "feat: add MDX content files for prose marketing pages"
```

---

### Task 4: Create MDX content files for structured pages

**Files:**

- Create: `content/pages/pricing.mdx`
- Create: `content/pages/how-it-works.mdx`
- Create: `content/pages/faq.mdx`

These pages have data-driven UI components. Content and data both live in the MDX file.

- [ ] **Step 1: Create pricing.mdx**

Extract from `src/app/(marketing)/pricing/page.tsx`. Uses `<PricingCards>`, `<ComparisonTable>`, and inline billing FAQ (rendered as simple h3+p pairs, same as current).

Frontmatter:

```yaml
---
title: "Simple, transparent pricing"
subtitle: "One dormant company or a hundred - pick the plan that fits."
description: "DormantFile pricing: from £19/year for one dormant company. Compare to accountants and other software."
updatedAt: "2026-03-27"
centeredHeading: true
breadcrumbs:
  - label: "Pricing"
showCTA: true
openGraph:
  title: "Pricing | DormantFile"
  description: "DormantFile pricing: from £19/year for one dormant company."
  type: "website"
---
```

Body (subtitle is rendered by route shell, so body starts with `<PricingCards>`):

```mdx
<PricingCards
  plans={[
    {
      name: "Basic",
      price: "19",
      period: "per year",
      description: "1 dormant company",
      highlighted: false,
      features: [
        "Annual accounts filing with Companies House",
        "Nil CT600 filing with HMRC",
        "Direct submission via official APIs",
        "Email deadline reminders",
        "Filing confirmation & history",
      ],
    },
    {
      name: "Multiple",
      price: "39",
      period: "per year",
      description: "Up to 10 companies",
      highlighted: true,
      features: [
        "Everything in Basic",
        "File for up to 10 dormant companies",
        "Manage all companies from one dashboard",
        "Individual filing per company",
      ],
    },
    {
      name: "Agent",
      price: "49",
      period: "per year",
      description: "Up to 100 companies",
      highlighted: false,
      features: [
        "Everything in Multiple",
        "File for up to 100 dormant companies",
        "File as agent on behalf of clients",
        "Ideal for accountants",
      ],
    },
  ]}
/>

## How does DormantFile compare?

<ComparisonTable
  rows={[
    {
      method: "DormantFile",
      cost: "From £19/year",
      time: "Under 2 minutes",
      notes: "Both filings from one dashboard",
    },
    {
      method: "Accountant",
      cost: "£80–£150+ per company",
      time: "Varies",
      notes: "Overkill for nil returns, but gives professional advice",
    },
    {
      method: "General accounting software",
      cost: "£100+/year",
      time: "30+ minutes",
      notes: "Designed for trading companies, not dormant",
    },
    {
      method: "DIY (manual filing)",
      cost: "Free (accounts only)",
      time: "1–2 hours",
      notes: "No CT600 option since CATO closed",
    },
  ]}
/>

## Billing questions

### Can I cancel anytime?

Yes. Cancel via the billing portal and your subscription remains active until the end of the current billing period. No refunds for partial periods.

### Can I upgrade or downgrade?

Yes. Upgrade immediately or downgrade at the end of your billing period via your account settings.

### What payment methods do you accept?

We accept all major credit and debit cards via Stripe. We don't currently accept bank transfers or direct debits.

### Do you offer refunds?

We don't offer refunds for partial billing periods. If you're unsure, start with Basic – you can always upgrade later.
```

- [ ] **Step 2: Create how-it-works.mdx**

Extract from `src/app/(marketing)/how-it-works/page.tsx`. Uses `<Steps>/<Step>` compound component and `<Callout>`.

Frontmatter:

```yaml
---
title: "How it works"
subtitle: "From sign-up to filed - the whole process takes under 5 minutes."
description: "Step-by-step walkthrough of filing your dormant company accounts and CT600 with DormantFile."
updatedAt: "2026-03-27"
breadcrumbs:
  - label: "How It Works"
showCTA: true
openGraph:
  title: "How It Works | DormantFile"
  description: "Step-by-step walkthrough of filing your dormant company accounts and CT600 with DormantFile."
  type: "website"
---
```

Body (subtitle rendered by route shell, body starts with `<Steps>`):

```mdx
<Steps>
  <Step title="Create your account">
    Sign up with your email address and set a password. Takes 30 seconds.
  </Step>
  <Step title="Add your company">
    Enter your company registration number – we look up the company name automatically via Companies
    House. Add your UTR (Unique Taxpayer Reference) and accounting period dates.
  </Step>
  <Step title="Choose your plan">
    Pick the plan that fits: Basic for one company (£19/year), Multiple for up to 10 (£39/year), or
    Agent for up to 100 (£49/year).
  </Step>
  <Step title="Get deadline reminders">
    We calculate your filing deadlines automatically (9 months after your accounting reference date
    for accounts, 12 months for CT600) and send you email reminders at 90, 30, 14, 7, 3, and 1 day
    before they're due.
  </Step>
  <Step title="File your accounts">
    When you're ready, click to file your annual dormant accounts with Companies House. We submit
    the AA02 directly via the Companies House software filing API. You'll need your Companies House
    authentication code.
  </Step>
  <Step title="File your CT600">
    If your company is registered for Corporation Tax, click to file your nil CT600. Enter your HMRC
    Government Gateway credentials – we submit directly to HMRC via their GovTalk API. Your
    credentials are used once and never stored.
  </Step>
  <Step title="Get confirmation">
    Once HMRC and Companies House accept your filing, we show the confirmation in your dashboard and
    send you an email. Your filing records are stored so you always have a history.
  </Step>
</Steps>

<Callout>
  **Not registered for Corporation Tax?** That's fine – many dormant companies only need to file
  annual accounts with Companies House. You can skip the CT600 step entirely. Read our guide on
  [whether you need a CT600](/guides/do-i-need-ct600-dormant-company) for more detail.
</Callout>
```

- [ ] **Step 3: Create faq.mdx**

Extract from `src/app/(marketing)/faq/page.tsx`. The FAQ page is special — it needs `FAQPageJsonLd` with plain-text answers. Store the FAQ data in frontmatter so the route shell can build both the JSON-LD and pass it to the `<FAQAccordion>` component.

Frontmatter:

```yaml
---
title: "Frequently Asked Questions"
description: "Frequently asked questions about DormantFile: filing, security, pricing, and managing your account."
updatedAt: "2026-03-27"
breadcrumbs:
  - label: "FAQ"
showCTA: true
openGraph:
  title: "FAQ | DormantFile"
  description: "Frequently asked questions about DormantFile."
  type: "website"
faqCategories:
  - name: "Filing"
    items:
      - question: "What filings does DormantFile handle?"
        answer: "DormantFile handles two filings: annual dormant accounts submitted to Companies House and a nil CT600 Corporation Tax return submitted to HMRC. Both confirm your company was dormant during the accounting period."
      - question: "What if my company isn't registered for Corporation Tax?"
        answer: "No problem. Many dormant companies only need to file annual accounts with Companies House. If your company isn't registered for Corporation Tax, you can skip the CT600 entirely. DormantFile handles both scenarios."
      - question: "Can I use this if my company is trading?"
        answer: "No. DormantFile is designed exclusively for genuinely dormant companies - those with no income, expenditure, or assets. If your company has traded during the period, you need a qualified accountant."
      - question: "What happens after I file?"
        answer: "Companies House and HMRC will process your submission. Once accepted, we show the confirmation in your dashboard and send you an email. Your filing records are kept so you have a permanent history."
      - question: "How long does filing take?"
        answer: "The actual filing process takes under 2 minutes. You click file, enter your credentials (for HMRC) or authentication code (for Companies House), and we handle the rest."
      - question: "What do I need before I start?"
        answer: "For accounts: your company registration number and Companies House authentication code. For CT600: your Unique Taxpayer Reference (UTR) and HMRC Government Gateway credentials. You'll also need your accounting period dates."
      - question: "What accounting periods can I file for?"
        answer: "You can file for any accounting period where your company was dormant. DormantFile calculates your deadlines based on the period dates you enter."
  - name: "Security"
    items:
      - question: "Is my data secure?"
        answer: "Yes. All data is transmitted over TLS encryption. Your DormantFile password is hashed with bcrypt. Your HMRC Gateway credentials are used once during submission and never stored in our database. Read our security page for full details."
      - question: "Are my HMRC credentials stored?"
        answer: "No. Your HMRC Government Gateway user ID and password are held in server memory only for the duration of the submission request. They are transmitted directly to HMRC and discarded immediately after HMRC responds."
      - question: "What data do you collect?"
        answer: "We collect your email, a hashed password, company details (name, registration number, UTR, accounting dates), and filing records. Payment is handled by Stripe - we never see your card details."
  - name: "Pricing"
    items:
      - question: "How much does it cost?"
        answer: "Basic is £19/year for one company. Multiple is £39/year for up to 10 companies. Agent is £49/year for up to 100 companies. All plans include both accounts and CT600 filing. See our pricing page for the full comparison."
      - question: "Is there a free trial?"
        answer: "We don't currently offer a free trial, but the Basic plan is just £19/year - less than what most accountants charge for a single nil filing."
      - question: "Can I cancel anytime?"
        answer: "Yes. Cancel via the billing portal and your subscription stays active until the end of the current billing period. No refunds for partial periods."
      - question: "What happens if my subscription lapses?"
        answer: "If your subscription expires, you won't be able to file new returns. Your account and filing history remain accessible. You can resubscribe at any time to resume filing."
  - name: "Account"
    items:
      - question: "Can I manage multiple companies?"
        answer: "Yes, on the Multiple or Agent plan. Each company has its own filing record, deadlines, and reminders. You manage them all from a single dashboard."
      - question: "How do I add or remove a company?"
        answer: "Add a company from your dashboard by entering its registration number. Remove a company from your settings - the filing history is preserved."
      - question: "How do I delete my account?"
        answer: "You can delete your account from the settings page. This removes all your personal data and company records. This action is permanent and cannot be undone."
---
```

Body:

```mdx
Everything you need to know about using DormantFile. Can't find your answer? [Get in touch](/contact).

<FAQAccordion categories={frontmatter.faqCategories} />
```

**Important note on FAQ:** The `<FAQAccordion>` currently types `answer` as `React.ReactNode` and the existing TSX page uses JSX with inline `<a>` links in some answers. In the MDX version, answers are plain strings from frontmatter YAML. This is a **deliberate simplification** — plain-text answers work for both the accordion display and JSON-LD structured data without duplication. The trade-off is that 4 answers that previously had inline links to `/guides/...`, `/security`, and `/pricing` lose those links.

**Action required in Task 2:** Change the `FAQAccordion` component's `answer` type from `React.ReactNode` to `string` to make this explicit and prevent future confusion about what the component accepts. The component renders answers as text, not as JSX elements — the type should reflect that.

Previously linked pages from FAQ answers:

- `/guides/how-to-file-dormant-company-accounts`
- `/guides/how-to-file-nil-ct600`
- `/security` (2 answers)
- `/pricing`

These are also linked from other pages (guides index, about, etc.) so internal link coverage is maintained.

- [ ] **Step 4: Commit**

```bash
git add content/pages/pricing.mdx content/pages/how-it-works.mdx content/pages/faq.mdx
git commit -m "feat: add MDX content files for structured marketing pages"
```

---

### Task 5: Convert route files to thin shells — prose pages

**Files:**

- Modify: `src/app/(marketing)/about/page.tsx`
- Modify: `src/app/(marketing)/privacy/page.tsx`
- Modify: `src/app/(marketing)/terms/page.tsx`
- Modify: `src/app/(marketing)/cookies/page.tsx`
- Modify: `src/app/(marketing)/security/page.tsx`
- Modify: `src/app/(marketing)/contact/page.tsx`

Each route file becomes a thin shell: imports `getPageBySlug`, generates metadata from frontmatter, renders breadcrumbs + title + `{page.content}` + optional CTA. The pattern is identical across all pages — only the slug and JSON-LD vary.

All route shells follow the same pattern. Here is the **canonical shell template** — each page uses this with its own `SLUG` and any page-specific additions (e.g. FAQ adds `FAQPageJsonLd`):

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPageBySlug } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

const SLUG = "about"; // ← change per page

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageBySlug(SLUG);
  if (!page) return {};
  const { title, metaTitle, description, openGraph } = page.frontmatter;
  // metaTitle is used as-is; otherwise append " | DormantFile"
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

export default async function PageName() { // ← rename per page
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();

  const { title, subtitle, showCTA, showUpdatedAt, updatedAt, centeredHeading, breadcrumbs } = page.frontmatter;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const align = centeredHeading ? "center" : undefined;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          ...breadcrumbs.map((b) => ({ name: b.label, ...(b.href ? { url: `${baseUrl}${b.href}` } : {}) })),
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
            Last updated: {new Date(updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        )}
        {subtitle && (
          <p style={{ fontSize: "17px", lineHeight: 1.7, color: "#475569", marginBottom: "32px", textAlign: align }}>
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

**Title convention:** All pages use `title | DormantFile` except where `metaTitle` provides a full override (about page). This standardises on `|` — the legal pages previously used `-` but this is an intentional alignment.

**New breadcrumbs:** Privacy, terms, and cookies currently have no breadcrumbs. Adding them is an intentional improvement during this migration.

- [ ] **Step 1: Convert about/page.tsx**

Use the canonical template with `SLUG = "about"`. Function name: `AboutPage`. The about frontmatter sets `metaTitle: "About DormantFile"` and `margin: "0 0 24px 0"` on h1 (slightly larger bottom margin than the template's 12px). Adjust the about shell's h1 margin to 24px to match the current page.

- [ ] **Step 2: Convert privacy/page.tsx**

Same shell pattern as about, with `SLUG = "privacy"`. Additional: render the "Last updated" date line below the h1, derived from `page.frontmatter.updatedAt`:

```typescript
<p style={{ fontSize: "14px", color: "#94A3B8", margin: "0 0 40px 0" }}>
  Last updated: {new Date(page.frontmatter.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
</p>
```

Title format: `${title} - DormantFile` (using dash, not pipe — matches current).

- [ ] **Step 3: Convert terms/page.tsx**

Same as privacy shell. `SLUG = "terms"`. Includes "Last updated" line. Title: `${title} - DormantFile`.

- [ ] **Step 4: Convert cookies/page.tsx**

Same shell pattern. `SLUG = "cookies"`. Includes "Last updated" line and breadcrumbs.

- [ ] **Step 5: Convert security/page.tsx**

Same shell pattern. `SLUG = "security"`. Has subtitle paragraph below h1:

The subtitle is part of the MDX content, so no special handling needed — it's the first paragraph in `security.mdx`.

Title format: `${title} | DormantFile` (pipe separator — matches current "Security | DormantFile").

- [ ] **Step 6: Convert contact/page.tsx**

Same shell pattern. `SLUG = "contact"`. No CTA, no "Last updated" line.

- [ ] **Step 7: Verify all 6 pages build without errors**

Run: `npx next build`

Expected: Build succeeds. All routes still render. No broken links.

- [ ] **Step 8: Commit**

```bash
git add src/app/(marketing)/about/page.tsx src/app/(marketing)/privacy/page.tsx src/app/(marketing)/terms/page.tsx src/app/(marketing)/cookies/page.tsx src/app/(marketing)/security/page.tsx src/app/(marketing)/contact/page.tsx
git commit -m "feat: convert prose marketing pages to MDX-backed route shells"
```

---

### Task 6: Convert route files to thin shells — structured pages

**Files:**

- Modify: `src/app/(marketing)/pricing/page.tsx`
- Modify: `src/app/(marketing)/how-it-works/page.tsx`
- Modify: `src/app/(marketing)/faq/page.tsx`

- [ ] **Step 1: Convert pricing/page.tsx**

Use the canonical shell template with `SLUG = "pricing"`. Function name: `PricingPage`. The pricing frontmatter sets `centeredHeading: true` and `subtitle`, so the template handles centering automatically.

- [ ] **Step 2: Convert how-it-works/page.tsx**

Same shell pattern. `SLUG = "how-it-works"`. Uses subtitle from frontmatter. The `<Steps>` and `<Callout>` components are rendered from MDX content.

- [ ] **Step 3: Convert faq/page.tsx**

`SLUG = "faq"`. This page has special JSON-LD requirements. The route shell reads `page.frontmatter.faqCategories` and builds both `<FAQPageJsonLd>` (needs flat array of {question, answer} strings) and passes the categories to the content.

**Key detail:** The `<FAQAccordion>` in faq.mdx references `frontmatter.faqCategories` — but MDX components can't access frontmatter directly. Instead, the route shell passes categories to the MDX via a wrapper, OR we render the `<FAQAccordion>` in the route shell instead of in the MDX body.

Simplest approach: the FAQ MDX body is just the intro paragraph. The route shell renders `<FAQAccordion>` directly from frontmatter data, after `{page.content}`:

```tsx
export default async function FAQPage() {
  const page = await getPageBySlug(SLUG);
  if (!page) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const faqCategories = page.frontmatter.faqCategories || [];
  const faqJsonLdItems = faqCategories.flatMap((cat) =>
    cat.items.map((item) => ({ question: item.question, answer: item.answer })),
  );

  return (
    <>
      <FAQPageJsonLd items={faqJsonLdItems} />
      <BreadcrumbJsonLd items={[{ name: "Home", url: baseUrl }, { name: "FAQ" }]} />
      <Breadcrumbs items={page.frontmatter.breadcrumbs} />
      <article>
        <h1 style={headingStyle}>{page.frontmatter.title}</h1>
        {page.content}
        <FAQAccordion categories={faqCategories} />
      </article>
      {page.frontmatter.showCTA && <ContentCTA />}
    </>
  );
}
```

The faq.mdx body becomes just:

```mdx
Everything you need to know about using DormantFile. Can't find your answer? [Get in touch](/contact).
```

- [ ] **Step 4: Verify all pages build without errors**

Run: `npx next build`

Expected: Build succeeds. All 9 marketing routes render correctly.

- [ ] **Step 5: Commit**

```bash
git add src/app/(marketing)/pricing/page.tsx src/app/(marketing)/how-it-works/page.tsx src/app/(marketing)/faq/page.tsx
git commit -m "feat: convert structured marketing pages to MDX-backed route shells"
```

---

### Task 7: Visual verification and cleanup

**Files:**

- Potentially modify: any of the above if visual discrepancies are found

- [ ] **Step 1: Run dev server and check each page visually**

Run: `npm run dev`

Visit each page and verify it looks identical to before:

- `/about`
- `/pricing`
- `/how-it-works`
- `/faq`
- `/contact`
- `/security`
- `/privacy`
- `/terms`
- `/cookies`

Check: headings, spacing, links work, pricing cards render, FAQ accordion opens/closes, contact form submits, steps numbered correctly, security cards show icons, callout box displays, breadcrumbs present.

- [ ] **Step 2: Check JSON-LD structured data**

View page source on `/faq` — verify FAQPage JSON-LD contains all questions with plain-text answers.
View page source on `/about`, `/pricing`, etc. — verify BreadcrumbList JSON-LD is correct.

- [ ] **Step 3: Fix any visual discrepancies**

If spacing, fonts, or layout differ from the original, adjust the MDX content or components to match.

- [ ] **Step 4: Run production build**

Run: `npx next build`

Expected: Clean build with no warnings related to the marketing pages.

- [ ] **Step 5: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: visual alignment adjustments for MDX marketing pages"
```
