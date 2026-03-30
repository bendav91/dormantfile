# Unified Navigation Component

**Date:** 2026-03-30
**Status:** Approved

## Problem

The app has two separate navigation implementations:

1. **MarketingNav** (`src/components/marketing/MarketingNav.tsx`) — client component with desktop links, Resources dropdown, mobile hamburger menu, theme toggle
2. **App nav** (inline in `src/app/(app)/layout.tsx`) — shows logo, user email, settings icon, theme toggle, sign out. No mobile support at all

This means duplicated logic, inconsistent structure, and a broken mobile experience in the authenticated app.

## Solution

Replace both with a single `<SiteNav>` component that uses a `variant` prop to switch between marketing and app configurations. Rebuild the mobile experience as a compact slide-out drawer for both variants.

## Component API

```tsx
// src/components/SiteNav.tsx ("use client")

// Marketing usage — in (marketing)/layout.tsx
<SiteNav variant="marketing" />

// App usage — in (app)/layout.tsx
<SiteNav variant="app" user={{ email: session.user.email }} />
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `variant` | `"marketing" \| "app"` | Yes | Selects which nav config to use |
| `user` | `{ email: string }` | Only for `"app"` | User info for the auth area |

### Internal Config

The config is defined inside the component as two static objects, selected by `variant`. Each config defines:

- **`links`** — array of `{ href, label }` or `{ label, children: [{ href, label }] }` for accordion groups
- **`logoHref`** — `"/"` for marketing, `"/dashboard"` for app
- **`cta`** — optional `{ href, label }` for CTA button (marketing only)
- **`authLinks`** — controls the right-side auth area

#### Marketing config

```
links:
  - { href: "/pricing", label: "Pricing" }
  - { label: "Resources", children: [
      { href: "/guides", label: "Guides" },
      { href: "/answers", label: "Answers" },
      { href: "/faq", label: "FAQ" },
      { href: "/security", label: "Security" }
    ]}
logoHref: "/"
cta: { href: "/register", label: "Get started" }
authLinks: [{ href: "/login", label: "Sign in" }]
```

#### App config

```
links:
  - { href: "/dashboard", label: "Dashboard" }
  - { href: "/settings", label: "Settings" }
logoHref: "/dashboard"
cta: null
authLinks: [sign out button]
```

## Desktop Layout

Visible at `md` breakpoint and above. Hidden below.

```
[Logo]  [nav links...]                    [theme toggle]  [auth area]
```

- Sticky, `z-50`, `--color-bg-card` background, bottom border
- Max-width 960px, centered with `px-6`
- **Marketing auth area:** "Sign in" text link + orange "Get started" CTA button
- **App auth area:** user email (muted text) + "Sign out" button
- Resources dropdown on desktop: click to toggle, click-outside to close, Escape to close, `role="menu"` with `role="menuitem"` children

## Mobile Drawer

Visible below the `md` breakpoint. The desktop links are replaced by a hamburger button in the top bar.

### Trigger

Hamburger icon (right side of the top bar). Toggles the drawer open/closed. `aria-expanded` and `aria-label` update with state.

### Drawer structure

Compact slide-out from the left, ~260px wide. Three sections top to bottom:

1. **Header** — Logo (links to `logoHref`) + close button (X icon). Same height as the nav bar.
2. **Nav links** — stacked vertically. Each link has a minimum tap target height of 44px. Groups with children render as an accordion: tap the group label to expand/collapse, chevron rotates to indicate state. Indented children below.
3. **Footer** (bottom of drawer) — separated by a top border. Contains theme toggle. Marketing: "Sign in" link + "Get started" CTA button. App: user email (muted) + "Sign out" button.

### Behaviours

- **Animation:** slides in from left via CSS `transform: translateX()` transition, ~250ms ease-out. Overlay fades in simultaneously.
- **Overlay:** dark semi-transparent backdrop behind the drawer. Clicking the overlay closes the drawer.
- **Scroll lock:** `overflow: hidden` applied to `document.body` while drawer is open. Removed on close.
- **Escape key:** closes the drawer and returns focus to the hamburger button.
- **Focus trap:** tab key cycles between the first and last focusable elements inside the drawer.
- **Link clicks:** any nav link click closes the drawer automatically.
- **Route change:** drawer state resets (closed) on navigation.

## Files Changed

### New

- `src/components/SiteNav.tsx` — the unified nav component

### Modified

- `src/app/(marketing)/layout.tsx` — replace `<MarketingNav />` import and usage with `<SiteNav variant="marketing" />`
- `src/app/(app)/layout.tsx` — remove the inline `<nav>` block, import `<SiteNav variant="app" user={{ email: session.user.email }} />`. Session check and redirect logic remain unchanged.

### Deleted

- `src/components/marketing/MarketingNav.tsx` — fully replaced by SiteNav

### Untouched

- `src/components/Logo.tsx` — reused as-is
- `src/components/theme-toggle.tsx` — reused as-is
- `src/components/sign-out-button.tsx` — reused as-is
- `src/components/marketing/MarketingFooter.tsx` — stays in place
- Auth and verify layouts — no nav, no changes
- `src/app/globals.css` — existing CSS custom properties are sufficient

## Out of Scope

- Redesigning the footer
- Changes to auth or verify layouts
- Adding new nav items beyond what's defined above
- Animated page transitions
- Nav search functionality
