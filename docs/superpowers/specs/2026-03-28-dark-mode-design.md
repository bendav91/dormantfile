# Dark Mode Design Spec

## Context

DormantFile is a light-only Next.js app with hardcoded hex colours across ~45 UI files. The app interior uses inline `style` objects almost exclusively; auth and marketing pages use Tailwind classes. Users on dark-mode OS currently see a fully light UI with no adaptation.

This spec adds full dark mode support across all three zones (marketing, auth, app interior) using semantic CSS custom properties for inline-styled components and Tailwind `dark:` variants for Tailwind-styled components.

## Decisions

- **Trigger:** OS preference by default, user-overridable via toggle. Three states: system / light / dark.
- **Palette:** Slate dark (`#0F172A` page bg, `#1E293B` card surfaces). Conservative, professional.
- **Approach:** Semantic CSS tokens (custom properties) toggled via `.dark` class on `<html>`. Inline styles reference `var(--xxx)`, Tailwind components use `dark:` variants.
- **Scope:** All three zones — marketing site, auth pages, app interior.
- **Persistence:** localStorage only. No server-side involvement, no cookies, no database.

## Colour Tokens

Defined in `globals.css` under `:root` (light) and `.dark` (dark).

### Core surface and text tokens

| Token                    | Light     | Dark      | Used for                            |
| ------------------------ | --------- | --------- | ----------------------------------- |
| `--color-bg-page`        | `#F8FAFC` | `#0F172A` | Page backgrounds                    |
| `--color-bg-card`        | `#ffffff` | `#1E293B` | Card/panel surfaces, nav bar        |
| `--color-bg-inset`       | `#F8FAFC` | `#334155` | Filing rows, form field backgrounds |
| `--color-bg-disabled`    | `#CBD5E1` | `#475569` | Disabled button backgrounds         |
| `--color-border`         | `#E2E8F0` | `#334155` | Default borders                     |
| `--color-border-subtle`  | `#F1F5F9` | `#1E293B` | Section dividers, subtle separators |
| `--color-text-primary`   | `#1E293B` | `#F1F5F9` | Headings, primary body text         |
| `--color-text-body`      | `#475569` | `#CBD5E1` | Body/paragraph text                 |
| `--color-text-secondary` | `#64748B` | `#94A3B8` | Descriptions, help text             |
| `--color-text-muted`     | `#94A3B8` | `#64748B` | Labels, captions, timestamps        |
| `--color-input-bg`       | `#ffffff` | `#1E293B` | Input backgrounds                   |
| `--color-input-border`   | `#94A3B8` | `#475569` | Input borders                       |

### Brand colour tokens

| Token                    | Light     | Dark      | Used for                                                                   |
| ------------------------ | --------- | --------- | -------------------------------------------------------------------------- |
| `--color-primary`        | `#2563EB` | `#3B82F6` | Primary blue buttons, links, icons                                         |
| `--color-primary-hover`  | `#1D4ED8` | `#60A5FA` | Blue hover states, logo accent                                             |
| `--color-primary-bg`     | `#EFF6FF` | `#172554` | Info callout backgrounds, icon circles                                     |
| `--color-primary-border` | `#DBEAFE` | `#1E40AF` | Info/callout borders, logo crescent (consolidates `#BFDBFE` and `#DBEAFE`) |
| `--color-primary-text`   | `#1E40AF` | `#93C5FD` | Text inside info callouts                                                  |
| `--color-cta`            | `#F97316` | `#F97316` | Orange CTA buttons (same both themes)                                      |

### Status tokens

| Token                    | Light     | Dark      | Used for                            |
| ------------------------ | --------- | --------- | ----------------------------------- |
| `--color-success`        | `#15803D` | `#22C55E` | Success text, icons                 |
| `--color-success-bg`     | `#F0FDF4` | `#052e16` | Accepted badge bg, success callouts |
| `--color-success-border` | `#BBF7D0` | `#166534` | Success callout borders             |
| `--color-success-text`   | `#166534` | `#86EFAC` | Text inside success callouts        |
| `--color-danger`         | `#DC2626` | `#EF4444` | Danger text, icons                  |
| `--color-danger-bg`      | `#FEF2F2` | `#450a0a` | Danger callout backgrounds          |
| `--color-danger-border`  | `#FECACA` | `#991B1B` | Danger callout borders              |
| `--color-danger-text`    | `#7F1D1D` | `#FCA5A5` | Text inside danger callouts         |
| `--color-danger-deep`    | `#B91C1C` | `#F87171` | Rejected/failed badge text          |
| `--color-warning`        | `#CA8A04` | `#EAB308` | Warning icons                       |
| `--color-warning-bg`     | `#FEFCE8` | `#422006` | Warning callout backgrounds         |
| `--color-warning-border` | `#FDE047` | `#854D0E` | Warning callout borders             |
| `--color-warning-text`   | `#713F12` | `#FDE68A` | Text inside warning callouts        |
| `--color-warning-deep`   | `#A16207` | `#FBBF24` | Polling timeout badge text          |
| `--color-warning-link`   | `#92400E` | `#F59E0B` | Links inside warning banners        |
| `--color-due-soon`       | `#D97706` | `#F59E0B` | Due-soon deadline text              |

### Neutral status tokens

| Token                    | Light     | Dark      | Used for                           |
| ------------------------ | --------- | --------- | ---------------------------------- |
| `--color-neutral-bg`     | `#F1F5F9` | `#334155` | Pending badge bg, neutral surfaces |
| `--color-neutral-text`   | `#475569` | `#CBD5E1` | Pending badge text                 |
| `--color-submitted-bg`   | `#EFF6FF` | `#172554` | Submitted badge bg                 |
| `--color-submitted-text` | `#1D4ED8` | `#93C5FD` | Submitted badge text               |

Total: ~36 tokens. Every hardcoded hex value in the codebase maps to one of these.

## Hex-to-Token Mapping Reference

Complete mapping for the mechanical replacement:

| Hex       | Token                                           | Context                                                      |
| --------- | ----------------------------------------------- | ------------------------------------------------------------ |
| `#F8FAFC` | `--color-bg-page` or `--color-bg-inset`         | Page bg vs inset area                                        |
| `#ffffff` | `--color-bg-card`                               | Card/panel surfaces                                          |
| `#F1F5F9` | `--color-border-subtle` or `--color-neutral-bg` | Dividers vs badge bg                                         |
| `#1E293B` | `--color-text-primary`                          | Headings, primary text                                       |
| `#475569` | `--color-text-body`                             | Body/paragraph text                                          |
| `#64748B` | `--color-text-secondary`                        | Help text, descriptions                                      |
| `#94A3B8` | `--color-text-muted`                            | Captions, labels                                             |
| `#CBD5E1` | `--color-bg-disabled`                           | Disabled buttons, muted borders                              |
| `#E2E8F0` | `--color-border`                                | Standard borders                                             |
| `#2563EB` | `--color-primary`                               | Primary blue                                                 |
| `#1D4ED8` | `--color-primary-hover`                         | Blue hover, logo accent                                      |
| `#DBEAFE` | `--color-primary-border`                        | Logo crescent, callout borders (consolidated with `#BFDBFE`) |
| `#EFF6FF` | `--color-primary-bg`                            | Info backgrounds, icon circles                               |
| `#1E40AF` | `--color-primary-text`                          | Text inside info callouts                                    |
| `#BFDBFE` | `--color-primary-border`                        | Info borders                                                 |
| `#F97316` | `--color-cta`                                   | Orange CTAs                                                  |
| `#DC2626` | `--color-danger`                                | Danger red                                                   |
| `#B91C1C` | `--color-danger-deep`                           | Rejected/failed badge text                                   |
| `#FEF2F2` | `--color-danger-bg`                             | Danger backgrounds                                           |
| `#FECACA` | `--color-danger-border`                         | Danger borders                                               |
| `#7F1D1D` | `--color-danger-text`                           | Text in danger callouts                                      |
| `#15803D` | `--color-success`                               | Success green                                                |
| `#F0FDF4` | `--color-success-bg`                            | Success backgrounds                                          |
| `#BBF7D0` | `--color-success-border`                        | Success borders                                              |
| `#166534` | `--color-success-text`                          | Text in success callouts                                     |
| `#14532D` | `--color-success-text`                          | Deep success text (same token)                               |
| `#CA8A04` | `--color-warning`                               | Warning icons                                                |
| `#FEFCE8` | `--color-warning-bg`                            | Warning backgrounds                                          |
| `#FDE047` | `--color-warning-border`                        | Warning borders                                              |
| `#713F12` | `--color-warning-text`                          | Text in warning callouts                                     |
| `#A16207` | `--color-warning-deep`                          | Polling timeout text                                         |
| `#92400E` | `--color-warning-link`                          | Links in warning banners                                     |
| `#D97706` | `--color-due-soon`                              | Due-soon deadline text                                       |
| `#991B1B` | `--color-danger-text`                           | Deep danger text (same token as `#7F1D1D` context)           |

### Conditional colour logic

Several components use ternary expressions to pick colours based on state. These map as follows:

**Dashboard status pill badges:**

```
backgroundColor: tier === "none" ? "#FEF2F2" : active ? "#EFF6FF" : "#F8FAFC"
→ tier === "none" ? "var(--color-danger-bg)" : active ? "var(--color-primary-bg)" : "var(--color-bg-inset)"
```

**Dashboard deadline text:**

```
color: daysLeft <= 0 ? "#DC2626" : daysLeft <= 30 ? "#D97706" : "#64748B"
→ daysLeft <= 0 ? "var(--color-danger)" : daysLeft <= 30 ? "var(--color-due-soon)" : "var(--color-text-secondary)"
```

**Filing status badge `statusConfig`:**
Each status maps to its own token pair:

- pending: `--color-neutral-bg` / `--color-neutral-text`
- submitted: `--color-submitted-bg` / `--color-submitted-text`
- polling_timeout: `--color-warning-bg` / `--color-warning-deep`
- accepted: `--color-success-bg` / `--color-success`
- rejected: `--color-danger-bg` / `--color-danger-deep`
- failed: `--color-danger-bg` / `--color-danger-deep`

## Theme Toggle Mechanism

### Provider (`src/components/theme-provider.tsx`)

Client component wrapping the app in root layout.

- **State:** `"system" | "light" | "dark"` (user preference) + `resolvedTheme` (what's actually applied after resolving "system")
- **On mount:** Read `localStorage("theme")` -> fall back to `"system"` -> resolve via `matchMedia("(prefers-color-scheme: dark)")`
- **Effect:** Add/remove `dark` class on `document.documentElement`. Listen for OS `change` events on the media query to update in real time when preference is "system".
- **Context:** Expose `{ theme, setTheme, resolvedTheme }` via `useTheme()` hook.
- **Meta theme-color:** The provider also updates `<meta name="theme-color">` dynamically based on resolved theme — `#ffffff` for light, `#0F172A` for dark.

### Tailwind v4 dark mode configuration

Tailwind v4 uses `@media (prefers-color-scheme: dark)` for `dark:` variants by default. Since we use a `.dark` class toggle (for the three-state system), we need to override this in `globals.css`:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This tells Tailwind v4 to apply `dark:` variants when the `.dark` class is present on an ancestor, instead of relying on the OS media query.

### Flash prevention

Inline `<script>` in root layout `<head>`, before React hydrates:

```js
(function () {
  try {
    var t = localStorage.getItem("theme");
    var dark =
      t === "dark" || (t !== "light" && matchMedia("(prefers-color-scheme: dark)").matches);
    if (dark) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
```

This runs synchronously before paint, preventing the light-then-dark flash.

### Toggle button (`src/components/theme-toggle.tsx`)

- Sun/Moon icon button (from Lucide)
- Three-state cycle on click: system -> light -> dark -> system
- `aria-label` reflecting next state
- Placed in app nav bar (next to settings gear) and marketing nav

## Migration Strategy

### Inline-styled files (app interior + marketing components)

Mechanical hex-to-var() replacement using the mapping table above. Context determines which token variant to use (e.g. `#F8FAFC` as page background vs inset area).

### SVG fill attributes (Logo)

`Logo.tsx` uses SVG `fill` attributes directly on `<path>` elements (`fill="#2563EB"`), not inline `style` objects. These need converting to `style={{ fill: "var(--color-primary)" }}` since SVG presentation attributes can't reference CSS variables. This is a one-off pattern — only the Logo component has this.

### Lucide icon colours

Icons currently receive hardcoded `color` props: `<Building2 color="#2563EB" />`. Since React props can't use `var()`, migrate these to `color="currentColor"` and set the text colour on the parent element via a token. For icons that need a specific colour different from their parent text, wrap in a `<span>` with the token colour:

```tsx
// Before
<Building2 size={16} color="#2563EB" />

// After — if parent text is already primary blue
<Building2 size={16} color="currentColor" />

// After — if icon needs a specific colour different from parent
<span style={{ color: "var(--color-primary)" }}>
  <Building2 size={16} color="currentColor" />
</span>
```

This applies to all Lucide icon usages with hardcoded `color` props throughout the codebase.

### Tailwind-styled files (auth, cookie consent)

Add `dark:` variants alongside existing classes:

- `text-gray-900` -> `text-gray-900 dark:text-gray-100`
- `bg-gray-50` -> `bg-gray-50 dark:bg-slate-900`
- `bg-white` -> `bg-white dark:bg-slate-800`
- `border-gray-300` -> `border-gray-300 dark:border-slate-600`
- `text-gray-600` -> `text-gray-600 dark:text-gray-300`
- `placeholder-gray-500` -> `placeholder-gray-500 dark:placeholder-gray-400`
- `text-red-600` -> `text-red-600 dark:text-red-400`
- `bg-red-50` -> `bg-red-50 dark:bg-red-950`
- `border-red-200` -> `border-red-200 dark:border-red-800`

### Root layout

The `<html>` element needs `suppressHydrationWarning` because the flash-prevention script adds the `dark` class before React hydrates, causing a mismatch between server-rendered and client HTML.

The `<body>` currently has `bg-white text-gray-900`. Add dark variants: `bg-white dark:bg-slate-950 text-gray-900 dark:text-gray-100`.

### Focus ring styles in globals.css

Update `.focus-ring:focus-visible` and `.focus-ring-input:focus-visible` to use tokens:

- `outline: 2px solid #2563EB` -> `outline: 2px solid var(--color-primary)`
- `box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12)` -> `box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent)`

### Box shadows

Box shadows with `rgba(0,0,0,0.08)` work acceptably on dark backgrounds (less visible, which is fine). No shadow token needed.

## Files Modified

### New files (2)

- `src/components/theme-provider.tsx`
- `src/components/theme-toggle.tsx`

### Modified files (~45)

**Infrastructure:**

| File                  | Change                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `src/app/globals.css` | Token definitions, `.dark` selector, `@custom-variant dark`, focus ring token update                           |
| `src/app/layout.tsx`  | ThemeProvider wrapper, flash-prevention script, `<body>` dark variants, `suppressHydrationWarning` on `<html>` |

**App interior (hex->var()):**

| File                                                        | Change                               |
| ----------------------------------------------------------- | ------------------------------------ |
| `src/app/(app)/layout.tsx`                                  | hex->var(), ThemeToggle in nav       |
| `src/app/(app)/dashboard/page.tsx`                          | hex->var(), conditional colour logic |
| `src/app/(app)/settings/page.tsx`                           | hex->var()                           |
| `src/app/(app)/onboarding/page.tsx`                         | hex->var()                           |
| `src/app/(app)/choose-plan/page.tsx`                        | hex->var()                           |
| `src/app/(app)/agent-setup/page.tsx`                        | hex->var()                           |
| `src/app/(app)/file/[companyId]/page.tsx`                   | hex->var()                           |
| `src/app/(app)/file/[companyId]/accounts/page.tsx`          | hex->var()                           |
| `src/app/(app)/file/[companyId]/accounts/accounts-flow.tsx` | hex->var()                           |
| `src/app/(app)/file/[companyId]/ct600/page.tsx`             | hex->var()                           |
| `src/app/(app)/file/[companyId]/ct600/filing-flow.tsx`      | hex->var()                           |

**Auth pages (dark: Tailwind variants):**

| File                                      | Change                  |
| ----------------------------------------- | ----------------------- |
| `src/app/(auth)/layout.tsx`               | dark: Tailwind variants |
| `src/app/(auth)/login/page.tsx`           | dark: Tailwind variants |
| `src/app/(auth)/register/page.tsx`        | dark: Tailwind variants |
| `src/app/(auth)/forgot-password/page.tsx` | dark: Tailwind variants |
| `src/app/(auth)/reset-password/page.tsx`  | dark: Tailwind variants |

**Marketing pages (hex->var() + dark: mix):**

| File                                          | Change                          |
| --------------------------------------------- | ------------------------------- |
| `src/app/(marketing)/layout.tsx`              | hex->var()                      |
| `src/app/page.tsx`                            | hex->var() + dark: Tailwind mix |
| `src/app/(marketing)/pricing/page.tsx`        | hex->var()                      |
| `src/app/(marketing)/how-it-works/page.tsx`   | hex->var()                      |
| `src/app/(marketing)/contact/page.tsx`        | hex->var()                      |
| `src/app/(marketing)/faq/page.tsx`            | hex->var()                      |
| `src/app/(marketing)/about/page.tsx`          | hex->var()                      |
| `src/app/(marketing)/security/page.tsx`       | hex->var()                      |
| `src/app/(marketing)/terms/page.tsx`          | hex->var()                      |
| `src/app/(marketing)/privacy/page.tsx`        | hex->var()                      |
| `src/app/(marketing)/cookies/page.tsx`        | hex->var()                      |
| `src/app/(marketing)/acceptable-use/page.tsx` | hex->var()                      |
| `src/app/(marketing)/refund/page.tsx`         | hex->var()                      |
| `src/app/(marketing)/guides/page.tsx`         | hex->var()                      |
| `src/app/(marketing)/guides/[slug]/page.tsx`  | hex->var()                      |
| `src/app/(marketing)/answers/page.tsx`        | hex->var()                      |
| `src/app/(marketing)/answers/[slug]/page.tsx` | hex->var()                      |
| `src/app/error.tsx`                           | hex->var()                      |
| `src/app/not-found.tsx`                       | hex->var()                      |

**Components (hex->var() + icon colour migration):**

| File                                               | Change                                        |
| -------------------------------------------------- | --------------------------------------------- |
| `src/components/marketing/MarketingNav.tsx`        | hex->var(), ThemeToggle                       |
| `src/components/marketing/MarketingFooter.tsx`     | hex->var()                                    |
| `src/components/marketing/ContentCTA.tsx`          | hex->var()                                    |
| `src/components/marketing/ContactForm.tsx`         | hex->var()                                    |
| `src/components/marketing/FAQAccordion.tsx`        | hex->var()                                    |
| `src/components/marketing/Breadcrumbs.tsx`         | hex->var()                                    |
| `src/components/marketing/MDXComponents.tsx`       | hex->var()                                    |
| `src/components/marketing/mdx/Callout.tsx`         | hex->var()                                    |
| `src/components/marketing/mdx/PricingCards.tsx`    | hex->var()                                    |
| `src/components/marketing/mdx/SecurityCards.tsx`   | hex->var()                                    |
| `src/components/marketing/mdx/Steps.tsx`           | hex->var()                                    |
| `src/components/marketing/mdx/ComparisonTable.tsx` | hex->var()                                    |
| `src/components/marketing/mdx/EmailLink.tsx`       | hex->var()                                    |
| `src/components/Logo.tsx`                          | hex->var()                                    |
| `src/components/company-form.tsx`                  | hex->var() in style constants, icon migration |
| `src/components/company-search.tsx`                | hex->var()                                    |
| `src/components/settings-actions.tsx`              | hex->var(), icon migration                    |
| `src/components/plan-picker.tsx`                   | hex->var(), icon migration                    |
| `src/components/subscription-banner.tsx`           | hex->var(), icon migration                    |
| `src/components/filing-status-badge.tsx`           | hex->var() in statusConfig                    |
| `src/components/CookieConsent.tsx`                 | dark: Tailwind variants                       |
| `src/components/edit-utr.tsx`                      | hex->var(), icon migration                    |
| `src/components/enable-corp-tax.tsx`               | hex->var(), icon migration                    |
| `src/components/check-status-button.tsx`           | hex->var(), icon migration                    |
| `src/components/sign-out-button.tsx`               | hex->var()                                    |
| `src/components/marketing/RelatedContent.tsx`      | hex->var()                                    |

No changes to API routes, lib files, or business logic.

## Verification

1. `npm run build` — no errors
2. Toggle between system/light/dark in the UI — all three states render correctly
3. Hard refresh in dark mode — no flash of light theme
4. Check every page visually in both themes: login, register, forgot-password, dashboard, onboarding, settings, choose-plan, filing flows, landing page, pricing, guides, FAQ, contact, error, 404
5. Check status badges, alerts, and banners have readable contrast in dark mode
6. Toggle OS preference while app is open with "system" selected — theme should update in real time
7. Check localStorage persistence — reload after manual toggle, preference should stick
8. **Contrast audit:** Verify WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text) on dark palette using browser DevTools or axe. Pay particular attention to `--color-text-muted` on `--color-bg-page` and `--color-text-secondary` on `--color-bg-card`.
9. Check that `<meta name="theme-color">` updates when toggling theme (inspect with DevTools)
10. Verify Lucide icons render correctly with `currentColor` — no missing or invisible icons
