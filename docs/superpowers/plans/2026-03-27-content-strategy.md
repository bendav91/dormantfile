# Content Strategy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 28-page content layer (6 trust pages, 10 guides, 10 answers, 2 indexes) with SEO infrastructure (sitemap, robots, structured data, Open Graph) to drive organic traffic and convert visitors for DormantFile.

**Architecture:** MDX files at project root (`/content/`) rendered via `next-mdx-remote/rsc`. All public content pages live under a `(marketing)` route group with shared nav/footer layout. Trust pages are TSX components; guides and answers are MDX. SEO infrastructure uses Next.js built-in sitemap/robots generation plus JSON-LD `<script>` tags.

**Tech Stack:** Next.js 16.2 App Router, React 19, Tailwind CSS v4, `next-mdx-remote` v5, `gray-matter`, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-content-strategy-design.md`

---

## File Structure

### New files to create

```
# Content directory (project root, alongside src/)
content/
  guides/
    how-to-file-dormant-company-accounts.mdx
    how-to-file-nil-ct600.mdx
    cato-closed-options.mdx
    late-filing-penalties.mdx
    do-i-need-ct600-dormant-company.mdx
    how-to-check-company-dormant.mdx
    dormant-company-filing-deadlines.mdx
    cost-to-file-dormant-accounts.mdx
    how-to-close-dormant-company.mdx
    first-year-filing-new-company.mdx
  answers/
    what-is-a-ct600.mdx
    what-is-a-utr-number.mdx
    what-is-an-accounting-reference-date.mdx
    what-is-a-companies-house-authentication-code.mdx
    what-are-dormant-company-accounts-aa02.mdx
    what-is-the-hmrc-gateway.mdx
    what-is-a-confirmation-statement-cs01.mdx
    what-are-companies-house-late-filing-penalties.mdx
    what-does-dormant-mean-companies-act.mdx
    what-is-the-difference-between-dissolved-and-dormant.mdx

# Source code
src/
  lib/content/
    types.ts              # ContentFrontmatter, ContentItem, ContentCategory types
    mdx.ts                # MDX loader: getGuides, getAnswers, getContentBySlug, getRelatedContent
    json-ld.tsx            # ArticleJsonLd, BreadcrumbJsonLd, FAQPageJsonLd, OrganizationJsonLd
  components/marketing/
    MarketingNav.tsx       # Sticky nav with Pricing link, Resources dropdown, Sign in, Get started
    MarketingFooter.tsx    # Footer with About, Security, FAQ, Contact, Privacy, Terms links
    Breadcrumbs.tsx        # Breadcrumb trail component
    ContentCTA.tsx         # Bottom CTA block ("Ready to file...")
    RelatedContent.tsx     # "Related articles" section for guides
    MDXComponents.tsx      # Styled HTML elements for MDX rendering (h1, h2, p, ul, a, etc.)
    FAQAccordion.tsx       # Client component: expandable FAQ items
    ContactForm.tsx        # Client component: contact form with Resend
  app/
    sitemap.ts             # Auto-generated sitemap from static routes + MDX files
    robots.ts              # Allow all crawlers, reference sitemap
    (marketing)/
      layout.tsx           # Shared layout: MarketingNav + content container + MarketingFooter
      about/page.tsx
      security/page.tsx
      how-it-works/page.tsx
      pricing/page.tsx
      faq/page.tsx
      contact/page.tsx
      privacy/page.tsx     # Migrated from src/app/privacy/page.tsx (nav/footer removed)
      terms/page.tsx       # Migrated from src/app/terms/page.tsx (nav/footer removed)
      guides/
        page.tsx           # Index: all guides grouped by category
        [slug]/page.tsx    # Dynamic route rendering guide MDX
      answers/
        page.tsx           # Index: all answers alphabetically
        [slug]/page.tsx    # Dynamic route rendering answer MDX
    api/contact/route.ts   # POST endpoint for contact form via Resend

# Tests
src/__tests__/lib/content/
    mdx.test.ts            # Tests for content loader functions
    json-ld.test.ts        # Tests for JSON-LD generators

# Test fixtures
src/__tests__/fixtures/content/
    guides/test-guide-a.mdx
    guides/test-guide-b.mdx
    answers/test-answer-a.mdx
```

### Files to modify

```
src/app/layout.tsx         # Update root metadata title/description
src/app/page.tsx           # Update footer links, add "See full walkthrough" link to how-it-works section
package.json               # Add next-mdx-remote, gray-matter dependencies
```

### Files to delete

```
src/app/privacy/page.tsx   # Moved to (marketing) group
src/app/terms/page.tsx     # Moved to (marketing) group
```

---

## Task Dependencies

```
Task 1 (deps + dirs) ─┬─► Task 2 (content loader) ─┬─► Task 5 (guide/answer routes)
                       │                             ├─► Task 6 (SEO infra)
                       │                             │
Task 3 (components) ───┴─► Task 4 (layout+migrate) ─┴─► Task 7 (trust pages)
                                                     │
                                            Task 5 ──┴─► Tasks 8-11 (content)
                                                     │
                                            All ─────┴─► Task 12 (landing + verify)
```

Tasks 1 & 3 can run in parallel. Tasks 5, 6 & 7 can run in parallel after their deps. Tasks 8-11 can all run in parallel.

---

### Task 1: Install Dependencies & Create Directory Structure

**Files:**
- Modify: `package.json`
- Create: `content/guides/.gitkeep`, `content/answers/.gitkeep`

**Depends on:** Nothing

- [ ] **Step 1: Install next-mdx-remote and gray-matter**

```bash
cd /Users/ben/Documents/tax-project && npm install next-mdx-remote gray-matter
```

- [ ] **Step 2: Create content directory structure**

```bash
mkdir -p content/guides content/answers
```

- [ ] **Step 3: Create test fixture directory**

```bash
mkdir -p src/__tests__/fixtures/content/guides src/__tests__/fixtures/content/answers
```

- [ ] **Step 4: Create test fixture files**

Create `src/__tests__/fixtures/content/guides/test-guide-a.mdx`:

```mdx
---
title: "Test Guide A"
description: "A test guide about filing"
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["test", "filing"]
---

This is test guide A content.
```

Create `src/__tests__/fixtures/content/guides/test-guide-b.mdx`:

```mdx
---
title: "Another Test Guide"
description: "A test guide about deadlines"
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "deadlines"
keywords: ["test", "deadlines"]
---

This is test guide B content.
```

Create `src/__tests__/fixtures/content/answers/test-answer-a.mdx`:

```mdx
---
title: "Test Answer A"
description: "A test answer about filing"
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["test"]
---

This is test answer A content.
```

- [ ] **Step 5: Verify dependencies installed**

```bash
cd /Users/ben/Documents/tax-project && node -e "require('next-mdx-remote/rsc'); require('gray-matter'); console.log('OK')"
```

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json content/ src/__tests__/fixtures/content/
git commit -m "chore: add next-mdx-remote, gray-matter deps and content directory structure"
```

---

### Task 2: Content Types & MDX Loader

**Files:**
- Create: `src/lib/content/types.ts`
- Create: `src/lib/content/mdx.ts`
- Create: `src/components/marketing/MDXComponents.tsx`
- Create: `src/__tests__/lib/content/mdx.test.ts`

**Depends on:** Task 1

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/content/mdx.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import path from "path";
import { getContentItems, getRelatedContent } from "@/lib/content/mdx";

const fixtureDir = path.join(process.cwd(), "src/__tests__/fixtures/content");

describe("getContentItems", () => {
  it("returns all guides with correct slugs and frontmatter", () => {
    const items = getContentItems("guides", fixtureDir);
    expect(items).toHaveLength(2);
    // Sorted alphabetically by title: "Another Test Guide" < "Test Guide A"
    expect(items[0].slug).toBe("test-guide-b");
    expect(items[0].frontmatter.title).toBe("Another Test Guide");
    expect(items[0].frontmatter.category).toBe("deadlines");
    expect(items[1].slug).toBe("test-guide-a");
    expect(items[1].frontmatter.title).toBe("Test Guide A");
    expect(items[1].frontmatter.category).toBe("filing");
  });

  it("returns all answers", () => {
    const items = getContentItems("answers", fixtureDir);
    expect(items).toHaveLength(1);
    expect(items[0].slug).toBe("test-answer-a");
    expect(items[0].frontmatter.title).toBe("Test Answer A");
  });

  it("returns empty array for non-existent directory", () => {
    const items = getContentItems("guides", "/nonexistent/path");
    expect(items).toEqual([]);
  });

  it("derives slug from filename", () => {
    const items = getContentItems("guides", fixtureDir);
    items.forEach((item) => {
      expect(item.slug).not.toContain(".mdx");
      expect(item.slug).toMatch(/^[a-z0-9-]+$/);
    });
  });
});

describe("getRelatedContent", () => {
  it("returns items in the same category, excluding current slug", () => {
    const related = getRelatedContent("guides", "filing", "some-other-slug", 3, fixtureDir);
    expect(related).toHaveLength(1);
    expect(related[0].slug).toBe("test-guide-a");
  });

  it("excludes the current slug from results", () => {
    const related = getRelatedContent("guides", "filing", "test-guide-a", 3, fixtureDir);
    expect(related).toHaveLength(0);
  });

  it("respects the limit parameter", () => {
    const related = getRelatedContent("guides", "filing", "other", 0, fixtureDir);
    expect(related).toHaveLength(0);
  });

  it("returns empty array when no items match category", () => {
    const related = getRelatedContent("guides", "costs", "other", 3, fixtureDir);
    expect(related).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/ben/Documents/tax-project && npx vitest run src/__tests__/lib/content/mdx.test.ts
```

Expected: FAIL — modules not found

- [ ] **Step 3: Create content types**

Create `src/lib/content/types.ts`:

```typescript
export type ContentCategory =
  | "filing"
  | "deadlines"
  | "getting-started"
  | "costs"
  | "eligibility"
  | "alternatives"
  | "admin";

export interface ContentFrontmatter {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  category: ContentCategory;
  keywords: string[];
}

export interface ContentItem {
  slug: string;
  frontmatter: ContentFrontmatter;
}
```

- [ ] **Step 4: Create MDX components**

Create `src/components/marketing/MDXComponents.tsx`:

```tsx
import Link from "next/link";

export const mdxComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      style={{
        fontSize: "2rem",
        fontWeight: 700,
        color: "#1E293B",
        marginTop: "2rem",
        marginBottom: "1rem",
        lineHeight: 1.2,
      }}
      {...props}
    />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      style={{
        fontSize: "1.5rem",
        fontWeight: 600,
        color: "#1E293B",
        marginTop: "2rem",
        marginBottom: "0.75rem",
        lineHeight: 1.3,
      }}
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3
      style={{
        fontSize: "1.25rem",
        fontWeight: 600,
        color: "#1E293B",
        marginTop: "1.5rem",
        marginBottom: "0.5rem",
        lineHeight: 1.4,
      }}
      {...props}
    />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      style={{
        fontSize: "1rem",
        lineHeight: 1.7,
        color: "#475569",
        marginBottom: "1rem",
      }}
      {...props}
    />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      style={{
        paddingLeft: "1.5rem",
        marginBottom: "1rem",
        listStyleType: "disc",
      }}
      {...props}
    />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      style={{
        paddingLeft: "1.5rem",
        marginBottom: "1rem",
        listStyleType: "decimal",
      }}
      {...props}
    />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li
      style={{
        fontSize: "1rem",
        lineHeight: 1.7,
        color: "#475569",
        marginBottom: "0.25rem",
      }}
      {...props}
    />
  ),
  a: ({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    if (href?.startsWith("/")) {
      return (
        <Link
          href={href}
          style={{ color: "#2563EB", textDecoration: "underline" }}
          {...props}
        />
      );
    }
    return (
      <a
        href={href}
        style={{ color: "#2563EB", textDecoration: "underline" }}
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      />
    );
  },
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong style={{ fontWeight: 600, color: "#1E293B" }} {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      style={{
        borderLeft: "3px solid #2563EB",
        paddingLeft: "1rem",
        margin: "1.5rem 0",
        fontStyle: "italic",
        color: "#64748B",
      }}
      {...props}
    />
  ),
  table: (props: React.HTMLAttributes<HTMLTableElement>) => (
    <div style={{ overflowX: "auto", marginBottom: "1rem" }}>
      <table
        style={{ width: "100%", borderCollapse: "collapse" }}
        {...props}
      />
    </div>
  ),
  th: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <th
      style={{
        textAlign: "left",
        padding: "0.75rem",
        borderBottom: "2px solid #E2E8F0",
        fontWeight: 600,
        color: "#1E293B",
      }}
      {...props}
    />
  ),
  td: (props: React.HTMLAttributes<HTMLTableCellElement>) => (
    <td
      style={{
        padding: "0.75rem",
        borderBottom: "1px solid #E2E8F0",
        color: "#475569",
      }}
      {...props}
    />
  ),
};
```

- [ ] **Step 5: Create MDX loader**

Create `src/lib/content/mdx.ts`:

```typescript
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { compileMDX } from "next-mdx-remote/rsc";
import { mdxComponents } from "@/components/marketing/MDXComponents";
import type { ContentFrontmatter, ContentItem } from "./types";

const DEFAULT_CONTENT_DIR = path.join(process.cwd(), "content");

export function getContentItems(
  type: "guides" | "answers",
  contentDir = DEFAULT_CONTENT_DIR,
): ContentItem[] {
  const dir = path.join(contentDir, type);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));

  return files
    .map((filename) => {
      const slug = filename.replace(".mdx", "");
      const filePath = path.join(dir, filename);
      const fileContent = fs.readFileSync(filePath, "utf-8");
      const { data } = matter(fileContent);

      return {
        slug,
        frontmatter: data as ContentFrontmatter,
      };
    })
    .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));
}

export async function getContentBySlug(
  type: "guides" | "answers",
  slug: string,
  contentDir = DEFAULT_CONTENT_DIR,
) {
  const filePath = path.join(contentDir, type, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;

  const fileContent = fs.readFileSync(filePath, "utf-8");

  const { content, frontmatter } = await compileMDX<ContentFrontmatter>({
    source: fileContent,
    options: { parseFrontmatter: true },
    components: mdxComponents,
  });

  return { content, frontmatter, slug };
}

export function getGuides() {
  return getContentItems("guides");
}

export function getAnswers() {
  return getContentItems("answers");
}

export async function getGuideBySlug(slug: string) {
  return getContentBySlug("guides", slug);
}

export async function getAnswerBySlug(slug: string) {
  return getContentBySlug("answers", slug);
}

export function getRelatedContent(
  type: "guides" | "answers",
  category: string,
  currentSlug: string,
  limit = 3,
  contentDir = DEFAULT_CONTENT_DIR,
): ContentItem[] {
  const items = getContentItems(type, contentDir);
  return items
    .filter(
      (item) =>
        item.frontmatter.category === category && item.slug !== currentSlug,
    )
    .slice(0, limit);
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd /Users/ben/Documents/tax-project && npx vitest run src/__tests__/lib/content/mdx.test.ts
```

Expected: All 8 tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/content/ src/components/marketing/MDXComponents.tsx src/__tests__/lib/content/mdx.test.ts
git commit -m "feat(content): add MDX content loader, types, and styled MDX components"
```

---

### Task 3: Marketing Shared Components

**Files:**
- Create: `src/components/marketing/MarketingNav.tsx`
- Create: `src/components/marketing/MarketingFooter.tsx`
- Create: `src/components/marketing/Breadcrumbs.tsx`
- Create: `src/components/marketing/ContentCTA.tsx`
- Create: `src/components/marketing/RelatedContent.tsx`

**Depends on:** Nothing (can run in parallel with Tasks 1 & 2)

- [ ] **Step 1: Create MarketingNav**

Create `src/components/marketing/MarketingNav.tsx`:

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

export function MarketingNav() {
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setResourcesOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #E2E8F0",
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-semibold"
          style={{ color: "#2563EB", textDecoration: "none" }}
        >
          DormantFile
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="text-sm font-medium transition-colors duration-200"
            style={{ color: "#1E293B", textDecoration: "none" }}
          >
            Pricing
          </Link>
          <div ref={dropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setResourcesOpen(!resourcesOpen)}
              className="text-sm font-medium transition-colors duration-200 flex items-center gap-1"
              style={{
                color: "#1E293B",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Resources
              <ChevronDown
                size={14}
                style={{
                  transform: resourcesOpen ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>
            {resourcesOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: "0.5rem",
                  backgroundColor: "#ffffff",
                  border: "1px solid #E2E8F0",
                  borderRadius: "0.5rem",
                  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  minWidth: "10rem",
                  padding: "0.25rem 0",
                  zIndex: 51,
                }}
              >
                {[
                  { href: "/guides", label: "Guides" },
                  { href: "/faq", label: "FAQ" },
                  { href: "/security", label: "Security" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setResourcesOpen(false)}
                    className="block text-sm transition-colors duration-200"
                    style={{
                      padding: "0.5rem 1rem",
                      color: "#475569",
                      textDecoration: "none",
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/login"
            className="text-sm font-medium transition-colors duration-200 nav-signin-link"
            style={{ color: "#1E293B", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5"
            style={{
              backgroundColor: "#F97316",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Create MarketingFooter**

Create `src/components/marketing/MarketingFooter.tsx`:

```tsx
import Link from "next/link";

const footerLinks = [
  { href: "/about", label: "About" },
  { href: "/security", label: "Security" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function MarketingFooter() {
  return (
    <footer
      style={{
        backgroundColor: "#F1F5F9",
        borderTop: "1px solid #E2E8F0",
      }}
      className="py-8 px-6"
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-wrap justify-center gap-6 mb-4">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors duration-200"
              style={{ color: "#64748B", textDecoration: "none" }}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p
          className="text-center text-xs"
          style={{ color: "#94A3B8" }}
        >
          &copy; {new Date().getFullYear()} DormantFile. Not an accountancy firm
          &mdash; software tool only.
        </p>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Create Breadcrumbs**

Create `src/components/marketing/Breadcrumbs.tsx`:

```tsx
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ marginBottom: "1.5rem" }}>
      <ol
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          listStyle: "none",
          padding: 0,
          margin: 0,
          fontSize: "0.875rem",
        }}
      >
        <li>
          <Link
            href="/"
            style={{ color: "#64748B", textDecoration: "none" }}
          >
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span aria-hidden="true" style={{ color: "#94A3B8" }}>
              ›
            </span>
            {item.href ? (
              <Link
                href={item.href}
                style={{ color: "#64748B", textDecoration: "none" }}
              >
                {item.label}
              </Link>
            ) : (
              <span style={{ color: "#475569" }}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
```

- [ ] **Step 4: Create ContentCTA**

Create `src/components/marketing/ContentCTA.tsx`:

```tsx
import Link from "next/link";

export function ContentCTA() {
  return (
    <div
      style={{
        marginTop: "3rem",
        padding: "2rem",
        backgroundColor: "#F8FAFC",
        borderRadius: "0.75rem",
        textAlign: "center",
        border: "1px solid #E2E8F0",
      }}
    >
      <h3
        className="text-xl font-semibold mb-2"
        style={{ color: "#1E293B" }}
      >
        Ready to file your dormant company returns?
      </h3>
      <p
        className="mb-6"
        style={{ color: "#64748B", fontSize: "0.9375rem" }}
      >
        Set up in minutes. File in seconds. Done for the year.
      </p>
      <Link
        href="/register"
        className="inline-block font-semibold rounded-lg transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
        style={{
          backgroundColor: "#F97316",
          color: "#ffffff",
          padding: "12px 28px",
          borderRadius: "8px",
          textDecoration: "none",
          fontSize: "0.9375rem",
        }}
      >
        Get started &rarr;
      </Link>
    </div>
  );
}
```

- [ ] **Step 5: Create RelatedContent**

Create `src/components/marketing/RelatedContent.tsx`:

```tsx
import Link from "next/link";
import type { ContentItem } from "@/lib/content/types";

interface RelatedContentProps {
  items: ContentItem[];
  type: "guides" | "answers";
}

export function RelatedContent({ items, type }: RelatedContentProps) {
  if (items.length === 0) return null;

  return (
    <div
      style={{
        marginTop: "2rem",
        paddingTop: "2rem",
        borderTop: "1px solid #E2E8F0",
      }}
    >
      <h3
        className="text-lg font-semibold mb-3"
        style={{ color: "#1E293B" }}
      >
        Related articles
      </h3>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {items.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/${type}/${item.slug}`}
              style={{
                color: "#2563EB",
                textDecoration: "none",
                fontSize: "0.9375rem",
              }}
            >
              {item.frontmatter.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/marketing/MarketingNav.tsx src/components/marketing/MarketingFooter.tsx src/components/marketing/Breadcrumbs.tsx src/components/marketing/ContentCTA.tsx src/components/marketing/RelatedContent.tsx
git commit -m "feat(marketing): add shared nav, footer, breadcrumbs, CTA, and related content components"
```

---

### Task 4: Marketing Layout & Page Migration

**Files:**
- Create: `src/app/(marketing)/layout.tsx`
- Create: `src/app/(marketing)/privacy/page.tsx` (migrated)
- Create: `src/app/(marketing)/terms/page.tsx` (migrated)
- Delete: `src/app/privacy/page.tsx`
- Delete: `src/app/terms/page.tsx`

**Depends on:** Task 3

- [ ] **Step 1: Create marketing layout**

Create `src/app/(marketing)/layout.tsx`:

```tsx
import { IBM_Plex_Sans } from "next/font/google";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={ibmPlexSans.className}
      style={{ backgroundColor: "#F8FAFC", color: "#1E293B", minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <MarketingNav />
      <main
        style={{
          maxWidth: "48rem",
          width: "100%",
          margin: "0 auto",
          padding: "2.5rem 1.5rem",
          flex: 1,
        }}
      >
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Migrate privacy page**

Read `src/app/privacy/page.tsx`. Create `src/app/(marketing)/privacy/page.tsx` by applying these precise transformations:

1. **Remove imports:** `IBM_Plex_Sans` from `next/font/google`, `ArrowLeft` from `lucide-react`, `Link` from `next/link` (not used in content — email links use `<a>` tags)
2. **Add import:** `import type { Metadata } from "next";`
3. **Keep unchanged:** the `metadata` export, the `sectionHeading`/`paragraph`/`listItem` style constants
4. **In the component function:**
   - Remove the outer `<div className={ibmPlexSans.className} style={{...}}>` wrapper
   - Remove the entire `<nav>` block (original lines 44-66)
   - Remove the entire `<footer>` block (original lines 240-263)
   - Remove `<main className="max-w-3xl mx-auto px-6 py-16">` and `</main>` tags (keep ALL children — original lines 69-237)
   - Wrap the remaining children in a `<>` fragment

The resulting file structure is:

```tsx
import type { Metadata } from "next";

export const metadata: Metadata = { /* unchanged */ };
const sectionHeading: React.CSSProperties = { /* unchanged */ };
const paragraph: React.CSSProperties = { /* unchanged */ };
const listItem: React.CSSProperties = { /* unchanged */ };

export default function PrivacyPolicyPage() {
  return (
    <>
      <h1 style={{ fontSize: "36px", ... }}>Privacy Policy</h1>
      <p style={{ ... }}>Last updated: 27 March 2026</p>
      {/* All 10 content sections from the original file — unchanged JSX */}
    </>
  );
}
```

This is a mechanical extraction: no content changes, just removing the nav/footer/wrapper since the `(marketing)` layout now provides them.

- [ ] **Step 3: Migrate terms page**

Read `src/app/terms/page.tsx`. Apply the same transformation as the privacy page:

1. **Remove imports:** `IBM_Plex_Sans`, `ArrowLeft`, `Link`
2. **Add import:** `import type { Metadata } from "next";`
3. **Keep:** metadata, style constants
4. **Remove:** outer div wrapper, nav block (lines 44-66), footer block (lines 230-253), `<main>`/`</main>` tags (keep children from original lines 68-228)
5. **Wrap** remaining content in `<>` fragment

- [ ] **Step 4: Delete original files**

```bash
rm src/app/privacy/page.tsx && rmdir src/app/privacy
rm src/app/terms/page.tsx && rmdir src/app/terms
```

- [ ] **Step 5: Verify pages still render**

```bash
cd /Users/ben/Documents/tax-project && npx next build 2>&1 | tail -20
```

Expected: Build succeeds. Routes `/privacy` and `/terms` should appear under the `(marketing)` group.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(marketing\)/layout.tsx src/app/\(marketing\)/privacy/ src/app/\(marketing\)/terms/
git rm src/app/privacy/page.tsx src/app/terms/page.tsx
git commit -m "feat(marketing): add shared layout, migrate privacy and terms pages"
```

---

### Task 5: Guide & Answer Routes with Index Pages

**Files:**
- Create: `src/app/(marketing)/guides/[slug]/page.tsx`
- Create: `src/app/(marketing)/guides/page.tsx`
- Create: `src/app/(marketing)/answers/[slug]/page.tsx`
- Create: `src/app/(marketing)/answers/page.tsx`

**Depends on:** Tasks 2 and 4

- [ ] **Step 1: Create guide dynamic route**

Create `src/app/(marketing)/guides/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getGuideBySlug,
  getGuides,
  getRelatedContent,
} from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { RelatedContent } from "@/components/marketing/RelatedContent";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/lib/content/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const guides = getGuides();
  return guides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) return {};

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/guides/${slug}`;

  return {
    title: `${guide.frontmatter.title} | DormantFile`,
    description: guide.frontmatter.description,
    keywords: guide.frontmatter.keywords,
    openGraph: {
      title: guide.frontmatter.title,
      description: guide.frontmatter.description,
      type: "article",
      url,
      siteName: "DormantFile",
    },
    alternates: { canonical: url },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = await getGuideBySlug(slug);
  if (!guide) notFound();

  const related = getRelatedContent(
    "guides",
    guide.frontmatter.category,
    slug,
  );
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <>
      <ArticleJsonLd
        headline={guide.frontmatter.title}
        datePublished={guide.frontmatter.publishedAt}
        dateModified={guide.frontmatter.updatedAt}
        url={`${baseUrl}/guides/${slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Guides", url: `${baseUrl}/guides` },
          { name: guide.frontmatter.title },
        ]}
      />
      <Breadcrumbs
        items={[
          { label: "Guides", href: "/guides" },
          { label: guide.frontmatter.title },
        ]}
      />
      <article>
        <h1
          className="text-3xl sm:text-4xl font-bold leading-tight mb-3"
          style={{ color: "#1E293B" }}
        >
          {guide.frontmatter.title}
        </h1>
        <p className="text-sm mb-8" style={{ color: "#94A3B8" }}>
          Updated{" "}
          {new Date(guide.frontmatter.updatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        {guide.content}
      </article>
      <RelatedContent items={related} type="guides" />
      <ContentCTA />
    </>
  );
}
```

- [ ] **Step 2: Create guides index page**

Create `src/app/(marketing)/guides/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getGuides } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import type { ContentCategory } from "@/lib/content/types";

export const metadata: Metadata = {
  title: "Guides | DormantFile",
  description:
    "Guides for UK dormant company directors: filing accounts, CT600 returns, deadlines, penalties, and more.",
  openGraph: {
    title: "Guides | DormantFile",
    description:
      "Guides for UK dormant company directors: filing accounts, CT600 returns, deadlines, penalties, and more.",
    type: "website",
    siteName: "DormantFile",
  },
};

const categoryLabels: Record<ContentCategory, string> = {
  filing: "Filing",
  deadlines: "Deadlines & Penalties",
  "getting-started": "Getting Started",
  costs: "Costs",
  eligibility: "Eligibility",
  alternatives: "Alternatives",
  admin: "Company Admin",
};

const categoryOrder: ContentCategory[] = [
  "filing",
  "getting-started",
  "deadlines",
  "costs",
  "eligibility",
  "alternatives",
  "admin",
];

export default function GuidesIndexPage() {
  const guides = getGuides();

  const grouped = categoryOrder
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      items: guides.filter((g) => g.frontmatter.category === cat),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      <Breadcrumbs items={[{ label: "Guides" }]} />
      <h1
        className="text-3xl sm:text-4xl font-bold leading-tight mb-3"
        style={{ color: "#1E293B" }}
      >
        Guides
      </h1>
      <p className="text-base mb-10" style={{ color: "#64748B" }}>
        Everything you need to know about filing for a dormant UK company.
      </p>

      {grouped.map((group) => (
        <section key={group.category} style={{ marginBottom: "2.5rem" }}>
          <h2
            className="text-lg font-semibold mb-3"
            style={{ color: "#1E293B" }}
          >
            {group.label}
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {group.items.map((item) => (
              <li
                key={item.slug}
                style={{
                  padding: "1rem",
                  border: "1px solid #E2E8F0",
                  borderRadius: "0.5rem",
                  backgroundColor: "#ffffff",
                }}
              >
                <Link
                  href={`/guides/${item.slug}`}
                  style={{
                    textDecoration: "none",
                    color: "#2563EB",
                    fontWeight: 500,
                    fontSize: "0.9375rem",
                  }}
                >
                  {item.frontmatter.title}
                </Link>
                <p
                  className="text-sm mt-1"
                  style={{ color: "#64748B", margin: 0 }}
                >
                  {item.frontmatter.description}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <ContentCTA />
    </>
  );
}
```

- [ ] **Step 3: Create answer dynamic route**

Create `src/app/(marketing)/answers/[slug]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAnswerBySlug, getAnswers } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/lib/content/json-ld";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const answers = getAnswers();
  return answers.map((answer) => ({ slug: answer.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const answer = await getAnswerBySlug(slug);
  if (!answer) return {};

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/answers/${slug}`;

  return {
    title: `${answer.frontmatter.title} | DormantFile`,
    description: answer.frontmatter.description,
    keywords: answer.frontmatter.keywords,
    openGraph: {
      title: answer.frontmatter.title,
      description: answer.frontmatter.description,
      type: "article",
      url,
      siteName: "DormantFile",
    },
    alternates: { canonical: url },
  };
}

export default async function AnswerPage({ params }: Props) {
  const { slug } = await params;
  const answer = await getAnswerBySlug(slug);
  if (!answer) notFound();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  return (
    <>
      <ArticleJsonLd
        headline={answer.frontmatter.title}
        datePublished={answer.frontmatter.publishedAt}
        dateModified={answer.frontmatter.updatedAt}
        url={`${baseUrl}/answers/${slug}`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Answers", url: `${baseUrl}/answers` },
          { name: answer.frontmatter.title },
        ]}
      />
      <Breadcrumbs
        items={[
          { label: "Answers", href: "/answers" },
          { label: answer.frontmatter.title },
        ]}
      />
      <article>
        <h1
          className="text-3xl sm:text-4xl font-bold leading-tight mb-3"
          style={{ color: "#1E293B" }}
        >
          {answer.frontmatter.title}
        </h1>
        <p className="text-sm mb-8" style={{ color: "#94A3B8" }}>
          Updated{" "}
          {new Date(answer.frontmatter.updatedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        {answer.content}
      </article>
      <ContentCTA />
    </>
  );
}
```

- [ ] **Step 4: Create answers index page**

Create `src/app/(marketing)/answers/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { getAnswers } from "@/lib/content/mdx";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";

export const metadata: Metadata = {
  title: "Answers | DormantFile",
  description:
    "Quick answers to common questions about dormant company filing: CT600, UTR numbers, deadlines, and more.",
  openGraph: {
    title: "Answers | DormantFile",
    description:
      "Quick answers to common questions about dormant company filing.",
    type: "website",
    siteName: "DormantFile",
  },
};

export default function AnswersIndexPage() {
  const answers = getAnswers();

  return (
    <>
      <Breadcrumbs items={[{ label: "Answers" }]} />
      <h1
        className="text-3xl sm:text-4xl font-bold leading-tight mb-3"
        style={{ color: "#1E293B" }}
      >
        Quick Answers
      </h1>
      <p className="text-base mb-10" style={{ color: "#64748B" }}>
        Short explanations of the terms and concepts you&apos;ll come across
        when filing for a dormant company.
      </p>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        {answers.map((item) => (
          <li
            key={item.slug}
            style={{
              padding: "1rem",
              border: "1px solid #E2E8F0",
              borderRadius: "0.5rem",
              backgroundColor: "#ffffff",
            }}
          >
            <Link
              href={`/answers/${item.slug}`}
              style={{
                textDecoration: "none",
                color: "#2563EB",
                fontWeight: 500,
                fontSize: "0.9375rem",
              }}
            >
              {item.frontmatter.title}
            </Link>
            <p
              className="text-sm mt-1"
              style={{ color: "#64748B", margin: 0 }}
            >
              {item.frontmatter.description}
            </p>
          </li>
        ))}
      </ul>

      <ContentCTA />
    </>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(marketing\)/guides/ src/app/\(marketing\)/answers/
git commit -m "feat(content): add guide and answer dynamic routes with index pages"
```

---

### Task 6: SEO Infrastructure

**Files:**
- Create: `src/lib/content/json-ld.tsx`
- Create: `src/__tests__/lib/content/json-ld.test.ts`
- Create: `src/app/sitemap.ts`
- Create: `src/app/robots.ts`
- Modify: `src/app/layout.tsx`

**Depends on:** Task 2

- [ ] **Step 1: Write failing JSON-LD tests**

Create `src/__tests__/lib/content/json-ld.test.ts`:

```typescript
// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  ArticleJsonLd,
  BreadcrumbJsonLd,
  FAQPageJsonLd,
  OrganizationJsonLd,
} from "@/lib/content/json-ld";

function getJsonLd(container: HTMLElement) {
  const script = container.querySelector('script[type="application/ld+json"]');
  return script ? JSON.parse(script.textContent || "") : null;
}

describe("ArticleJsonLd", () => {
  it("renders valid Article schema", () => {
    const { container } = render(
      <ArticleJsonLd
        headline="Test Article"
        datePublished="2026-03-27"
        dateModified="2026-03-27"
        url="https://dormantfile.co.uk/guides/test"
      />,
    );
    const data = getJsonLd(container);
    expect(data["@type"]).toBe("Article");
    expect(data.headline).toBe("Test Article");
    expect(data.datePublished).toBe("2026-03-27");
    expect(data.author.name).toBe("DormantFile");
  });
});

describe("BreadcrumbJsonLd", () => {
  it("renders BreadcrumbList with correct positions", () => {
    const { container } = render(
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "https://dormantfile.co.uk" },
          { name: "Guides", url: "https://dormantfile.co.uk/guides" },
          { name: "Test Guide" },
        ]}
      />,
    );
    const data = getJsonLd(container);
    expect(data["@type"]).toBe("BreadcrumbList");
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0].position).toBe(1);
    expect(data.itemListElement[2].item).toBeUndefined();
  });
});

describe("FAQPageJsonLd", () => {
  it("renders FAQPage schema with questions", () => {
    const { container } = render(
      <FAQPageJsonLd
        items={[
          { question: "Is it safe?", answer: "Yes, very safe." },
          { question: "How much?", answer: "£19/year." },
        ]}
      />,
    );
    const data = getJsonLd(container);
    expect(data["@type"]).toBe("FAQPage");
    expect(data.mainEntity).toHaveLength(2);
    expect(data.mainEntity[0]["@type"]).toBe("Question");
    expect(data.mainEntity[0].acceptedAnswer.text).toBe("Yes, very safe.");
  });
});

describe("OrganizationJsonLd", () => {
  it("renders Organization schema", () => {
    const { container } = render(<OrganizationJsonLd />);
    const data = getJsonLd(container);
    expect(data["@type"]).toBe("Organization");
    expect(data.name).toBe("DormantFile");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/ben/Documents/tax-project && npx vitest run src/__tests__/lib/content/json-ld.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Create JSON-LD components**

Create `src/lib/content/json-ld.tsx`:

```tsx
interface ArticleJsonLdProps {
  headline: string;
  datePublished: string;
  dateModified: string;
  url: string;
}

export function ArticleJsonLd({
  headline,
  datePublished,
  dateModified,
  url,
}: ArticleJsonLdProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    datePublished,
    dateModified,
    url,
    author: { "@type": "Organization", name: "DormantFile" },
    publisher: { "@type": "Organization", name: "DormantFile" },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  url?: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface FAQItem {
  question: string;
  answer: string;
}

export function FAQPageJsonLd({ items }: { items: FAQItem[] }) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "DormantFile",
    url: process.env.NEXT_PUBLIC_APP_URL,
    description:
      "Dormant company filing made simple. File your annual accounts and nil CT600 returns online.",
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/ben/Documents/tax-project && npx vitest run src/__tests__/lib/content/json-ld.test.ts
```

Expected: All 4 tests PASS

- [ ] **Step 5: Create sitemap**

Create `src/app/sitemap.ts`:

```typescript
import type { MetadataRoute } from "next";
import { getGuides, getAnswers } from "@/lib/content/mdx";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export default function sitemap(): MetadataRoute.Sitemap {
  const guides = getGuides();
  const answers = getAnswers();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/security",
    "/how-it-works",
    "/pricing",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/guides",
    "/answers",
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const guideRoutes: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${BASE_URL}/guides/${guide.slug}`,
    lastModified: new Date(guide.frontmatter.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const answerRoutes: MetadataRoute.Sitemap = answers.map((answer) => ({
    url: `${BASE_URL}/answers/${answer.slug}`,
    lastModified: new Date(answer.frontmatter.updatedAt),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...guideRoutes, ...answerRoutes];
}
```

- [ ] **Step 6: Create robots**

Create `src/app/robots.ts`:

```typescript
import type { MetadataRoute } from "next";

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://dormantfile.co.uk";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 7: Update root metadata**

In `src/app/layout.tsx`, update the metadata:

```typescript
// Change from:
export const metadata: Metadata = {
  title: "DormantFile - Nil CT600 Filing Made Simple",
  description: "File your nil CT600 tax return quickly and easily with DormantFile.",
};

// To:
export const metadata: Metadata = {
  title: "DormantFile - Dormant Company Filing Made Simple",
  description:
    "File your dormant company accounts and nil CT600 tax returns online. Direct submission to Companies House and HMRC.",
};
```

- [ ] **Step 8: Run all tests**

```bash
cd /Users/ben/Documents/tax-project && npx vitest run
```

Expected: All tests pass

- [ ] **Step 9: Commit**

```bash
git add src/lib/content/json-ld.tsx src/__tests__/lib/content/json-ld.test.ts src/app/sitemap.ts src/app/robots.ts src/app/layout.tsx
git commit -m "feat(seo): add sitemap, robots, JSON-LD structured data, and update root metadata"
```

---

### Task 7: Trust Pages

**Files:**
- Create: `src/app/(marketing)/about/page.tsx`
- Create: `src/app/(marketing)/security/page.tsx`
- Create: `src/app/(marketing)/how-it-works/page.tsx`
- Create: `src/app/(marketing)/pricing/page.tsx`
- Create: `src/app/(marketing)/faq/page.tsx`
- Create: `src/app/(marketing)/contact/page.tsx`
- Create: `src/components/marketing/FAQAccordion.tsx`
- Create: `src/components/marketing/ContactForm.tsx`
- Create: `src/app/api/contact/route.ts`

**Depends on:** Task 4

- [ ] **Step 1: Create /about page**

Create `src/app/(marketing)/about/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "About DormantFile",
  description:
    "Why DormantFile was built, who's behind it, and our mission to make dormant company filing affordable and painless.",
  openGraph: {
    title: "About DormantFile",
    description:
      "Why DormantFile was built, who's behind it, and our mission to make dormant company filing affordable and painless.",
    type: "website",
    siteName: "DormantFile",
  },
};

const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#1E293B",
  margin: "32px 0 12px 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#475569",
  margin: "0 0 16px 0",
};

export default function AboutPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "About" },
        ]}
      />
      <Breadcrumbs items={[{ label: "About" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 24px 0",
          letterSpacing: "-0.02em",
        }}
      >
        About DormantFile
      </h1>

      <p style={paragraph}>
        I built DormantFile because I needed it myself.
      </p>
      <p style={paragraph}>
        I run several dormant limited companies in the UK — holding structures, side projects that never launched, companies kept open for future plans. Every year, each one needs the same two filings: annual accounts to Companies House and a nil CT600 to HMRC. The companies do nothing, but the paperwork never stops.
      </p>
      <p style={paragraph}>
        For years, the free HMRC tool (CATO) handled the tax return side. It wasn&apos;t pretty, but it worked and it cost nothing. When HMRC announced CATO was closing on 31 March 2026, I looked at the alternatives: hire an accountant at £80-£150 per company per year for a zero-activity filing, or buy general-purpose accounting software that&apos;s overkill for a company with no transactions.
      </p>
      <p style={paragraph}>
        Neither option made sense. So I built DormantFile.
      </p>

      <h2 style={heading}>What DormantFile does</h2>
      <p style={paragraph}>
        DormantFile files two things for dormant UK limited companies:
      </p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Annual accounts</strong> — submitted directly to Companies House via their official software filing API.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Nil CT600 Corporation Tax return</strong> — submitted directly to HMRC via their GovTalk API.
        </li>
      </ul>
      <p style={paragraph}>
        Both filings confirm that your company was dormant during the accounting period. No transactions, no tax liability. DormantFile handles the XML, the submission, and the confirmation — you just click a button.
      </p>

      <h2 style={heading}>Who&apos;s behind it</h2>
      <p style={paragraph}>
        DormantFile is built and run by a solo founder based in the UK. I&apos;m a software engineer, not an accountant. DormantFile is a software tool — it prepares and submits your filings, but it does not provide accounting or tax advice. If your company has traded or you&apos;re unsure whether it qualifies as dormant, you should speak to a qualified accountant.
      </p>

      <h2 style={heading}>Our approach</h2>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Affordable</strong> — from £19/year, because filing a nil return shouldn&apos;t cost more than the company earns (which is nothing).
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Secure</strong> — your HMRC credentials are used once and never stored. Read our{" "}
          <Link href="/security" style={{ color: "#2563EB" }}>security page</Link> for the full details.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Simple</strong> — no features you don&apos;t need. No invoicing, no payroll, no VAT. Just the two filings a dormant company actually requires.
        </li>
      </ul>

      <ContentCTA />
    </>
  );
}
```

- [ ] **Step 2: Create /security page**

Create `src/app/(marketing)/security/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Lock, Eye, Server } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "Security | DormantFile",
  description:
    "How DormantFile handles your data and HMRC credentials. Your Gateway password is used once and never stored.",
  openGraph: {
    title: "Security | DormantFile",
    description:
      "How DormantFile handles your data and HMRC credentials. Your Gateway password is used once and never stored.",
    type: "website",
    siteName: "DormantFile",
  },
};

const heading: React.CSSProperties = {
  fontSize: "22px",
  fontWeight: 700,
  color: "#1E293B",
  margin: "32px 0 12px 0",
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#475569",
  margin: "0 0 16px 0",
};

export default function SecurityPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Security" },
        ]}
      />
      <Breadcrumbs items={[{ label: "Security" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 12px 0",
          letterSpacing: "-0.02em",
        }}
      >
        How we handle your data
      </h1>
      <p style={{ ...paragraph, fontSize: "17px", marginBottom: "32px" }}>
        The number one question we get: &ldquo;Can I trust you with my HMRC login?&rdquo; Here&apos;s exactly how it works.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.5rem", marginBottom: "2rem" }}>
        {[
          {
            icon: <Shield size={24} style={{ color: "#2563EB" }} />,
            title: "Credentials never stored",
            text: "Your HMRC Government Gateway user ID and password are used at the moment of submission only. They are transmitted directly to HMRC over an encrypted TLS connection and are immediately discarded from server memory once HMRC responds. They are never written to our database.",
          },
          {
            icon: <Lock size={24} style={{ color: "#2563EB" }} />,
            title: "Encryption in transit",
            text: "All data between your browser and our servers is encrypted using TLS. Your HMRC credentials travel over the same encrypted channel to HMRC's own servers. At no point is sensitive data transmitted in plain text.",
          },
          {
            icon: <Server size={24} style={{ color: "#2563EB" }} />,
            title: "Secure password storage",
            text: "Your DormantFile account password (not your HMRC password — that's never stored) is hashed using bcrypt before it's saved. We never store your password in plain text. Even if our database were compromised, your password could not be recovered.",
          },
          {
            icon: <Eye size={24} style={{ color: "#2563EB" }} />,
            title: "No tracking cookies",
            text: "We use a single essential session cookie to keep you logged in. We do not use analytics cookies, advertising cookies, or any third-party tracking. We don't sell or share your data with advertisers.",
          },
        ].map((item) => (
          <div
            key={item.title}
            style={{
              padding: "1.25rem",
              border: "1px solid #E2E8F0",
              borderRadius: "0.5rem",
              backgroundColor: "#ffffff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
              {item.icon}
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1E293B", margin: 0 }}>
                {item.title}
              </h3>
            </div>
            <p style={{ ...paragraph, margin: 0 }}>{item.text}</p>
          </div>
        ))}
      </div>

      <h2 style={heading}>What data we store</h2>
      <p style={paragraph}>We store only what&apos;s needed to run the service:</p>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={{ ...paragraph, marginBottom: "8px" }}>Your email address and hashed password (for your DormantFile account).</li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>Your company details: name, registration number, UTR, and accounting period dates.</li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>Filing records: what was submitted, when, and HMRC&apos;s response.</li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>Stripe customer ID for billing (card details are held by Stripe, not us).</li>
      </ul>

      <h2 style={heading}>Third-party services</h2>
      <ul style={{ paddingLeft: "24px", margin: "0 0 16px 0" }}>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>HMRC</strong> — receives your company details and Gateway credentials during filing.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Companies House</strong> — receives your company details and authentication code during accounts filing.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Stripe</strong> — processes payments. They hold card details, not us.
        </li>
        <li style={{ ...paragraph, marginBottom: "8px" }}>
          <strong style={{ color: "#1E293B" }}>Resend</strong> — delivers transactional emails (reminders, confirmations).
        </li>
      </ul>

      <p style={paragraph}>
        For the full legal detail, read our{" "}
        <Link href="/privacy" style={{ color: "#2563EB" }}>privacy policy</Link>.
      </p>

      <ContentCTA />
    </>
  );
}
```

- [ ] **Step 3: Create /how-it-works page**

Create `src/app/(marketing)/how-it-works/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "How It Works | DormantFile",
  description:
    "Step-by-step walkthrough of filing your dormant company accounts and CT600 with DormantFile.",
  openGraph: {
    title: "How It Works | DormantFile",
    description:
      "Step-by-step walkthrough of filing your dormant company accounts and CT600 with DormantFile.",
    type: "website",
    siteName: "DormantFile",
  },
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#475569",
  margin: "0 0 16px 0",
};

const steps = [
  {
    number: 1,
    title: "Create your account",
    description:
      "Sign up with your email address and set a password. Takes 30 seconds.",
  },
  {
    number: 2,
    title: "Add your company",
    description:
      "Enter your company registration number — we look up the company name automatically via Companies House. Add your UTR (Unique Taxpayer Reference) and accounting period dates.",
  },
  {
    number: 3,
    title: "Choose your plan",
    description:
      "Pick the plan that fits: Basic for one company (£19/year), Multiple for up to 10 (£39/year), or Bulk for up to 100 (£49/year).",
  },
  {
    number: 4,
    title: "Get deadline reminders",
    description:
      "We calculate your filing deadlines automatically (9 months after your accounting reference date for accounts, 12 months for CT600) and send you email reminders at 90, 30, 14, 7, 3, and 1 day before they're due.",
  },
  {
    number: 5,
    title: "File your accounts",
    description:
      "When you're ready, click to file your annual dormant accounts with Companies House. We submit the AA02 directly via the Companies House software filing API. You'll need your Companies House authentication code.",
  },
  {
    number: 6,
    title: "File your CT600",
    description:
      "If your company is registered for Corporation Tax, click to file your nil CT600. Enter your HMRC Government Gateway credentials — we submit directly to HMRC via their GovTalk API. Your credentials are used once and never stored.",
  },
  {
    number: 7,
    title: "Get confirmation",
    description:
      "Once HMRC and Companies House accept your filing, we show the confirmation in your dashboard and send you an email. Your filing records are stored so you always have a history.",
  },
];

export default function HowItWorksPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "How It Works" },
        ]}
      />
      <Breadcrumbs items={[{ label: "How It Works" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 12px 0",
          letterSpacing: "-0.02em",
        }}
      >
        How it works
      </h1>
      <p style={{ ...paragraph, fontSize: "17px", marginBottom: "32px" }}>
        From sign-up to filed — the whole process takes under 5 minutes.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {steps.map((step) => (
          <div
            key={step.number}
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "flex-start",
            }}
          >
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
              {step.number}
            </div>
            <div>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#1E293B",
                  margin: "0 0 4px 0",
                }}
              >
                {step.title}
              </h3>
              <p style={{ ...paragraph, margin: 0 }}>{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1.25rem",
          backgroundColor: "#EFF6FF",
          borderRadius: "0.5rem",
          border: "1px solid #DBEAFE",
        }}
      >
        <p style={{ ...paragraph, margin: 0 }}>
          <strong style={{ color: "#1E293B" }}>Not registered for Corporation Tax?</strong>{" "}
          That&apos;s fine — many dormant companies only need to file annual accounts with Companies House. You can skip the CT600 step entirely. Read our guide on{" "}
          <Link href="/guides/do-i-need-ct600-dormant-company" style={{ color: "#2563EB" }}>
            whether you need a CT600
          </Link>{" "}
          for more detail.
        </p>
      </div>

      <ContentCTA />
    </>
  );
}
```

- [ ] **Step 4: Create /pricing page**

Create `src/app/(marketing)/pricing/page.tsx`:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "Pricing | DormantFile",
  description:
    "DormantFile pricing: from £19/year for one dormant company. Compare to accountants and other software.",
  openGraph: {
    title: "Pricing | DormantFile",
    description:
      "DormantFile pricing: from £19/year for one dormant company.",
    type: "website",
    siteName: "DormantFile",
  },
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#475569",
  margin: "0 0 16px 0",
};

const plans = [
  {
    name: "Basic",
    price: "19",
    period: "per year",
    description: "1 dormant company",
    features: [
      "Annual accounts filing with Companies House",
      "Nil CT600 filing with HMRC",
      "Direct submission via official APIs",
      "Email deadline reminders",
      "Filing confirmation & history",
    ],
    highlighted: false,
  },
  {
    name: "Multiple",
    price: "39",
    period: "per year",
    description: "Up to 10 companies",
    features: [
      "Everything in Basic",
      "File for up to 10 dormant companies",
      "Manage all companies from one dashboard",
      "Individual filing per company",
    ],
    highlighted: true,
  },
  {
    name: "Bulk",
    price: "49",
    period: "per year",
    description: "Up to 100 companies",
    features: [
      "Everything in Multiple",
      "File for up to 100 dormant companies",
      "Ideal for company secretaries",
      "Priority support",
    ],
    highlighted: false,
  },
];

const comparison = [
  { method: "DormantFile", cost: "From £19/year", time: "Under 2 minutes", notes: "Both filings from one dashboard" },
  { method: "Accountant", cost: "£80–£150+ per company", time: "Varies", notes: "Overkill for nil returns, but gives professional advice" },
  { method: "General accounting software", cost: "£100+/year", time: "30+ minutes", notes: "Designed for trading companies, not dormant" },
  { method: "DIY (manual filing)", cost: "Free (accounts only)", time: "1–2 hours", notes: "No CT600 option since CATO closed" },
];

const billingFaq = [
  { q: "Can I cancel anytime?", a: "Yes. Cancel via the billing portal and your subscription remains active until the end of the current billing period. No refunds for partial periods." },
  { q: "Can I upgrade or downgrade?", a: "Yes. Upgrade immediately or downgrade at the end of your billing period via your account settings." },
  { q: "What payment methods do you accept?", a: "We accept all major credit and debit cards via Stripe. We don't currently accept bank transfers or direct debits." },
  { q: "Do you offer refunds?", a: "We don't offer refunds for partial billing periods. If you're unsure, start with Basic — you can always upgrade later." },
];

export default function PricingPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Pricing" },
        ]}
      />
      <Breadcrumbs items={[{ label: "Pricing" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 12px 0",
          letterSpacing: "-0.02em",
          textAlign: "center",
        }}
      >
        Simple, transparent pricing
      </h1>
      <p style={{ ...paragraph, textAlign: "center", marginBottom: "32px" }}>
        One dormant company or a hundred — pick the plan that fits.
      </p>

      {/* Pricing cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="rounded-xl p-7 flex flex-col"
            style={{
              border: plan.highlighted
                ? "2px solid #2563EB"
                : "1px solid #E2E8F0",
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
            <p
              className="font-semibold text-sm mb-1"
              style={{ color: "#2563EB" }}
            >
              {plan.name}
            </p>
            <div className="mb-1">
              <span
                className="text-4xl font-bold"
                style={{ color: "#1E293B" }}
              >
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
                  <CheckCircle
                    size={16}
                    style={{ color: "#2563EB", flexShrink: 0, marginTop: 2 }}
                  />
                  <span className="text-sm" style={{ color: "#475569" }}>
                    {feature}
                  </span>
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

      {/* Comparison table */}
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 16px 0",
        }}
      >
        How does DormantFile compare?
      </h2>
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
            {comparison.map((row) => (
              <tr key={row.method}>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #E2E8F0",
                    color: "#1E293B",
                    fontWeight: row.method === "DormantFile" ? 600 : 400,
                    fontSize: "14px",
                  }}
                >
                  {row.method}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #E2E8F0",
                    color: "#475569",
                    fontSize: "14px",
                  }}
                >
                  {row.cost}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #E2E8F0",
                    color: "#475569",
                    fontSize: "14px",
                  }}
                >
                  {row.time}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid #E2E8F0",
                    color: "#475569",
                    fontSize: "14px",
                  }}
                >
                  {row.notes}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Billing FAQ */}
      <h2
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 16px 0",
        }}
      >
        Billing questions
      </h2>
      {billingFaq.map((item) => (
        <div key={item.q} style={{ marginBottom: "16px" }}>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "#1E293B",
              margin: "0 0 4px 0",
            }}
          >
            {item.q}
          </h3>
          <p style={{ ...paragraph, margin: 0 }}>{item.a}</p>
        </div>
      ))}

      <ContentCTA />
    </>
  );
}
```

- [ ] **Step 5: Create FAQAccordion component**

Create `src/components/marketing/FAQAccordion.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FAQItemData {
  question: string;
  answer: React.ReactNode;
}

function FAQItem({ question, answer }: FAQItemData) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ borderBottom: "1px solid #E2E8F0" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "1rem 0",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "15px",
          fontWeight: 500,
          color: "#1E293B",
          gap: "1rem",
        }}
      >
        <span>{question}</span>
        <ChevronDown
          size={16}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            flexShrink: 0,
            color: "#94A3B8",
          }}
        />
      </button>
      {open && (
        <div
          style={{
            paddingBottom: "1rem",
            color: "#475569",
            lineHeight: 1.7,
            fontSize: "15px",
          }}
        >
          {answer}
        </div>
      )}
    </div>
  );
}

interface FAQCategory {
  name: string;
  items: FAQItemData[];
}


export function FAQAccordion({ categories }: { categories: FAQCategory[] }) {
  return (
    <div>
      {categories.map((cat) => (
        <section key={cat.name} style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#1E293B",
              margin: "0 0 8px 0",
            }}
          >
            {cat.name}
          </h2>
          <div>
            {cat.items.map((item) => (
              <FAQItem key={item.question} {...item} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Create /faq page**

Create `src/app/(marketing)/faq/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContentCTA } from "@/components/marketing/ContentCTA";
import { FAQAccordion } from "@/components/marketing/FAQAccordion";
import { FAQPageJsonLd, BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "FAQ | DormantFile",
  description:
    "Frequently asked questions about DormantFile: filing, security, pricing, and managing your account.",
  openGraph: {
    title: "FAQ | DormantFile",
    description:
      "Frequently asked questions about DormantFile.",
    type: "website",
    siteName: "DormantFile",
  },
};

const faqCategories = [
  {
    name: "Filing",
    items: [
      { question: "What filings does DormantFile handle?", answer: <>DormantFile handles two filings: <a href="/guides/how-to-file-dormant-company-accounts" style={{ color: "#2563EB" }}>annual dormant accounts</a> submitted to Companies House and a <a href="/guides/how-to-file-nil-ct600" style={{ color: "#2563EB" }}>nil CT600 Corporation Tax return</a> submitted to HMRC. Both confirm your company was dormant during the accounting period.</> },
      { question: "What if my company isn't registered for Corporation Tax?", answer: "No problem. Many dormant companies only need to file annual accounts with Companies House. If your company isn't registered for Corporation Tax, you can skip the CT600 entirely. DormantFile handles both scenarios." },
      { question: "Can I use this if my company is trading?", answer: "No. DormantFile is designed exclusively for genuinely dormant companies — those with no income, expenditure, or assets. If your company has traded during the period, you need a qualified accountant." },
      { question: "What happens after I file?", answer: "Companies House and HMRC will process your submission. Once accepted, we show the confirmation in your dashboard and send you an email. Your filing records are kept so you have a permanent history." },
      { question: "How long does filing take?", answer: "The actual filing process takes under 2 minutes. You click file, enter your credentials (for HMRC) or authentication code (for Companies House), and we handle the rest." },
      { question: "What do I need before I start?", answer: "For accounts: your company registration number and Companies House authentication code. For CT600: your Unique Taxpayer Reference (UTR) and HMRC Government Gateway credentials. You'll also need your accounting period dates." },
      { question: "What accounting periods can I file for?", answer: "You can file for any accounting period where your company was dormant. DormantFile calculates your deadlines based on the period dates you enter." },
    ],
  },
  {
    name: "Security",
    items: [
      { question: "Is my data secure?", answer: <>Yes. All data is transmitted over TLS encryption. Your DormantFile password is hashed with bcrypt. Your HMRC Gateway credentials are used once during submission and never stored in our database. Read our <a href="/security" style={{ color: "#2563EB" }}>security page</a> for full details.</> },
      { question: "Are my HMRC credentials stored?", answer: <>No. Your HMRC Government Gateway user ID and password are held in server memory only for the duration of the submission request. They are transmitted directly to HMRC and discarded immediately after HMRC responds. See our <a href="/security" style={{ color: "#2563EB" }}>security page</a>.</> },
      { question: "What data do you collect?", answer: "We collect your email, a hashed password, company details (name, registration number, UTR, accounting dates), and filing records. Payment is handled by Stripe — we never see your card details." },
    ],
  },
  {
    name: "Pricing",
    items: [
      { question: "How much does it cost?", answer: <>Basic is £19/year for one company. Multiple is £39/year for up to 10 companies. Bulk is £49/year for up to 100 companies. All plans include both accounts and CT600 filing. See our <a href="/pricing" style={{ color: "#2563EB" }}>pricing page</a> for the full comparison.</> },
      { question: "Is there a free trial?", answer: "We don't currently offer a free trial, but the Basic plan is just £19/year — less than what most accountants charge for a single nil filing." },
      { question: "Can I cancel anytime?", answer: "Yes. Cancel via the billing portal and your subscription stays active until the end of the current billing period. No refunds for partial periods." },
      { question: "What happens if my subscription lapses?", answer: "If your subscription expires, you won't be able to file new returns. Your account and filing history remain accessible. You can resubscribe at any time to resume filing." },
    ],
  },
  {
    name: "Account",
    items: [
      { question: "Can I manage multiple companies?", answer: "Yes, on the Multiple or Bulk plan. Each company has its own filing record, deadlines, and reminders. You manage them all from a single dashboard." },
      { question: "How do I add or remove a company?", answer: "Add a company from your dashboard by entering its registration number. Remove a company from your settings — the filing history is preserved." },
      { question: "How do I delete my account?", answer: "You can delete your account from the settings page. This removes all your personal data and company records. This action is permanent and cannot be undone." },
    ],
  },
];

// Plain-text answers for JSON-LD structured data (FAQPage schema requires strings, not JSX)
const faqJsonLdItems = [
  { question: "What filings does DormantFile handle?", answer: "DormantFile handles two filings: annual dormant accounts submitted to Companies House and a nil CT600 Corporation Tax return submitted to HMRC. Both confirm your company was dormant during the accounting period." },
  { question: "What if my company isn't registered for Corporation Tax?", answer: "No problem. Many dormant companies only need to file annual accounts with Companies House. If your company isn't registered for Corporation Tax, you can skip the CT600 entirely." },
  { question: "Can I use this if my company is trading?", answer: "No. DormantFile is designed exclusively for genuinely dormant companies — those with no income, expenditure, or assets. If your company has traded during the period, you need a qualified accountant." },
  { question: "What happens after I file?", answer: "Companies House and HMRC will process your submission. Once accepted, we show the confirmation in your dashboard and send you an email." },
  { question: "How long does filing take?", answer: "The actual filing process takes under 2 minutes. You click file, enter your credentials, and we handle the rest." },
  { question: "What do I need before I start?", answer: "For accounts: your company registration number and Companies House authentication code. For CT600: your UTR and HMRC Government Gateway credentials." },
  { question: "What accounting periods can I file for?", answer: "You can file for any accounting period where your company was dormant." },
  { question: "Is my data secure?", answer: "Yes. All data is transmitted over TLS encryption. Your DormantFile password is hashed with bcrypt. Your HMRC Gateway credentials are used once during submission and never stored." },
  { question: "Are my HMRC credentials stored?", answer: "No. Your credentials are held in server memory only for the duration of the submission request and discarded immediately after HMRC responds." },
  { question: "What data do you collect?", answer: "We collect your email, a hashed password, company details, and filing records. Payment is handled by Stripe — we never see your card details." },
  { question: "How much does it cost?", answer: "Basic is £19/year for one company. Multiple is £39/year for up to 10 companies. Bulk is £49/year for up to 100 companies." },
  { question: "Is there a free trial?", answer: "We don't currently offer a free trial, but the Basic plan is just £19/year." },
  { question: "Can I cancel anytime?", answer: "Yes. Cancel via the billing portal and your subscription stays active until the end of the current billing period." },
  { question: "What happens if my subscription lapses?", answer: "You won't be able to file new returns. Your account and filing history remain accessible. You can resubscribe at any time." },
  { question: "Can I manage multiple companies?", answer: "Yes, on the Multiple or Bulk plan. Each company has its own filing record, deadlines, and reminders." },
  { question: "How do I add or remove a company?", answer: "Add a company from your dashboard by entering its registration number. Remove a company from your settings." },
  { question: "How do I delete my account?", answer: "You can delete your account from the settings page. This removes all your personal data and company records permanently." },
];

export default function FAQPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <FAQPageJsonLd items={faqJsonLdItems} />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "FAQ" },
        ]}
      />
      <Breadcrumbs items={[{ label: "FAQ" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 12px 0",
          letterSpacing: "-0.02em",
        }}
      >
        Frequently Asked Questions
      </h1>
      <p
        style={{
          fontSize: "15px",
          lineHeight: 1.7,
          color: "#475569",
          margin: "0 0 32px 0",
        }}
      >
        Everything you need to know about using DormantFile. Can&apos;t find your answer?{" "}
        <a href="/contact" style={{ color: "#2563EB" }}>
          Get in touch
        </a>.
      </p>

      <FAQAccordion categories={faqCategories} />

      <ContentCTA />
    </>
  );
}
```

- [ ] **Step 7: Create ContactForm component**

Create `src/components/marketing/ContactForm.tsx`:

```tsx
"use client";

import { useState } from "react";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setStatus("sent");
      setForm({ name: "", email: "", message: "" });
    } catch {
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <p style={{ color: "#16A34A", fontWeight: 500, fontSize: "15px" }}>
        Thanks for your message. We&apos;ll get back to you soon.
      </p>
    );
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.75rem",
    border: "1px solid #E2E8F0",
    borderRadius: "0.5rem",
    fontSize: "15px",
    width: "100%",
    fontFamily: "inherit",
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      <input
        type="text"
        placeholder="Your name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        required
        style={inputStyle}
      />
      <input
        type="email"
        placeholder="Your email"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        required
        style={inputStyle}
      />
      <textarea
        placeholder="Your message"
        value={form.message}
        onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
        required
        rows={5}
        style={{ ...inputStyle, resize: "vertical" }}
      />
      <button
        type="submit"
        disabled={status === "sending"}
        style={{
          backgroundColor: "#2563EB",
          color: "#ffffff",
          padding: "0.75rem",
          borderRadius: "0.5rem",
          border: "none",
          fontWeight: 600,
          fontSize: "15px",
          cursor: status === "sending" ? "not-allowed" : "pointer",
          opacity: status === "sending" ? 0.7 : 1,
          fontFamily: "inherit",
        }}
      >
        {status === "sending" ? "Sending..." : "Send message"}
      </button>
      {status === "error" && (
        <p style={{ color: "#DC2626", fontSize: "14px" }}>
          Something went wrong. Please try emailing us directly.
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 8: Create contact API route**

Create `src/app/api/contact/route.ts`:

```typescript
import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const { name, email, message } = await request.json();

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 },
    );
  }

  try {
    await resend.emails.send({
      from: "DormantFile Contact <noreply@dormantfile.co.uk>",
      to: "hello@dormantfile.co.uk",
      replyTo: email,
      subject: `Contact form: ${name}`,
      text: `From: ${name} (${email})\n\n${message}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 9: Create /contact page**

Create `src/app/(marketing)/contact/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Mail } from "lucide-react";
import { Breadcrumbs } from "@/components/marketing/Breadcrumbs";
import { ContactForm } from "@/components/marketing/ContactForm";
import { BreadcrumbJsonLd } from "@/lib/content/json-ld";

export const metadata: Metadata = {
  title: "Contact | DormantFile",
  description:
    "Get in touch with DormantFile. We typically respond within one working day.",
  openGraph: {
    title: "Contact | DormantFile",
    description: "Get in touch with DormantFile.",
    type: "website",
    siteName: "DormantFile",
  },
};

const paragraph: React.CSSProperties = {
  fontSize: "15px",
  lineHeight: 1.7,
  color: "#475569",
  margin: "0 0 16px 0",
};

export default function ContactPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Contact" },
        ]}
      />
      <Breadcrumbs items={[{ label: "Contact" }]} />
      <h1
        style={{
          fontSize: "36px",
          fontWeight: 700,
          color: "#1E293B",
          margin: "0 0 12px 0",
          letterSpacing: "-0.02em",
        }}
      >
        Contact us
      </h1>
      <p style={paragraph}>
        Have a question or need help? We typically respond within one working day.
      </p>

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
        <a
          href="mailto:hello@dormantfile.co.uk"
          style={{ color: "#2563EB", fontWeight: 500, fontSize: "15px" }}
        >
          hello@dormantfile.co.uk
        </a>
      </div>

      <h2
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#1E293B",
          margin: "0 0 12px 0",
        }}
      >
        Or send us a message
      </h2>
      <ContactForm />
    </>
  );
}
```

- [ ] **Step 10: Verify build**

```bash
cd /Users/ben/Documents/tax-project && npx next build 2>&1 | tail -30
```

Expected: Build succeeds with all new routes listed.

- [ ] **Step 11: Commit**

```bash
git add src/app/\(marketing\)/about/ src/app/\(marketing\)/security/ src/app/\(marketing\)/how-it-works/ src/app/\(marketing\)/pricing/ src/app/\(marketing\)/faq/ src/app/\(marketing\)/contact/ src/components/marketing/FAQAccordion.tsx src/components/marketing/ContactForm.tsx src/app/api/contact/
git commit -m "feat(trust): add about, security, how-it-works, pricing, faq, and contact pages"
```

---

### Task 8: Guide Content (Guides 1–5)

**Files:**
- Create: `content/guides/how-to-file-dormant-company-accounts.mdx`
- Create: `content/guides/how-to-file-nil-ct600.mdx`
- Create: `content/guides/cato-closed-options.mdx`
- Create: `content/guides/late-filing-penalties.mdx`
- Create: `content/guides/do-i-need-ct600-dormant-company.mdx`

**Depends on:** Task 5

**Writing guidance:** Each guide should be 800–1500 words of factually accurate UK company law content. Write in a clear, helpful tone for confused company directors — not salespeople. Use plain English. Link to related guides/answers using relative markdown links (e.g. `[filing deadlines](/guides/dormant-company-filing-deadlines)`). Link to at least one trust page. The MDX infrastructure handles rendering — just write valid markdown with frontmatter.

- [ ] **Step 1: Write Guide 1 — How to file dormant company accounts**

Create `content/guides/how-to-file-dormant-company-accounts.mdx`:

```mdx
---
title: "How to file dormant company accounts with Companies House"
description: "Step-by-step guide to filing annual dormant accounts (AA02) with Companies House, including deadlines, requirements, and penalties for late filing."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["file dormant company accounts", "AA02", "Companies House", "dormant accounts", "annual accounts"]
---

Every UK limited company must file annual accounts with Companies House, even if the company is dormant and has done nothing all year. For dormant companies, this means filing a set of abbreviated accounts known as the AA02.

This guide walks you through what's required, when it's due, and how to do it.

## What are dormant company accounts?

Dormant company accounts are a simplified set of annual accounts that confirm your company had no significant accounting transactions during the period. Under the Companies Act 2006 (section 1169), a company is dormant if it has had no "significant accounting transactions" — the only exceptions being shares taken by subscribers on formation and fees paid to Companies House.

The filing is known as an AA02 because that's the form type used for abbreviated dormant accounts.

## What you need

Before you file, make sure you have:

- **Company registration number** — your 8-digit Companies House number.
- **Companies House authentication code** — a 6-character alphanumeric code sent to your registered office address. If you don't have one, you can [request it from Companies House](/answers/what-is-a-companies-house-authentication-code).
- **Accounting period dates** — the start and end date of the period you're filing for. Your [accounting reference date](/answers/what-is-an-accounting-reference-date) determines these.

## When is the deadline?

For private limited companies, annual accounts must be filed within **9 months** of the end of the accounting reference period.

For example, if your accounting period ends on 31 March 2026, accounts are due by 31 December 2026.

For first-year accounts, the deadline is the later of 9 months after the end of the accounting period or 21 months from the date of incorporation.

See our full guide on [dormant company filing deadlines](/guides/dormant-company-filing-deadlines) for more detail.

## What happens if you file late?

Companies House imposes automatic penalties for late filing:

| How late | Penalty |
|----------|---------|
| Up to 1 month | £150 |
| 1 to 3 months | £375 |
| 3 to 6 months | £750 |
| More than 6 months | £1,500 |

These penalties are non-negotiable and apply even if the company is dormant with nothing to report. Read more about [late filing penalties](/guides/late-filing-penalties).

## How to file

You have three options:

**1. File online via Companies House WebFiling**

Go to the Companies House WebFiling service, log in with your authentication code, and follow the screens to file dormant accounts. It's free but takes 15–30 minutes if you haven't done it before.

**2. Use DormantFile**

DormantFile submits your dormant accounts directly to Companies House via their official software filing API. Add your company, enter your authentication code, and click file. Takes under 2 minutes.

**3. Hire an accountant**

An accountant can prepare and file your accounts on your behalf. This typically costs £80–£150 per company — fine if you need advice, but overkill if your company is genuinely dormant.

## Do I also need to file a CT600?

Not necessarily. If your company is registered for Corporation Tax with HMRC, you also need to file a [nil CT600 return](/guides/how-to-file-nil-ct600). If it's not registered for Corporation Tax, you only need annual accounts. See our guide on [whether you need a CT600](/guides/do-i-need-ct600-dormant-company).

## Key points

- Every UK limited company must file annual accounts, even if dormant.
- Dormant accounts (AA02) confirm no significant transactions occurred.
- Deadline: 9 months after your accounting reference date.
- Late penalties start at £150 and go up to £1,500.
- You need your Companies House authentication code to file online.
```

- [ ] **Step 2: Write Guide 2 — How to file a nil CT600**

Create `content/guides/how-to-file-nil-ct600.mdx`:

```mdx
---
title: "How to file a nil CT600 tax return with HMRC"
description: "Step-by-step guide to filing a nil Corporation Tax return (CT600) with HMRC for a dormant company, including what you need and how to submit."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["nil CT600", "Corporation Tax return", "HMRC", "dormant company tax", "CT600 filing"]
---

If your dormant company is registered for Corporation Tax, you need to file a CT600 return with HMRC every year — even if the company owes no tax. This is called a nil CT600 because every figure on the return is zero.

## What is a CT600?

A CT600 is the Corporation Tax return that all UK companies registered for Corporation Tax must file with HMRC. It reports the company's income, gains, and tax liability for each accounting period. For a dormant company, the return shows zero income, zero gains, and zero tax — hence "nil CT600". Read our plain-English explanation of [what a CT600 is](/answers/what-is-a-ct600).

## What you need

- **Unique Taxpayer Reference (UTR)** — a 10-digit number issued by HMRC when your company registered for Corporation Tax. If you're not sure what this is, see [what is a UTR number](/answers/what-is-a-utr-number).
- **HMRC Government Gateway credentials** — the user ID and password for your company's Government Gateway account. See [what is the HMRC Gateway](/answers/what-is-the-hmrc-gateway).
- **Accounting period dates** — the start and end date of the period being filed.

## When is the deadline?

The CT600 must be filed within **12 months** of the end of the accounting period.

For example, if your accounting period ends on 31 March 2026, the CT600 is due by 31 March 2027.

Note this is longer than the Companies House accounts deadline (9 months). See our full guide on [filing deadlines](/guides/dormant-company-filing-deadlines).

## What happened to CATO?

Until March 2026, HMRC offered a free online tool called CATO (Corporation Tax Online) that allowed companies to file CT600 returns directly. HMRC closed CATO on 31 March 2026. Companies now need to use third-party commercial software to file CT600 returns. See our guide on [what to do now that CATO has closed](/guides/cato-closed-options).

## How to file

**Using DormantFile:** Add your company, enter your UTR and accounting period, then click to file your CT600. You'll enter your HMRC Gateway credentials at the point of submission — they're used once to authenticate with HMRC and are never stored. The whole process takes under 2 minutes.

**Using other software:** Commercial accounting packages like Xero, FreeAgent, or TaxCalc can file CT600 returns. These are designed for trading companies and are typically £100+/year — far more than most dormant company directors need.

**Hiring an accountant:** An accountant can file on your behalf, typically charging £80–£150 per company per year.

## Is my data secure?

Your HMRC Gateway credentials are used at the moment of filing only. They are transmitted directly to HMRC over an encrypted TLS connection and discarded from memory immediately. They are never written to any database. Read our full [security page](/security) for details.

## Do I definitely need to file?

Only if your company is registered for Corporation Tax. Many dormant companies — especially those that have never traded — may not be registered. Check our guide on [whether you need a CT600 for a dormant company](/guides/do-i-need-ct600-dormant-company).

## Key points

- A nil CT600 confirms your dormant company owes no Corporation Tax.
- Deadline: 12 months after the end of your accounting period.
- You need your UTR and HMRC Gateway credentials.
- CATO (HMRC's free filing tool) closed on 31 March 2026.
- DormantFile submits your nil CT600 directly to HMRC via their API.
```

- [ ] **Step 3: Write Guide 3 — CATO closed**

Create `content/guides/cato-closed-options.mdx`:

```mdx
---
title: "CATO has closed — what are your options now?"
description: "HMRC's free Corporation Tax filing tool (CATO) closed on 31 March 2026. Here's what dormant company directors can do instead."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "alternatives"
keywords: ["CATO closed", "HMRC free filing", "Corporation Tax Online", "CT600 alternatives", "dormant company filing"]
---

On 31 March 2026, HMRC shut down its free Corporation Tax Online service, commonly known as CATO. If you used CATO to file nil CT600 returns for your dormant company, you now need an alternative.

## What was CATO?

CATO (Corporation Tax Online) was HMRC's free web-based tool that allowed companies to prepare and submit CT600 Corporation Tax returns directly to HMRC. It was basic, not always intuitive, but it worked — and it cost nothing. For directors of dormant companies filing nil returns, CATO was the obvious choice.

HMRC announced its closure as part of a broader move to shift Corporation Tax filing to commercial third-party software.

## What are the alternatives?

### 1. DormantFile — built specifically for dormant companies

DormantFile was built in direct response to CATO closing. It handles both of the filings a dormant company needs:

- **Nil CT600** submitted to HMRC via their GovTalk API
- **Annual dormant accounts** submitted to Companies House via their software filing API

From £19/year for one company. No accounting knowledge needed, no features you don't need.

### 2. Commercial accounting software

Packages like Xero, FreeAgent, Sage, and TaxCalc can file CT600 returns. These are full-featured accounting tools designed for trading companies — they handle invoicing, payroll, bank feeds, VAT, and much more.

For a dormant company with zero transactions, this is significant overkill. Pricing typically starts at £100+/year and the software assumes you have actual accounting to do.

That said, if you also run trading companies and already use one of these tools, it may make sense to file your dormant company through the same software.

### 3. Hire an accountant

An accountant can file your CT600 on your behalf. For a nil return, expect to pay £80–£150 per company per year. This is the right choice if you're unsure whether your company qualifies as dormant, or if you want professional reassurance. But for a straightforward nil filing, it's an expensive option.

### 4. File through HMRC's commercial software list

HMRC maintains a list of approved software providers that can submit CT600 returns. You can browse this list on GOV.UK. Note that most options on this list are general-purpose accounting tools — there are very few built specifically for dormant companies.

## What about annual accounts?

CATO only handled CT600 returns, not annual accounts with Companies House. You still need to file those separately. Companies House has its own free WebFiling service for accounts, or you can use DormantFile to handle both filings from one place.

## What if I don't file?

If your company is registered for Corporation Tax, you are legally required to file a CT600 return. Not filing results in:

- A £100 penalty if one day late
- Another £100 if three months late
- HMRC can estimate your tax liability and charge accordingly

Plus Companies House has its own separate [late filing penalties](/guides/late-filing-penalties) for accounts.

## Key points

- CATO closed on 31 March 2026. There is no longer a free way to file CT600 returns.
- DormantFile is purpose-built for dormant companies, from £19/year.
- General accounting software works but is overkill for nil returns.
- An accountant is the right choice if you need professional advice.
- You still need to file annual accounts separately with Companies House.
```

- [ ] **Step 4: Write Guide 4 — Late filing penalties**

Create `content/guides/late-filing-penalties.mdx`:

```mdx
---
title: "What happens if you don't file your dormant company accounts"
description: "Late filing penalties from Companies House and HMRC for dormant companies, plus the risk of being struck off the register."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "deadlines"
keywords: ["late filing penalties", "dormant company penalties", "Companies House penalties", "HMRC penalties", "struck off"]
---

Even if your company is dormant and has done nothing all year, you are still legally required to file annual accounts with Companies House and (if registered for Corporation Tax) a nil CT600 with HMRC. If you don't file on time, penalties apply automatically.

## Companies House penalties

Companies House imposes automatic, fixed penalties for late annual accounts. There is no grace period, no warning, and no discretion — the penalty is triggered the day after the deadline.

| How late | Private company | Public company |
|----------|----------------|----------------|
| Up to 1 month | £150 | £750 |
| 1 to 3 months | £375 | £1,500 |
| 3 to 6 months | £750 | £3,000 |
| More than 6 months | £1,500 | £7,500 |

For most dormant companies (private limited companies), penalties range from £150 to £1,500.

These penalties are issued to the company, not the director personally. However, if you're the sole director, the company's obligation is effectively yours.

If you file late in two consecutive years, the penalty doubles.

## HMRC penalties

If your company is registered for Corporation Tax, failing to file a CT600 on time triggers a separate set of penalties from HMRC:

- **1 day late:** £100 penalty
- **3 months late:** another £100 penalty (total £200)
- **6 months late:** HMRC estimates your tax liability and charges 10% of the unpaid tax (minimum £0 for a nil return, but they may estimate higher if they suspect trading)
- **12 months late:** a further 10% of unpaid tax

For genuinely dormant companies with no tax liability, the financial penalties may be small. But HMRC can also:

- Open an enquiry into your company's affairs
- Assume the company is trading and issue estimated tax assessments
- Charge interest on unpaid amounts

## Risk of being struck off

If you consistently fail to file, Companies House can start the process of striking your company off the register. This means:

- Your company is dissolved and ceases to exist
- Any assets held by the company become property of the Crown (bona vacantia)
- You lose the company name

Companies House publishes a notice in The Gazette before striking off, giving you (or creditors) a chance to object. But by that point, you've already accumulated significant penalties.

## How to avoid penalties

The simplest way to avoid penalties is to file on time. For a dormant company, the filing itself is straightforward — it's remembering to do it that trips people up.

- Know your [filing deadlines](/guides/dormant-company-filing-deadlines): 9 months for accounts, 12 months for CT600.
- Set up reminders. DormantFile sends automatic email reminders at 90, 30, 14, 7, 3, and 1 day before your deadline.
- File early. There's no benefit to waiting until the last minute.

## Key points

- Late filing penalties from Companies House range from £150 to £1,500 for private companies.
- HMRC charges £100 for filing a day late, with further penalties at 3, 6, and 12 months.
- Persistent non-filing can result in your company being struck off.
- Penalties apply even if your company is dormant with nothing to report.
- The easiest fix: file on time. Set up deadline reminders so you don't forget.
```

- [ ] **Step 5: Write Guide 5 — Do I need a CT600?**

Create `content/guides/do-i-need-ct600-dormant-company.mdx`:

```mdx
---
title: "Do I need to file a CT600 for a dormant company?"
description: "Not every dormant company needs to file a CT600. This guide explains who needs to file and who doesn't."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["dormant company CT600", "Corporation Tax dormant", "do I need CT600", "CT600 required", "dormant company filing"]
---

Not every dormant company needs to file a CT600 with HMRC. Whether you need to depends on one question: **is your company registered for Corporation Tax?**

## The decision tree

```
Is your company registered for Corporation Tax?
├── YES → You need to file a CT600 every year (plus annual accounts)
└── NO  → You only need to file annual accounts with Companies House
```

That's it. If your company is registered for Corporation Tax, you file a nil CT600. If it's not, you don't.

## How to tell if you're registered

Your company is registered for Corporation Tax if:

- HMRC sent you a **Unique Taxpayer Reference (UTR)** — a 10-digit number, usually in a letter titled "Notice to deliver a Company Tax Return."
- You (or a previous director, or your accountant) notified HMRC that the company was active and needed to register.
- The company traded at some point in the past and was registered then.

Your company is probably **not** registered if:

- It was incorporated but never traded.
- You never notified HMRC that the company was active.
- You never received a UTR from HMRC.

If you're unsure, you can call HMRC's Corporation Tax helpline on 0300 200 3410 to check.

## What is a UTR?

A UTR (Unique Taxpayer Reference) is a 10-digit reference number issued by HMRC when a company registers for Corporation Tax. It's used on all Corporation Tax correspondence and is required to file a CT600. Read more about [what a UTR number is](/answers/what-is-a-utr-number).

## Common scenarios

**"I incorporated the company but never traded"**

If you formed a company and never did anything with it, you may not have been automatically registered for Corporation Tax. Check whether you have a UTR. If you don't, you likely only need to file annual accounts with Companies House.

**"The company used to trade but is now dormant"**

If the company was previously trading, it's almost certainly registered for Corporation Tax. You need to continue filing nil CT600 returns unless you formally tell HMRC the company is dormant. Even then, HMRC may still require returns.

**"I told HMRC the company is dormant"**

You can notify HMRC that your company is dormant. In some cases, HMRC will mark the company as dormant and stop issuing notices to file. But this doesn't always happen — HMRC may still require CT600 returns. The safest approach is to file unless HMRC explicitly confirms you don't need to.

## What all dormant companies need

Regardless of Corporation Tax status, every dormant company must file:

- **Annual accounts** with Companies House (due 9 months after accounting reference date)
- **Confirmation statement** with Companies House (due at least once every 12 months — this is a separate filing from accounts)

See our guide on [how to file dormant company accounts](/guides/how-to-file-dormant-company-accounts).

## Key points

- You only need a CT600 if your company is registered for Corporation Tax.
- Check if you have a UTR — that's the clearest indicator.
- If unsure, call HMRC on 0300 200 3410.
- All dormant companies need annual accounts with Companies House, regardless of CT status.
```

- [ ] **Step 6: Verify guides parse correctly**

```bash
cd /Users/ben/Documents/tax-project && node -e "
const matter = require('gray-matter');
const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'content/guides');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
console.log(files.length + ' guides found');
files.forEach(f => {
  const { data } = matter(fs.readFileSync(path.join(dir, f), 'utf-8'));
  console.log('OK:', data.title, '(' + data.category + ')');
});
"
```

Expected: 5 guides found, all parse correctly.

- [ ] **Step 7: Commit**

```bash
git add content/guides/how-to-file-dormant-company-accounts.mdx content/guides/how-to-file-nil-ct600.mdx content/guides/cato-closed-options.mdx content/guides/late-filing-penalties.mdx content/guides/do-i-need-ct600-dormant-company.mdx
git commit -m "content: add guides 1-5 (filing, CATO, penalties, CT600 decision)"
```

---

### Task 9: Guide Content (Guides 6–10)

**Files:**
- Create: `content/guides/how-to-check-company-dormant.mdx`
- Create: `content/guides/dormant-company-filing-deadlines.mdx`
- Create: `content/guides/cost-to-file-dormant-accounts.mdx`
- Create: `content/guides/how-to-close-dormant-company.mdx`
- Create: `content/guides/first-year-filing-new-company.mdx`

**Depends on:** Task 5

**Writing guidance:** Same as Task 8. 800–1500 words, factually accurate, link to related content.

- [ ] **Step 1: Write Guide 6 — How to check if your company is dormant**

Create `content/guides/how-to-check-company-dormant.mdx`:

```mdx
---
title: "How to check if your company is dormant"
description: "The definition of a dormant company under UK law, common scenarios, and how to check whether your company qualifies."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "eligibility"
keywords: ["is my company dormant", "dormant company definition", "Companies Act dormant", "HMRC dormant", "dormant check"]
---

"Dormant" has a specific legal meaning in the UK, and it's not quite the same at Companies House as it is at HMRC. Before you file dormant accounts, it's worth checking that your company actually qualifies.

## The Companies Act definition

Under the Companies Act 2006 (section 1169), a company is dormant if it has had **no significant accounting transactions** during the period.

The only transactions that don't count are:

- Payment for shares taken by subscribers on formation
- Fees paid to Companies House (e.g., for filing the confirmation statement)

Everything else counts as a significant accounting transaction — including receiving bank interest, making a payment, or issuing an invoice.

This is the definition used when deciding whether you can file dormant accounts (the AA02) with Companies House. Read more about [what "dormant" means under the Companies Act](/answers/what-does-dormant-mean-companies-act).

## The HMRC definition

HMRC has its own definition of dormant for Corporation Tax purposes. A company is dormant for CT if it:

- Is not carrying on a trade or business
- Has no income from any source
- Has no chargeable gains

This is broadly similar to the Companies Act definition, but it focuses on tax-relevant activity rather than accounting transactions.

## Common scenarios

**Incorporated but never traded** — Dormant under both definitions. You formed the company but never opened a bank account, never invoiced anyone, never received any money. This is the most straightforward case.

**Holding company with no activity** — If the company holds shares in another company but does nothing else (no dividends received, no management charges), it's typically dormant.

**Company that stopped trading** — If your company previously traded but has now ceased all activity, it can become dormant. Make sure there are no lingering bank transactions (even interest).

**Company with a bank account that earns interest** — **Not dormant.** Even small amounts of bank interest count as a significant accounting transaction. Close the account or switch to a non-interest-bearing account.

**Company that pays for its own registered office service** — **Not dormant** if the company itself is paying. If you pay personally, the company has no transaction and remains dormant.

## What if I'm not sure?

If you're unsure whether your company qualifies as dormant:

1. Check your bank statements. Any transaction (in or out) means the company is not dormant.
2. If the company has no bank account and has never had one, it's almost certainly dormant.
3. If in doubt, speak to a qualified accountant. Filing dormant accounts for a non-dormant company is a legal offence.

## Key points

- "Dormant" means no significant accounting transactions (Companies Act) or no trading/income (HMRC).
- A company with even minor bank interest is not dormant.
- Incorporated-but-never-traded companies are the clearest dormant case.
- If unsure, check your bank statements or ask an accountant.
```

- [ ] **Step 2: Write Guide 7 — Filing deadlines**

Create `content/guides/dormant-company-filing-deadlines.mdx`:

```mdx
---
title: "Dormant company filing deadlines explained"
description: "When your dormant company accounts and CT600 are due, how deadlines are calculated, and what happens in the first year."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "deadlines"
keywords: ["dormant company deadline", "filing deadline", "accounts deadline", "CT600 deadline", "accounting reference date"]
---

Dormant companies have the same filing deadlines as trading companies. Missing them triggers automatic penalties. Here's how the deadlines work.

## Annual accounts (Companies House)

Annual accounts must be filed within **9 months** of the end of your accounting reference period.

Your [accounting reference date](/answers/what-is-an-accounting-reference-date) (ARD) is the date your annual accounts are prepared up to. By default, it's the last day of the month in which the anniversary of your company's incorporation falls.

**Example:** Company incorporated 15 June 2024. Default ARD = 30 June. First accounting period ends 30 June 2025. Accounts due by 31 March 2026.

## CT600 (HMRC)

If your company is registered for Corporation Tax, the CT600 must be filed within **12 months** of the end of the accounting period.

Using the same example: accounting period ends 30 June 2025, CT600 due by 30 June 2026.

Note that the CT600 deadline is 3 months later than the accounts deadline.

## First-year deadlines

First-year deadlines are slightly different. The Companies House deadline for first accounts is the **later** of:

- 9 months after the end of the first accounting period, **or**
- 21 months from the date of incorporation

This gives newly incorporated companies extra time for their first filing.

**Example:** Company incorporated 1 December 2025. ARD = 31 December. First accounting period runs to 31 December 2026. Accounts deadline = later of 30 September 2027 (9 months) or 1 September 2027 (21 months from incorporation). In this case, 30 September 2027.

The first CT600 follows the standard 12-month rule from the end of the accounting period.

## Confirmation statement

Separately from accounts, every company must file a confirmation statement (CS01) with Companies House at least once every 12 months from the date of incorporation (or the last confirmation statement). This has a filing fee of £34 (online). This is not the same as annual accounts — it's a separate requirement. See [what is a confirmation statement](/answers/what-is-a-confirmation-statement-cs01).

## Calendar summary

| Filing | Deadline | Where |
|--------|----------|-------|
| Annual accounts | 9 months after accounting period end | Companies House |
| CT600 | 12 months after accounting period end | HMRC |
| Confirmation statement | Every 12 months from incorporation/last CS01 | Companies House |

## How to avoid missing deadlines

- DormantFile calculates your deadlines automatically and sends email reminders at 90, 30, 14, 7, 3, and 1 day before they're due.
- You can also check your deadlines on the Companies House company page by searching for your company.
- File early — there's no penalty for filing before the deadline.

## Key points

- Accounts: 9 months after accounting period end (21 months from incorporation for first accounts).
- CT600: 12 months after accounting period end.
- Confirmation statement: every 12 months, separate from accounts.
- Late filing triggers [automatic penalties](/guides/late-filing-penalties).
```

- [ ] **Step 3: Write Guide 8 — Cost to file**

Create `content/guides/cost-to-file-dormant-accounts.mdx`:

```mdx
---
title: "How much does it cost to file dormant company accounts?"
description: "A comparison of what it costs to file for a dormant company: DormantFile, accountants, accounting software, and DIY."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "costs"
keywords: ["cost dormant company accounts", "dormant filing cost", "cheapest way to file", "accountant costs dormant"]
---

Filing for a dormant company doesn't need to be expensive. Here's what it actually costs across your options.

## The options compared

| Method | Annual cost | What you get |
|--------|------------|-------------|
| DormantFile | From £19/year | Both filings (accounts + CT600) from one dashboard |
| Companies House WebFiling (DIY) | Free | Accounts only — no CT600 option since CATO closed |
| General accounting software | £100–£300+/year | CT600 + accounts, plus many features you'll never use |
| Accountant | £80–£150+ per company | Both filings, plus professional advice |

## DIY (free, but limited)

You can file dormant accounts with Companies House for free using their WebFiling service. It takes 15–30 minutes if you're familiar with the process.

The problem: this only covers accounts. Since [CATO closed](/guides/cato-closed-options) in March 2026, there is no free way to file a CT600. If your company is registered for Corporation Tax, you need commercial software or an accountant for that part.

## DormantFile (from £19/year)

DormantFile handles both filings for dormant companies:

- Annual accounts to Companies House
- Nil CT600 to HMRC

The Basic plan is £19/year for one company. The Multiple plan is £39/year for up to 10 companies (£3.90 each). The Bulk plan is £49/year for up to 100 companies.

This is purpose-built for dormant companies. No accounting features, no invoicing, no payroll — just the two filings you actually need.

## Accounting software (£100+/year)

Packages like Xero (from £15/month = £180/year), FreeAgent (from £12/month = £144/year), or Sage (from £12/month) can file CT600 returns. Some also handle Companies House accounts.

These tools are designed for trading companies. They're excellent if you run an active business, but for a dormant company with zero transactions, you're paying for features you'll never touch.

## Accountant (£80–£150+ per company)

An accountant can handle everything: accounts, CT600, advice on whether your company qualifies as dormant, and professional reassurance that everything is filed correctly.

For a genuinely dormant company where you're confident about the status, this is the most expensive option. But if you have any doubt about whether your company is truly dormant — if it might have traded, received income, or held assets — an accountant is the right call.

## When an accountant makes sense

Be honest about this. DormantFile (and any self-filing option) is only appropriate if:

- Your company genuinely had no transactions during the period
- You're confident the company meets the [definition of dormant](/guides/how-to-check-company-dormant)
- You don't need tax advice

If there's any complexity — a company that partially traded, received dividends from a subsidiary, or has assets on the balance sheet — spend the money on an accountant. The cost of professional advice is always less than the cost of filing incorrectly.

## Key points

- Dormant accounts can be filed for free via Companies House WebFiling, but CT600 requires paid software since CATO closed.
- DormantFile covers both filings from £19/year.
- General accounting software starts at £100+/year and is overkill for dormant companies.
- An accountant costs £80–£150+ per company — worth it if you need advice.
```

- [ ] **Step 4: Write Guide 9 — How to close a dormant company**

Create `content/guides/how-to-close-dormant-company.mdx`:

```mdx
---
title: "How to close a dormant company (and when to keep it open)"
description: "How to strike off a dormant company using DS01, what it costs, how long it takes, and reasons you might want to keep the company open."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "admin"
keywords: ["close dormant company", "strike off company", "DS01", "dissolve company", "keep dormant company"]
---

If you no longer need your dormant company, you can apply to have it struck off the Companies House register. But it's worth thinking about whether closing is actually the right move.

## How to close: the DS01 process

To close a dormant company, you apply to Companies House using form DS01 (Application for Striking Off). Here's the process:

**1. Check eligibility**

Your company can apply to be struck off if, in the last 3 months, it has not:

- Traded or carried on business
- Changed its name
- Disposed of property or rights
- Engaged in any activity other than settling its affairs

For a genuinely dormant company, you'll meet these criteria.

**2. File the application**

Submit form DS01 online via Companies House WebFiling or on paper. The filing fee is £33.

**3. Notify interested parties**

Within 7 days of filing the DS01, you must send a copy to all interested parties: members (shareholders), creditors, employees, managers of any employee pension fund, and any directors who didn't sign the application.

**4. Wait for publication**

Companies House publishes a notice in The Gazette giving 2 months for objections. If no objections are received, the company is struck off and dissolved.

**5. Total timeline**

From application to dissolution: approximately 3 months. The company must remain inactive throughout.

## What it costs

- DS01 filing fee: **£33** (online or paper)
- Final accounts: you should file any outstanding accounts before applying
- If the company has any bank balance, HMRC may want a final CT600

## What happens to the company's assets?

Any assets remaining when the company is dissolved become property of the Crown (bona vacantia) under the Companies Act 2006. This includes:

- Money in bank accounts
- Property or land
- Intellectual property

Make sure you distribute or transfer any assets **before** applying to strike off.

## Reasons to keep a dormant company open

Before you close, consider whether keeping the company might be worthwhile:

**Protecting the company name** — Once dissolved, the name becomes available for anyone to register. If the name has value (a brand, a domain, a reputation), keeping the company open protects it.

**Future use** — If there's any chance you might trade through the company in future, keeping it dormant is far easier than incorporating a new one.

**Holding assets** — Some directors use dormant companies to hold property, shares, or intellectual property. If the company holds anything, you can't simply strike it off.

**Cost comparison** — Filing dormant accounts costs as little as £19/year with DormantFile. Closing and later re-incorporating costs £12 (incorporation fee) plus the hassle of setting everything up again.

## If you're keeping it open

You still need to file every year, even if the company does nothing. That means:

- Annual accounts with Companies House (every 9 months from your ARD)
- A confirmation statement (at least every 12 months)
- A nil CT600 with HMRC (if registered for Corporation Tax)

Read our guide on [dormant company filing deadlines](/guides/dormant-company-filing-deadlines) and consider setting up automatic reminders so you don't miss a deadline and incur [penalties](/guides/late-filing-penalties).

## Key points

- Apply to strike off using DS01 (£33 filing fee).
- Process takes about 3 months.
- Any remaining assets become property of the Crown.
- Consider keeping the company if you want to protect the name or might use it later.
- If keeping it open, you still need to file annually.
```

- [ ] **Step 5: Write Guide 10 — First year filing**

Create `content/guides/first-year-filing-new-company.mdx`:

```mdx
---
title: "First year filing for a new dormant company"
description: "What a newly incorporated dormant company needs to file in its first year: accounts, CT600, and confirmation statement timelines."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "getting-started"
keywords: ["new company filing", "first year accounts", "first filing deadline", "newly incorporated", "dormant company first year"]
---

You've just incorporated a company and it's going to sit dormant. What do you need to file, and when?

## The three filings

Every UK limited company, including dormant ones, has three regular filing obligations:

### 1. Annual accounts (Companies House)

Your first accounts cover the period from incorporation to your first [accounting reference date](/answers/what-is-an-accounting-reference-date) (ARD).

**Default ARD:** The last day of the month in which the anniversary of incorporation falls. For a company incorporated on 15 March 2026, the default ARD is 31 March 2027. The first accounting period runs from 15 March 2026 to 31 March 2027.

**First-year deadline:** The later of:
- 9 months after the end of the accounting period, or
- 21 months from the date of incorporation

This gives you extra breathing room for your first filing.

For dormant accounts, you'll file an AA02 confirming no significant accounting transactions. See [how to file dormant company accounts](/guides/how-to-file-dormant-company-accounts).

### 2. Confirmation statement (Companies House)

A [confirmation statement](/answers/what-is-a-confirmation-statement-cs01) (CS01) must be filed at least once every 12 months from the date of incorporation. This confirms your company's details: registered office address, directors, shareholders, and SIC codes.

The filing fee is £34 (online) or £62 (paper).

This is separate from annual accounts and has its own deadline.

### 3. CT600 (HMRC) — only if registered for Corporation Tax

If your company is registered for Corporation Tax, you need to file a nil CT600 within 12 months of the end of the accounting period.

Not every new dormant company will be registered. If you incorporated but never notified HMRC, you may not need a CT600 at all. See our guide on [whether you need a CT600](/guides/do-i-need-ct600-dormant-company).

## Example timeline

Company incorporated: **1 June 2026**

| Filing | Period | Deadline |
|--------|--------|----------|
| Confirmation statement | By 1 June 2027 | 1 June 2027 (12 months from incorporation) |
| First annual accounts | 1 Jun 2026 – 30 Jun 2027 | 1 March 2028 (21 months from incorporation) |
| First CT600 (if applicable) | 1 Jun 2026 – 30 Jun 2027 | 30 June 2028 (12 months after period end) |

## Tips for first-year filing

- **Don't panic about the first accounts deadline.** The 21-month rule means you have plenty of time.
- **Do file your confirmation statement on time.** This is the first filing that comes due — typically 12 months after incorporation.
- **Check your Corporation Tax status.** If you're not registered, you don't need a CT600. If you're unsure, call HMRC on 0300 200 3410.
- **Set up reminders.** DormantFile calculates all deadlines automatically and sends email reminders so you never miss a date.

## Key points

- New dormant companies need: accounts (Companies House), confirmation statement (Companies House), and possibly CT600 (HMRC).
- First accounts deadline: the later of 9 months after period end or 21 months from incorporation.
- Confirmation statement: due within 12 months of incorporation.
- CT600: only if registered for Corporation Tax, due 12 months after period end.
```

- [ ] **Step 6: Verify all 10 guides parse**

```bash
cd /Users/ben/Documents/tax-project && node -e "
const matter = require('gray-matter');
const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'content/guides');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
console.log(files.length + ' guides found');
files.forEach(f => {
  const { data } = matter(fs.readFileSync(path.join(dir, f), 'utf-8'));
  console.log('OK:', data.title, '(' + data.category + ')');
});
"
```

Expected: 10 guides found, all parse correctly.

- [ ] **Step 7: Commit**

```bash
git add content/guides/how-to-check-company-dormant.mdx content/guides/dormant-company-filing-deadlines.mdx content/guides/cost-to-file-dormant-accounts.mdx content/guides/how-to-close-dormant-company.mdx content/guides/first-year-filing-new-company.mdx
git commit -m "content: add guides 6-10 (eligibility, deadlines, costs, closing, first year)"
```

---

### Task 10: Answer Content (Answers 1–5)

**Files:**
- Create: `content/answers/what-is-a-ct600.mdx`
- Create: `content/answers/what-is-a-utr-number.mdx`
- Create: `content/answers/what-is-an-accounting-reference-date.mdx`
- Create: `content/answers/what-is-a-companies-house-authentication-code.mdx`
- Create: `content/answers/what-are-dormant-company-accounts-aa02.mdx`

**Depends on:** Task 5

**Writing guidance:** Each answer should be 300–500 words. Plain English definition, why it matters, what to do about it, link to the relevant guide. Use the format from the spec.

- [ ] **Step 1: Write Answer 1 — What is a CT600?**

Create `content/answers/what-is-a-ct600.mdx`:

```mdx
---
title: "What is a CT600?"
description: "A plain English explanation of the CT600 Corporation Tax return, who needs to file one, and what it means for dormant companies."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["CT600", "Corporation Tax return", "what is CT600", "nil CT600"]
---

A CT600 is the Corporation Tax return that UK companies file with HMRC. It reports a company's income, gains, and how much Corporation Tax it owes for an accounting period.

## Why it matters for dormant companies

If your dormant company is registered for Corporation Tax, you must file a CT600 every year — even though the company earned nothing and owes no tax. This is called a **nil CT600** because every figure on the return is zero.

Not filing a CT600 when required results in automatic penalties from HMRC, starting at £100 for being one day late.

## What you need to do

If your company has a Unique Taxpayer Reference (UTR) from HMRC, you almost certainly need to file. If you've never received a UTR and never registered for Corporation Tax, you probably don't.

To file a nil CT600, you need:
- Your company's UTR
- HMRC Government Gateway credentials
- Your accounting period dates

Since [CATO closed](/guides/cato-closed-options) in March 2026, you need commercial software to file. DormantFile handles nil CT600 filing from £19/year — your credentials are used once and [never stored](/security).

**Read the full guide:** [How to file a nil CT600 tax return with HMRC](/guides/how-to-file-nil-ct600)
```

- [ ] **Step 2: Write Answer 2 — What is a UTR number?**

Create `content/answers/what-is-a-utr-number.mdx`:

```mdx
---
title: "What is a UTR number?"
description: "What a Unique Taxpayer Reference is, where to find it, and why you need it to file a CT600 for your dormant company."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["UTR", "Unique Taxpayer Reference", "what is UTR", "HMRC UTR", "company UTR"]
---

A UTR (Unique Taxpayer Reference) is a 10-digit number issued by HMRC to identify your company for Corporation Tax purposes. It looks something like `1234567890`.

## Why it matters

You need your UTR to file a CT600 Corporation Tax return. Without it, HMRC cannot match your filing to your company. It's also the key indicator of whether your company is registered for Corporation Tax at all — if you have a UTR, you're registered.

## Where to find it

HMRC sends the UTR by post to your company's registered office address when the company first registers for Corporation Tax. It appears on:

- The original "Notice to deliver a Company Tax Return" letter from HMRC
- Any Corporation Tax correspondence from HMRC
- Your HMRC online account (if you've set one up)

If you've lost it, call HMRC's Corporation Tax helpline on **0300 200 3410** and they can reissue it.

## What if you don't have one?

If your company was incorporated but never registered for Corporation Tax, you won't have a UTR. In that case, you don't need to file a CT600 — you only need annual accounts with Companies House. See our guide on [whether you need a CT600](/guides/do-i-need-ct600-dormant-company). Check our [pricing page](/pricing) to see what DormantFile costs.

**Read the full guide:** [How to file a nil CT600 tax return with HMRC](/guides/how-to-file-nil-ct600)
```

- [ ] **Step 3: Write Answer 3 — What is an accounting reference date?**

Create `content/answers/what-is-an-accounting-reference-date.mdx`:

```mdx
---
title: "What is an accounting reference date?"
description: "What an accounting reference date (ARD) is, how it's set, and how it determines your dormant company's filing deadlines."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "deadlines"
keywords: ["accounting reference date", "ARD", "what is ARD", "filing period", "accounting period"]
---

Your accounting reference date (ARD) is the date to which your company prepares its annual accounts each year. It determines when your accounting period ends and, therefore, when your filings are due.

## How it's set

When a company is incorporated, Companies House automatically sets the ARD to the **last day of the month in which the anniversary of incorporation falls**.

**Example:** Company incorporated on 15 June 2025. The default ARD is **30 June**. Each accounting period ends on 30 June, and annual accounts cover the period up to that date.

You can change your ARD by filing a form with Companies House, but most dormant companies have no reason to do so.

## Why it matters

Your ARD determines your filing deadlines:

- **Annual accounts:** due 9 months after the ARD (e.g., ARD of 30 June → accounts due 31 March)
- **CT600:** due 12 months after the end of the accounting period

Knowing your ARD means knowing when your filings are due. If you're not sure what yours is, search for your company on the Companies House register — it's shown on the company overview page.

## What to do

Check your accounting reference date on the Companies House website. DormantFile uses your accounting period dates to calculate all deadlines automatically and sends reminders so you never file late. See [how it works](/how-it-works) for the full process.

**Read the full guide:** [Dormant company filing deadlines explained](/guides/dormant-company-filing-deadlines)
```

- [ ] **Step 4: Write Answer 4 — What is a Companies House authentication code?**

Create `content/answers/what-is-a-companies-house-authentication-code.mdx`:

```mdx
---
title: "What is a Companies House authentication code?"
description: "What the Companies House authentication code is, how to get one, and why you need it to file dormant company accounts online."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["authentication code", "Companies House code", "auth code", "online filing code", "WebFiling code"]
---

A Companies House authentication code is a 6-character alphanumeric code (like `A1B2C3`) that verifies you're authorised to file documents online for your company. Think of it as a password for your company's filings.

## Why you need it

You need the authentication code to file annual accounts online — whether through Companies House WebFiling or through third-party software like DormantFile. Without it, you cannot submit your dormant accounts electronically.

## How to get one

Companies House posts the authentication code to your company's **registered office address**. If you haven't received one, or if you've lost it, you can request a new one:

1. Go to the Companies House WebFiling service
2. Sign in or create an account
3. Request a new authentication code for your company
4. It will be posted to the registered office address within 5 working days

The code is sent by post (not email) as a security measure — it proves that the person filing has access to the registered office.

## Important notes

- The code is linked to the company, not to you personally. If directors change, the code stays the same.
- It does not expire, but you can request a new one at any time (which invalidates the old one).
- Keep it secure — anyone with this code can file documents on your company's behalf. DormantFile keeps your data safe — see our [security page](/security).

**Read the full guide:** [How to file dormant company accounts with Companies House](/guides/how-to-file-dormant-company-accounts)
```

- [ ] **Step 5: Write Answer 5 — What are dormant company accounts?**

Create `content/answers/what-are-dormant-company-accounts-aa02.mdx`:

```mdx
---
title: "What are dormant company accounts (AA02)?"
description: "What AA02 dormant company accounts are, when you need to file them, and what they contain."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["AA02", "dormant accounts", "dormant company accounts", "abbreviated accounts", "what is AA02"]
---

Dormant company accounts (formally known as AA02) are a simplified set of annual accounts that dormant companies file with Companies House. They confirm that the company had no significant accounting transactions during the period.

## What they contain

Unlike full company accounts (which include a profit and loss statement, balance sheet, and notes), dormant accounts are minimal. They consist of:

- A balance sheet showing the company's position at the end of the period (typically showing zero or just the nominal value of issued shares)
- A statement that the company was dormant throughout the period
- The director's name

There is no profit and loss account because there were no transactions.

## Who needs to file them

Every UK limited company registered at Companies House must file annual accounts — even if dormant. If your company qualifies as dormant under the [Companies Act definition](/answers/what-does-dormant-mean-companies-act) (no significant accounting transactions), you file the simplified AA02 version.

## When they're due

Annual accounts are due **9 months** after your accounting reference date. Late filing triggers [automatic penalties](/guides/late-filing-penalties) starting at £150.

## How to file

You can file dormant accounts through Companies House WebFiling (free), through DormantFile (which submits via the official API — see [how it works](/how-it-works)), or through an accountant. See our [pricing comparison](/pricing) for costs.

**Read the full guide:** [How to file dormant company accounts with Companies House](/guides/how-to-file-dormant-company-accounts)
```

- [ ] **Step 6: Commit**

```bash
git add content/answers/what-is-a-ct600.mdx content/answers/what-is-a-utr-number.mdx content/answers/what-is-an-accounting-reference-date.mdx content/answers/what-is-a-companies-house-authentication-code.mdx content/answers/what-are-dormant-company-accounts-aa02.mdx
git commit -m "content: add answers 1-5 (CT600, UTR, ARD, auth code, AA02)"
```

---

### Task 11: Answer Content (Answers 6–10)

**Files:**
- Create: `content/answers/what-is-the-hmrc-gateway.mdx`
- Create: `content/answers/what-is-a-confirmation-statement-cs01.mdx`
- Create: `content/answers/what-are-companies-house-late-filing-penalties.mdx`
- Create: `content/answers/what-does-dormant-mean-companies-act.mdx`
- Create: `content/answers/what-is-the-difference-between-dissolved-and-dormant.mdx`

**Depends on:** Task 5

- [ ] **Step 1: Write Answer 6 — What is the HMRC Gateway?**

Create `content/answers/what-is-the-hmrc-gateway.mdx`:

```mdx
---
title: "What is the HMRC Gateway?"
description: "What the HMRC Government Gateway is, why you need it, and how it's used to file CT600 returns for dormant companies."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "filing"
keywords: ["HMRC Gateway", "Government Gateway", "HMRC login", "Gateway credentials", "HMRC online"]
---

The HMRC Government Gateway is an online authentication system that lets you access HMRC's digital services. It's how you (or software acting on your behalf) log in to submit tax returns, including CT600 Corporation Tax returns.

## Why it matters

To file a nil CT600 for your dormant company, you need Government Gateway credentials — a user ID and password. These authenticate you with HMRC and prove you're authorised to file on behalf of the company.

When you use DormantFile to submit a CT600, you enter your Gateway credentials at the point of filing. They're transmitted directly to HMRC to authenticate the submission and are never stored by DormantFile. See our [security page](/security) for details.

## How to get an account

If your company is registered for Corporation Tax, you should already have a Government Gateway account. If not:

1. Go to the HMRC online services page on GOV.UK
2. Create an organisation account
3. Enrol for Corporation Tax using your company's UTR

The process involves identity verification and may take several days. When you file through DormantFile, your credentials are used once and [never stored](/security).

## What if you've forgotten your credentials?

You can reset your password through the Government Gateway service. If you've lost your user ID, HMRC can help you recover it — call 0300 200 3410.

**Read the full guide:** [How to file a nil CT600 tax return with HMRC](/guides/how-to-file-nil-ct600)
```

- [ ] **Step 2: Write Answer 7 — What is a confirmation statement?**

Create `content/answers/what-is-a-confirmation-statement-cs01.mdx`:

```mdx
---
title: "What is a confirmation statement (CS01)?"
description: "What a confirmation statement is, how it differs from annual accounts, and when your dormant company needs to file one."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "getting-started"
keywords: ["confirmation statement", "CS01", "annual return", "Companies House", "company details"]
---

A confirmation statement (CS01) is a filing with Companies House that confirms your company's details are up to date. It replaced the old Annual Return in June 2016.

## What it confirms

The confirmation statement checks that the following details on the Companies House register are correct:

- Registered office address
- Directors and secretaries
- Shareholders and share capital
- SIC (industry) codes
- People with significant control (PSC)

If anything has changed, you update it as part of the filing. If nothing has changed, you simply confirm the existing details.

## How it differs from annual accounts

The confirmation statement and annual accounts are **separate filings** with different deadlines:

- **Annual accounts:** report the company's financial position. Due 9 months after accounting reference date.
- **Confirmation statement:** confirms company details are correct. Due at least once every 12 months from incorporation (or the last CS01).

You need to file both, even if your company is dormant.

## Filing fee

The confirmation statement has a filing fee of **£34** (online) or **£62** (paper). This is payable to Companies House each time you file.

## What to do

File your confirmation statement through Companies House WebFiling. DormantFile handles annual accounts and CT600 returns (see our [pricing](/pricing)) but does not currently handle confirmation statements — you'll need to file this one directly with Companies House.

**Read the full guide:** [First year filing for a new dormant company](/guides/first-year-filing-new-company)
```

- [ ] **Step 3: Write Answer 8 — Late filing penalties**

Create `content/answers/what-are-companies-house-late-filing-penalties.mdx`:

```mdx
---
title: "What are Companies House late filing penalties?"
description: "The automatic penalties Companies House charges for filing annual accounts late, including amounts and how they escalate."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "deadlines"
keywords: ["late filing penalties", "Companies House penalties", "penalty amounts", "late accounts", "filing fine"]
---

Companies House charges automatic, fixed penalties when a company files its annual accounts late. There is no grace period and no discretion — the penalty is triggered the day after the deadline.

## Penalty amounts (private companies)

| How late | Penalty |
|----------|---------|
| Up to 1 month | £150 |
| 1 to 3 months | £375 |
| 3 to 6 months | £750 |
| More than 6 months | £1,500 |

For public companies, the penalties are significantly higher (£750 to £7,500).

## Why it matters for dormant companies

These penalties apply even if your company is dormant with nothing to report. The filing obligation exists regardless of activity. Many directors of dormant companies get caught out because they forget about the deadline — the company does nothing, so the filing slips their mind.

If you file late in two consecutive years, the penalty doubles.

## How to avoid them

- Know your deadline: 9 months after your [accounting reference date](/answers/what-is-an-accounting-reference-date).
- File early — there's no benefit to waiting.
- Set up reminders. DormantFile sends automatic email reminders — see [how it works](/how-it-works) for the full process.

Note that HMRC has separate penalties for late CT600 returns — see our full guide for details.

**Read the full guide:** [What happens if you don't file your dormant company accounts](/guides/late-filing-penalties)
```

- [ ] **Step 4: Write Answer 9 — What does dormant mean?**

Create `content/answers/what-does-dormant-mean-companies-act.mdx`:

```mdx
---
title: "What does 'dormant' mean under the Companies Act?"
description: "The legal definition of a dormant company under the Companies Act 2006, what counts as a significant transaction, and common exceptions."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "eligibility"
keywords: ["dormant definition", "Companies Act dormant", "section 1169", "significant accounting transaction", "dormant meaning"]
---

Under the Companies Act 2006 (section 1169), a company is dormant during any period in which it has no **significant accounting transactions**.

## What counts as significant?

A "significant accounting transaction" is any transaction that must be entered in the company's accounting records. This includes:

- Receiving money (even bank interest)
- Making payments (even small ones)
- Issuing invoices
- Buying or selling anything

## What doesn't count?

Two specific transactions are excluded:

- **Shares taken by subscribers on formation** — the initial share capital paid by the founding shareholders when the company was incorporated.
- **Fees paid to Companies House** — such as the annual confirmation statement fee or the filing fee for accounts.

These are the only exceptions. Any other transaction — no matter how small — means the company is not dormant.

## Why the definition matters

If your company qualifies as dormant, you can file simplified dormant accounts ([AA02](/answers/what-are-dormant-company-accounts-aa02)) instead of full accounts. Filing dormant accounts for a company that isn't actually dormant is an offence.

Note that HMRC has its own slightly different definition of dormant for Corporation Tax purposes. See our full guide for the comparison. If your company qualifies, DormantFile makes filing simple — see [how it works](/how-it-works).

**Read the full guide:** [How to check if your company is dormant](/guides/how-to-check-company-dormant)
```

- [ ] **Step 5: Write Answer 10 — Dissolved vs dormant**

Create `content/answers/what-is-the-difference-between-dissolved-and-dormant.mdx`:

```mdx
---
title: "What is the difference between dissolved and dormant?"
description: "The key differences between a dissolved company and a dormant company, and why it matters for your filing obligations."
publishedAt: "2026-03-27"
updatedAt: "2026-03-27"
category: "admin"
keywords: ["dissolved vs dormant", "difference dissolved dormant", "company dissolved", "company dormant", "struck off"]
---

"Dormant" and "dissolved" are very different things, though they're often confused. The difference matters because it determines whether you still need to file.

## Dormant

A dormant company is **still active on the Companies House register** but has no significant accounting transactions. It exists as a legal entity — it has a company number, registered office, and directors. It just isn't doing anything.

**Filing obligations:** A dormant company must still file annual accounts, a confirmation statement, and (if registered for Corporation Tax) a CT600 return every year. The filings are simplified, but they're mandatory.

## Dissolved

A dissolved company has been **removed from the Companies House register**. It no longer exists as a legal entity. Its company number is marked as dissolved, and it has no directors, no registered office, and no obligations.

**Filing obligations:** None. A dissolved company has no filing requirements because it no longer exists.

## How a company gets dissolved

A company can be dissolved in two ways:

1. **Voluntary strike-off (DS01):** The directors apply to Companies House to have the company struck off. This takes about 3 months and costs £33.
2. **Compulsory strike-off:** Companies House strikes off the company, usually because it failed to file accounts or a confirmation statement for an extended period.

## Which should you choose?

If you want to keep the company for potential future use or to protect the name, keep it dormant and file each year — DormantFile handles it from [£19/year](/pricing). If you're sure you'll never need it again, dissolve it using the DS01 process to end all filing obligations permanently.

**Read the full guide:** [How to close a dormant company (and when to keep it open)](/guides/how-to-close-dormant-company)
```

- [ ] **Step 6: Verify all 10 answers parse**

```bash
cd /Users/ben/Documents/tax-project && node -e "
const matter = require('gray-matter');
const fs = require('fs');
const path = require('path');
const dir = path.join(process.cwd(), 'content/answers');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mdx'));
console.log(files.length + ' answers found');
files.forEach(f => {
  const { data } = matter(fs.readFileSync(path.join(dir, f), 'utf-8'));
  console.log('OK:', data.title, '(' + data.category + ')');
});
"
```

Expected: 10 answers found, all parse correctly.

- [ ] **Step 7: Commit**

```bash
git add content/answers/what-is-the-hmrc-gateway.mdx content/answers/what-is-a-confirmation-statement-cs01.mdx content/answers/what-are-companies-house-late-filing-penalties.mdx content/answers/what-does-dormant-mean-companies-act.mdx content/answers/what-is-the-difference-between-dissolved-and-dormant.mdx
git commit -m "content: add answers 6-10 (Gateway, CS01, penalties, dormant definition, dissolved vs dormant)"
```

---

### Task 12: Landing Page Updates & Final Verification

**Files:**
- Modify: `src/app/page.tsx`

**Depends on:** All previous tasks

- [ ] **Step 1: Update landing page footer**

In `src/app/page.tsx`, update the footer section (around line 445-472) to include links to the new pages. Replace the existing footer with:

```tsx
{/* Footer */}
<footer
  style={{ backgroundColor: "#F1F5F9", borderTop: "1px solid #E2E8F0" }}
  className="py-8 px-6"
>
  <div className="max-w-4xl mx-auto">
    <div className="flex flex-wrap justify-center gap-6 mb-4">
      {[
        { href: "/about", label: "About" },
        { href: "/security", label: "Security" },
        { href: "/faq", label: "FAQ" },
        { href: "/contact", label: "Contact" },
        { href: "/privacy", label: "Privacy" },
        { href: "/terms", label: "Terms" },
      ].map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="text-sm transition-colors duration-200"
          style={{ color: "#64748B" }}
        >
          {link.label}
        </Link>
      ))}
    </div>
    <p className="text-center text-xs" style={{ color: "#94A3B8" }}>
      DormantFile is not an accountancy firm. We provide a software tool only.
    </p>
  </div>
</footer>
```

- [ ] **Step 2: Add "See full walkthrough" link to How It Works section**

In `src/app/page.tsx`, after the How It Works section's three steps (around line 196, after the closing `</div>` of the grid), add:

```tsx
<p className="text-center mt-8">
  <Link
    href="/how-it-works"
    className="text-sm font-medium transition-colors duration-200"
    style={{ color: "#2563EB" }}
  >
    See the full walkthrough &rarr;
  </Link>
</p>
```

- [ ] **Step 3: Run all tests**

```bash
cd /Users/ben/Documents/tax-project && npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Run production build**

```bash
cd /Users/ben/Documents/tax-project && npx next build 2>&1 | tail -40
```

Expected: Build succeeds. All routes should be listed including:
- `/(marketing)/about`
- `/(marketing)/security`
- `/(marketing)/how-it-works`
- `/(marketing)/pricing`
- `/(marketing)/faq`
- `/(marketing)/contact`
- `/(marketing)/privacy`
- `/(marketing)/terms`
- `/(marketing)/guides`
- `/(marketing)/guides/[slug]` (10 static params)
- `/(marketing)/answers`
- `/(marketing)/answers/[slug]` (10 static params)
- `/sitemap.xml`
- `/robots.txt`

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: update landing page footer and add how-it-works link"
```

- [ ] **Step 6: Run content loader tests one final time**

```bash
cd /Users/ben/Documents/tax-project && npx vitest run src/__tests__/lib/content/
```

Expected: All content tests pass.
