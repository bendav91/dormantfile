# Auth Pages Redesign: Split-Screen with Soft Brand Panel

## Overview

Redesign all four auth pages (login, register, forgot-password, reset-password) from the current centered-card layout to a split-screen design with a brand storytelling panel. The goal is a professional, premium feel that builds trust and communicates DormantFile's value proposition — without introducing new colours or dependencies.

## Design Direction

- **Vibe:** Professional trust + premium but approachable (think Stripe, Mercury)
- **Layout:** Split-screen — brand panel left, form panel right
- **Colour strategy:** Existing CSS custom properties only (`--color-*`), full dark/light mode support
- **No new dependencies:** No form libraries, no animation libraries. Tailwind + existing tokens.

## Layout: Shared Auth Shell

### Desktop (md and above)

Two equal-width columns, full viewport height:

- **Left — Brand panel:** Soft gradient using `--color-primary-bg` to `--color-primary-border`. Contains logo, headline, 3-step process, trust signals.
- **Right — Form panel:** `--color-bg-card` background. Contains the page-specific form, vertically centered.

### Mobile (below md, i.e. below 768px)

Single column, stacked:

- **Brand panel** collapses to a compact horizontal strip: just the "DormantFile" wordmark and one-line tagline ("Affordable dormant company filing"). No steps, no trust card.
- **Form panel** takes the remaining space with vertical padding. Not vertically centered (avoids floating on short screens).

### Accessibility

- The layout wraps both panels in `<main id="main-content">` to preserve the existing skip-navigation target.
- All form inputs retain `role`, `autoComplete`, and `spellCheck` attributes from the current implementation (e.g. `spellCheck={false}` on email inputs).

## Brand Panel Content

### Fixed elements (all pages)

- **Wordmark:** "DormantFile" in uppercase letter-spacing, coloured with `--color-primary`.
- **3-step process:**
  1. "Add your company" — "Instant lookup by company number"
  2. "We file for you" — "CT600 to HMRC + accounts to Companies House"
  3. "You're done" — "Confirmation from HMRC & Companies House"
  - Step numbers in `rounded-lg` white badges with subtle shadow, `--color-primary` text.
- **Trust signals card:** White (`--color-bg-card`) card with `--color-border` border, containing:
  - "Encrypted & secure"
  - "Files direct to HMRC & Companies House"
  - "From £19/year"

### Contextual headline variant

| Page | Headline | Subtitle |
|------|----------|----------|
| Register | "Three steps. Two filings. One less thing to worry about." | (none — the steps speak for themselves) |
| Login | "Welcome back." | "Your filings are waiting." |
| Forgot password | "Welcome back." | "Your filings are waiting." |
| Reset password | "Welcome back." | "Your filings are waiting." |

## Individual Page Designs

All pages share the split-screen shell. Below is the form panel content for each.

### Login

- **Heading:** "Sign in"
- **Subheading:** "Welcome back to DormantFile"
- **Fields:** Email, Password
- **Link:** "Forgot your password?" — right-aligned below password field (moved from below submit button to above it)
- **Button:** "Sign in"
- **Footer:** "Don't have an account? Create one" (links to /register)

### Register

- **Heading:** "Create your account"
- **Subheading:** "Get started in minutes"
- **Fields:** Full name, Email, Password (helper: "Must be at least 8 characters")
- **Button:** "Create account"
- **Footer:** "Already have an account? Sign in" (links to /login)
- **Small print:** Links to Terms, Privacy Policy, Acceptable Use Policy (above button, matching current placement — user sees terms before submitting)

### Forgot Password

- **Heading:** "Reset your password"
- **Subheading:** "We'll send you a reset link"
- **Fields:** Email
- **Button:** "Send reset link"
- **Footer:** "Remember your password? Sign in" (links to /login)
- **Success state:** Heading swaps to "Check your email" with confirmation message. Form hides. "Back to sign in" link shown.

### Reset Password

- **Heading:** "Set a new password"
- **Subheading:** "Choose a new password for your account"
- **Fields:** New password (helper: "Must include at least one letter and one number")
- **Button:** "Reset password"
- **Success state:** Heading swaps to "Password reset" with confirmation. "Sign in" button shown.
- **Invalid token state:** Heading "Invalid link" with message "This password reset link is invalid. Please request a new one." and "Request a new link" (links to /forgot-password). Covers both expired and missing tokens.

## Dark Mode

All colours are token-driven — no hardcoded values:

- **Brand panel gradient:** `--color-primary-bg` to `--color-primary-border` — automatically inverts in dark mode.
- **Form panel:** `--color-bg-card` background.
- **Step badges:** White background in light → `--color-bg-inset` in dark, `--color-primary` text in both.
- **Trust card:** `--color-bg-card` background, `--color-border` border.
- **Inputs, buttons, text, links:** All use existing token-based Tailwind classes, consistent with the rest of the app.

No new tokens or colours introduced.

## Component Architecture

### New components (`src/components/auth/`)

| Component | Type | Props | Purpose |
|-----------|------|-------|---------|
| `AuthLayout.tsx` | Server | `children` | Split-screen grid shell. Wraps form content. Does not contain brand panel — pages render that directly. |
| `BrandPanel.tsx` | Server | `variant: "register" \| "returning"` | Left panel: logo, headline, steps, trust signals. Handles mobile collapse. |
| `AuthInput.tsx` | Server | `label`, `type`, `placeholder`, `helperText`, `...React.InputHTMLAttributes<HTMLInputElement>` | Labelled input with consistent styling. Pure presentational — no client hooks needed. Rendered inside client page components. |
| `AuthButton.tsx` | Server | `children`, `loading`, `loadingText`, `disabled` | Primary submit button with loading/disabled state. `loadingText` displays during loading (e.g. "Signing in...", "Creating account..."). Pure presentational. |
| `AuthError.tsx` | Server | `message: string \| null` | Styled error alert box. Uses `--color-danger-bg`, `--color-danger-border`, `--color-danger-text` tokens with `role="alert"`. Consistent across all four pages. |

### Variant resolution

`(auth)/layout.tsx` cannot determine the current route as a Server Component. Instead, each page passes `variant` directly to `BrandPanel`:

- `register/page.tsx` renders `<BrandPanel variant="register" />` alongside its form.
- All other pages render `<BrandPanel variant="returning" />`.

`AuthLayout` does NOT receive a `variant` prop — it only provides the split-screen grid shell and wraps children. The brand panel is rendered by each page, not the layout.

### Modified files

| File | Changes |
|------|---------|
| `(auth)/layout.tsx` | Session check stays. All markup replaced with `<AuthLayout>`. No variant logic — just the shell. |
| `login/page.tsx` | Keeps state/logic. Renders `<BrandPanel variant="returning" />` + form using `AuthInput`, `AuthButton`, `AuthError`. Loading text: "Signing in..." |
| `register/page.tsx` | Same treatment. Renders `<BrandPanel variant="register" />`. Loading text: "Creating account..." |
| `forgot-password/page.tsx` | Same treatment. `variant="returning"`. Loading text: "Sending..." |
| `reset-password/page.tsx` | Same treatment. `variant="returning"`. Loading text: "Resetting...". Suspense boundary stays; loading fallback uses the split-screen shell with a spinner in the form panel. |

### Behaviour preserved

All existing functionality is unchanged:

- NextAuth `signIn("credentials")` flow
- API calls to `/api/auth/register`, `/api/auth/forgot-password`, `/api/auth/reset-password`
- Error handling and display
- Loading states on buttons
- Rate limiting handling (429)
- Token validation on reset-password
- Redirect to `/dashboard` for authenticated users
- Redirect to `/onboarding` after registration
- `autoComplete` attributes on inputs
- `spellCheck={false}` on email inputs
- `minLength` validation on password fields

### Migration note

The current auth pages use hardcoded Tailwind colour classes (`bg-gray-50`, `dark:bg-slate-900`, `text-blue-600`, etc.). All hardcoded colours must be replaced with CSS custom property equivalents (`--color-*` tokens) during implementation. No hardcoded colour classes should remain in the auth files after this work.
