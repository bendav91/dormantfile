# Unified Navigation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the separate MarketingNav component and inline app nav with a single config-driven `<SiteNav>` component that includes a polished mobile slide-out drawer.

**Architecture:** One `"use client"` component (`SiteNav`) with two internal config objects selected by a `variant` prop. Desktop shows a sticky top bar; mobile shows a hamburger that opens a compact left-side drawer with overlay, scroll lock, focus trap, and accordion nav groups.

**Tech Stack:** React 19, Next.js (App Router), Tailwind CSS v4, CSS custom properties, lucide-react icons, next-auth (SignOutButton), Vitest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-30-unified-nav-design.md`

---

## File Structure

| File                                        | Action | Responsibility                                                             |
| ------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| `src/components/SiteNav.tsx`                | Create | Unified nav component — config, desktop bar, mobile drawer, all behaviours |
| `src/__tests__/components/SiteNav.test.tsx` | Create | Component tests for both variants, drawer interactions, accessibility      |
| `src/app/(marketing)/layout.tsx`            | Modify | Swap `MarketingNav` import for `SiteNav variant="marketing"`               |
| `src/app/(app)/layout.tsx`                  | Modify | Remove inline nav, add `SiteNav variant="app"` with user prop              |
| `src/components/marketing/MarketingNav.tsx` | Delete | Fully replaced                                                             |

---

## Task 1: SiteNav — Config types and static data

**Files:**

- Create: `src/components/SiteNav.tsx`

- [ ] **Step 1: Create `SiteNav.tsx` with types and config objects**

```tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/theme-toggle";
import SignOutButton from "@/components/sign-out-button";

// --- Types ---

type NavLink = { href: string; label: string };
type NavGroup = { label: string; children: NavLink[] };
type NavItem = NavLink | NavGroup;

function isNavGroup(item: NavItem): item is NavGroup {
  return "children" in item;
}

interface NavConfig {
  links: NavItem[];
  logoHref: string;
  cta: { href: string; label: string } | null;
  authLinks: NavLink[];
}

interface SiteNavProps {
  variant: "marketing" | "app";
  user?: { email: string };
}

// --- Configs ---

const MARKETING_CONFIG: NavConfig = {
  links: [
    { href: "/pricing", label: "Pricing" },
    {
      label: "Resources",
      children: [
        { href: "/guides", label: "Guides" },
        { href: "/answers", label: "Answers" },
        { href: "/faq", label: "FAQ" },
        { href: "/security", label: "Security" },
      ],
    },
  ],
  logoHref: "/",
  cta: { href: "/register", label: "Get started" },
  authLinks: [{ href: "/login", label: "Sign in" }],
};

const APP_CONFIG: NavConfig = {
  links: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
  ],
  logoHref: "/dashboard",
  cta: null,
  authLinks: [],
};
```

Write just the types and config objects for now. The component body comes in the next tasks. End the file after `APP_CONFIG` — no export yet.

- [ ] **Step 2: Commit**

```bash
git add src/components/SiteNav.tsx
git commit -m "feat(nav): add SiteNav config types and static data"
```

---

## Task 2: SiteNav — Desktop bar

**Files:**

- Modify: `src/components/SiteNav.tsx`

- [ ] **Step 1: Add the desktop Resources dropdown sub-component**

Add this above the main `SiteNav` export, after the config objects:

```tsx
function DesktopDropdown({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && open) close();
        }}
        aria-expanded={open}
        aria-haspopup="true"
        className="text-sm font-medium transition-colors duration-200 flex items-center gap-1"
        style={{
          color: "var(--color-text-primary)",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        {group.label}
        <ChevronDown
          size={14}
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </button>
      {open && (
        <div
          role="menu"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: "0.5rem",
            backgroundColor: "var(--color-bg-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "0.5rem",
            boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
            minWidth: "10rem",
            padding: "0.25rem 0",
            zIndex: 51,
          }}
        >
          {group.children.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block text-sm transition-colors duration-200"
              style={{
                padding: "0.5rem 1rem",
                color: "var(--color-text-body)",
                textDecoration: "none",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the main `SiteNav` export with the desktop bar**

Add the exported component after `DesktopDropdown`:

```tsx
export function SiteNav({ variant, user }: SiteNavProps) {
  const config = variant === "marketing" ? MARKETING_CONFIG : APP_CONFIG;

  return (
    <nav
      style={{
        backgroundColor: "var(--color-bg-card)",
        borderBottom: "1px solid var(--color-border)",
      }}
      className="sticky top-0 z-50"
    >
      <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            href={config.logoHref}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <Logo height={24} />
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {config.links.map((item) =>
              isNavGroup(item) ? (
                <DesktopDropdown key={item.label} group={item} />
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm font-medium transition-colors duration-200"
                  style={{ color: "var(--color-text-primary)", textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />

          {/* Auth area */}
          {variant === "app" && user && (
            <>
              <span
                className="text-sm font-medium"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {user.email}
              </span>
              <SignOutButton />
            </>
          )}

          {config.authLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-colors duration-200 nav-signin-link"
              style={{ color: "var(--color-text-primary)", textDecoration: "none" }}
            >
              {link.label}
            </Link>
          ))}

          {config.cta && (
            <Link
              href={config.cta.href}
              className="text-sm font-semibold rounded-lg transition-[opacity,transform] duration-200 motion-safe:hover:-translate-y-0.5"
              style={{
                backgroundColor: "var(--color-cta)",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "8px",
                textDecoration: "none",
              }}
            >
              {config.cta.label}
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
```

Note: No mobile hamburger button yet — that comes in Task 3. The mobile breakpoint just hides the nav links for now.

- [ ] **Step 3: Commit**

```bash
git add src/components/SiteNav.tsx
git commit -m "feat(nav): add SiteNav desktop bar with dropdown"
```

---

## Task 3: SiteNav — Mobile drawer

**Files:**

- Modify: `src/components/SiteNav.tsx`

- [ ] **Step 1: Add state and effects for the drawer**

Inside the `SiteNav` function, before the `return`, add:

```tsx
const [drawerOpen, setDrawerOpen] = useState(false);
const [accordionOpen, setAccordionOpen] = useState(false);
const hamburgerRef = useRef<HTMLButtonElement>(null);
const drawerRef = useRef<HTMLDivElement>(null);
const pathname = usePathname();

// Close drawer on route change
useEffect(() => {
  setDrawerOpen(false);
  setAccordionOpen(false);
}, [pathname]);

// Scroll lock
useEffect(() => {
  if (drawerOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
  return () => {
    document.body.style.overflow = "";
  };
}, [drawerOpen]);

// Escape key and focus trap
useEffect(() => {
  if (!drawerOpen) return;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      setDrawerOpen(false);
      hamburgerRef.current?.focus();
      return;
    }
    if (e.key === "Tab" && drawerRef.current) {
      const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  document.addEventListener("keydown", handleKeyDown);
  return () => document.removeEventListener("keydown", handleKeyDown);
}, [drawerOpen]);

const closeDrawer = useCallback(() => {
  setDrawerOpen(false);
  setAccordionOpen(false);
}, []);
```

- [ ] **Step 2: Add hamburger button to the top bar**

Inside the top-bar `<div>`, after the logo/links `<div>` and before the desktop right side `<div>`, add:

```tsx
{
  /* Mobile hamburger */
}
<button
  ref={hamburgerRef}
  onClick={() => setDrawerOpen(!drawerOpen)}
  aria-expanded={drawerOpen}
  aria-label={drawerOpen ? "Close menu" : "Open menu"}
  className="md:hidden"
  style={{
    color: "var(--color-text-primary)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px",
  }}
>
  {drawerOpen ? <X size={24} /> : <Menu size={24} />}
</button>;
```

- [ ] **Step 3: Add the drawer overlay and panel**

After the closing `</div>` of the top bar (but still inside `<nav>`), add:

```tsx
{
  /* Mobile drawer overlay */
}
{
  drawerOpen && (
    <div
      onClick={closeDrawer}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.4)",
        zIndex: 40,
        transition: "opacity 250ms ease-out",
      }}
      aria-hidden="true"
    />
  );
}

{
  /* Mobile drawer */
}
<div
  ref={drawerRef}
  role="dialog"
  aria-modal={drawerOpen}
  aria-label="Navigation menu"
  style={{
    position: "fixed",
    top: 0,
    left: 0,
    bottom: 0,
    width: "260px",
    backgroundColor: "var(--color-bg-card)",
    borderRight: "1px solid var(--color-border)",
    zIndex: 50,
    transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
    transition: "transform 250ms ease-out",
    display: "flex",
    flexDirection: "column",
  }}
>
  {/* Drawer header */}
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 20px",
      borderBottom: "1px solid var(--color-border)",
    }}
  >
    <Link
      href={config.logoHref}
      onClick={closeDrawer}
      style={{ display: "flex", alignItems: "center" }}
    >
      <Logo height={22} />
    </Link>
    <button
      onClick={closeDrawer}
      aria-label="Close menu"
      style={{
        color: "var(--color-text-primary)",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px",
      }}
    >
      <X size={20} />
    </button>
  </div>

  {/* Drawer nav links */}
  <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
    {config.links.map((item) =>
      isNavGroup(item) ? (
        <div key={item.label}>
          <button
            onClick={() => setAccordionOpen(!accordionOpen)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--color-text-primary)",
              background: "none",
              border: "none",
              cursor: "pointer",
              minHeight: "44px",
            }}
          >
            {item.label}
            <ChevronDown
              size={14}
              style={{
                transform: accordionOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
                color: "var(--color-text-muted)",
              }}
            />
          </button>
          {accordionOpen && (
            <div style={{ padding: "0 0 4px 0" }}>
              {item.children.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={closeDrawer}
                  style={{
                    display: "block",
                    padding: "10px 20px 10px 36px",
                    fontSize: "14px",
                    color: "var(--color-text-body)",
                    textDecoration: "none",
                    minHeight: "44px",
                    lineHeight: "24px",
                  }}
                >
                  {child.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Link
          key={item.href}
          href={item.href}
          onClick={closeDrawer}
          style={{
            display: "block",
            padding: "12px 20px",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--color-text-primary)",
            textDecoration: "none",
            minHeight: "44px",
            lineHeight: "20px",
          }}
        >
          {item.label}
        </Link>
      ),
    )}
  </div>

  {/* Drawer footer */}
  <div
    style={{
      borderTop: "1px solid var(--color-border)",
      padding: "16px 20px",
      display: "flex",
      flexDirection: "column",
      gap: "12px",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
      <ThemeToggle />
      {variant === "app" && user && (
        <span
          style={{
            fontSize: "13px",
            color: "var(--color-text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {user.email}
        </span>
      )}
    </div>

    {variant === "app" && <SignOutButton />}

    {config.authLinks.map((link) => (
      <Link
        key={link.href}
        href={link.href}
        onClick={closeDrawer}
        className="text-sm font-medium"
        style={{ color: "var(--color-text-primary)", textDecoration: "none" }}
      >
        {link.label}
      </Link>
    ))}

    {config.cta && (
      <Link
        href={config.cta.href}
        onClick={closeDrawer}
        className="text-sm font-semibold text-center"
        style={{
          backgroundColor: "var(--color-cta)",
          color: "#ffffff",
          padding: "10px 20px",
          borderRadius: "8px",
          textDecoration: "none",
        }}
      >
        {config.cta.label}
      </Link>
    )}
  </div>
</div>;
```

- [ ] **Step 4: Commit**

```bash
git add src/components/SiteNav.tsx
git commit -m "feat(nav): add mobile slide-out drawer with focus trap and scroll lock"
```

---

## Task 4: Tests

**Files:**

- Create: `src/__tests__/components/SiteNav.test.tsx`

Note: The vitest config uses `environment: "node"` by default. These component tests need jsdom. Add a `@vitest-environment jsdom` docblock at the top of the test file. This is the first component test in the repo, so we need to import `@testing-library/jest-dom` for DOM matchers like `toBeInTheDocument()`.

- [ ] **Step 1: Write tests for the marketing variant**

```tsx
/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next-auth/react
vi.mock("next-auth/react", () => ({
  signOut: vi.fn(),
}));

// Mock theme provider
vi.mock("@/components/theme-provider", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn(), resolvedTheme: "light" }),
}));

import { SiteNav } from "@/components/SiteNav";

describe("SiteNav", () => {
  beforeEach(() => {
    document.body.style.overflow = "";
  });

  describe("marketing variant", () => {
    it("renders marketing nav links", () => {
      render(<SiteNav variant="marketing" />);
      expect(screen.getByText("Pricing")).toBeInTheDocument();
      expect(screen.getByText("Resources")).toBeInTheDocument();
      expect(screen.getByText("Sign in")).toBeInTheDocument();
      expect(screen.getByText("Get started")).toBeInTheDocument();
    });

    it("does not render app-specific items", () => {
      render(<SiteNav variant="marketing" />);
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("Settings")).not.toBeInTheDocument();
    });

    it("links logo to /", () => {
      render(<SiteNav variant="marketing" />);
      const logoLink = screen.getByRole("img", { name: "DormantFile" }).closest("a");
      expect(logoLink).toHaveAttribute("href", "/");
    });

    it("opens Resources dropdown on click", () => {
      render(<SiteNav variant="marketing" />);
      const resourcesButtons = screen.getAllByText("Resources");
      // Desktop dropdown button (first one)
      fireEvent.click(resourcesButtons[0]);
      expect(screen.getByRole("menu")).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: "Guides" })).toBeInTheDocument();
    });
  });
```

- [ ] **Step 2: Run tests to verify marketing tests pass**

```bash
npx vitest run src/__tests__/components/SiteNav.test.tsx
```

Expected: All marketing variant tests pass.

- [ ] **Step 3: Add tests for the app variant**

Append to the same describe block:

```tsx
describe("app variant", () => {
  it("renders app nav links", () => {
    render(<SiteNav variant="app" user={{ email: "ben@example.com" }} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("displays user email", () => {
    render(<SiteNav variant="app" user={{ email: "ben@example.com" }} />);
    expect(screen.getByText("ben@example.com")).toBeInTheDocument();
  });

  it("does not render marketing items", () => {
    render(<SiteNav variant="app" user={{ email: "ben@example.com" }} />);
    expect(screen.queryByText("Pricing")).not.toBeInTheDocument();
    expect(screen.queryByText("Get started")).not.toBeInTheDocument();
  });

  it("links logo to /dashboard", () => {
    render(<SiteNav variant="app" user={{ email: "ben@example.com" }} />);
    const logoLink = screen.getByRole("img", { name: "DormantFile" }).closest("a");
    expect(logoLink).toHaveAttribute("href", "/dashboard");
  });
});
```

- [ ] **Step 4: Add tests for the mobile drawer**

Append to the same describe block:

```tsx
  describe("mobile drawer", () => {
    it("opens drawer when hamburger is clicked", () => {
      render(<SiteNav variant="marketing" />);
      const hamburger = screen.getByLabelText("Open menu");
      fireEvent.click(hamburger);
      expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
    });

    it("locks body scroll when drawer is open", () => {
      render(<SiteNav variant="marketing" />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      expect(document.body.style.overflow).toBe("hidden");
    });

    it("unlocks body scroll when drawer is closed", () => {
      render(<SiteNav variant="marketing" />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      fireEvent.click(screen.getByLabelText("Close menu"));
      expect(document.body.style.overflow).toBe("");
    });

    it("closes drawer on Escape key", () => {
      render(<SiteNav variant="marketing" />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      fireEvent.keyDown(document, { key: "Escape" });
      expect(document.body.style.overflow).toBe("");
    });

    it("expands accordion in drawer", () => {
      render(<SiteNav variant="marketing" />);
      fireEvent.click(screen.getByLabelText("Open menu"));
      // Find the accordion button in the drawer (the second "Resources" text)
      const resourcesButtons = screen.getAllByText("Resources");
      const drawerResourcesBtn = resourcesButtons[resourcesButtons.length - 1];
      fireEvent.click(drawerResourcesBtn);
      expect(screen.getByText("Guides")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 5: Run all tests**

```bash
npx vitest run src/__tests__/components/SiteNav.test.tsx
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/__tests__/components/SiteNav.test.tsx
git commit -m "test(nav): add SiteNav component tests for both variants and drawer"
```

---

## Task 5: Wire up layouts and delete old nav

**Files:**

- Modify: `src/app/(marketing)/layout.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Delete: `src/components/marketing/MarketingNav.tsx`

- [ ] **Step 1: Update marketing layout**

In `src/app/(marketing)/layout.tsx`:

- Replace `import { MarketingNav } from "@/components/marketing/MarketingNav"` with `import { SiteNav } from "@/components/SiteNav"`
- Replace `<MarketingNav />` with `<SiteNav variant="marketing" />`

- [ ] **Step 2: Update app layout**

In `src/app/(app)/layout.tsx`:

- Remove the `Settings` import from `lucide-react`
- Remove the `SignOutButton` import (SiteNav handles it internally)
- Remove the `ThemeToggle` import (SiteNav handles it internally)
- Add `import { SiteNav } from "@/components/SiteNav"`
- Replace the entire inline `<nav>...</nav>` block (lines 42-96) with:

```tsx
<SiteNav variant="app" user={{ email: session.user.email! }} />
```

Keep everything else: the `getServerSession` check, redirects, `ibmPlexSans` font, the `<main>` wrapper.

- [ ] **Step 3: Delete `MarketingNav.tsx`**

```bash
git rm src/components/marketing/MarketingNav.tsx
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run
```

Expected: All tests pass (including existing tests — no regressions).

- [ ] **Step 5: Run the build**

```bash
npm run build
```

Expected: Build succeeds with no errors. Check that no unused imports or missing references are flagged.

- [ ] **Step 6: Commit**

```bash
git add src/app/'(marketing)'/layout.tsx src/app/'(app)'/layout.tsx
git commit -m "feat(nav): wire up SiteNav in layouts and remove MarketingNav"
```

---

## Task 6: Manual verification

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check marketing pages**

Open `http://localhost:3000`. Verify:

- Desktop: Logo links to `/`, Pricing and Resources links visible, Resources dropdown opens/closes, Sign in and Get started buttons present, theme toggle works
- Mobile (resize to <768px): Hamburger appears, desktop links hidden. Tap hamburger — drawer slides in from left with overlay. Links work. Resources accordion expands. Drawer closes on link click, overlay click, Escape key. Body scroll is locked while open.

- [ ] **Step 3: Check app pages**

Log in and open `http://localhost:3000/dashboard`. Verify:

- Desktop: Logo links to `/dashboard`, Dashboard and Settings links visible, user email shown, Sign out button present, theme toggle works
- Mobile: Same drawer behaviour. Dashboard and Settings in the drawer. Email and Sign out in the drawer footer.

- [ ] **Step 4: Final commit if any fixes needed**

If any visual tweaks are required during verification, make them and commit:

```bash
git add -A
git commit -m "fix(nav): visual tweaks from manual verification"
```
