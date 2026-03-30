# Email Templates Redesign

**Date:** 2026-03-30
**Status:** Design approved

## Goal

Centralise all email templates behind a shared branded shell, add dark mode support, include required legal footer content, host the logo as PNG, add 4 missing transactional emails, and implement a reminder mute system.

## Decisions

- **Shell approach:** Pure TypeScript string templates with a shared `emailShell()` wrapper (no new dependencies)
- **Visual style:** Clean & Minimal — white card on light grey background, blue accent divider under logo, rounded corners
- **Dark mode:** Light-first with `@media (prefers-color-scheme: dark)` CSS overrides. Colours chosen to degrade gracefully under Gmail/Outlook auto-inversion.
- **Logo:** Hosted PNG at `https://dormantfile.co.uk/logo.png` (already in `public/logo.png`). Referenced via `<img>` with explicit dimensions and `alt` text.
- **Footer:** Help | Privacy | Terms links, copyright with domain name, address placeholder (lighter colour), mute link on reminder emails only
- **Unsubscribe:** Reminder emails only. Global `remindersMuted` toggle on User model, mute link in email footer, `List-Unsubscribe` header, toggle on settings page.

## 1. Shared Email Shell

A single `emailShell()` function wraps all 10 email templates.

### Function signature

```typescript
function emailShell(options: {
  content: string;
  preheader?: string;
  includeUnsubscribe?: boolean;
  unsubscribeUrl?: string;
}): string
```

### Structure

- `<!DOCTYPE html>` with `<html lang="en">`
- Hidden preheader text (preview text in inbox list)
- `<head>` containing `<style>` block with dark mode `@media (prefers-color-scheme: dark)` rules
- Outer `<body>`: background `#f8f9fa` (light) / `#111827` (dark)
- Centred container: `max-width: 600px`
- Card: white `#ffffff` background (light) / `#1f2937` (dark), `border-radius: 8px`, subtle `box-shadow`
- **Header**: PNG logo left-aligned, `2px solid #2563eb` divider below (dark: `#3b82f6`)
- **Content area**: `28px` vertical / `32px` horizontal padding — passed in by each template
- **Footer**: `#f9fafb` background (light) / `#111827` (dark), `1px solid #e5e7eb` top border (dark: `#374151`)

### Dark mode colour map

| Element | Light | Dark |
|---------|-------|------|
| Body background | `#f8f9fa` | `#111827` |
| Card background | `#ffffff` | `#1f2937` |
| Heading text | `#1a1a1a` | `#f1f5f9` |
| Body text | `#4b5563` | `#94a3b8` |
| Secondary text | `#9ca3af` | `#6b7280` |
| Primary blue | `#2563eb` | `#3b82f6` |
| Blue links | `#2563eb` | `#60a5fa` |
| Overdue red | `#dc2626` | `#f87171` |
| Divider | `#e5e7eb` | `#374151` |
| Footer background | `#f9fafb` | `#111827` |
| Button background | `#2563eb` | `#3b82f6` |
| Button text | `#ffffff` | `#ffffff` |

### Footer content

All emails:
```
Help · Privacy · Terms
© {year} dormantfile.co.uk
{address placeholder}
```

Reminder emails additionally:
```
Mute reminder emails
```

Footer links point to:
- Help: `{baseUrl}/answers`
- Privacy: `{baseUrl}/privacy`
- Terms: `{baseUrl}/terms`
- Mute: `{baseUrl}/api/account/mute-reminders?token={jwt}`

`baseUrl` is derived from `NEXT_PUBLIC_APP_URL` environment variable (matching the existing convention used by registration, forgot-password, and profile update emails), with `NEXTAUTH_URL` as fallback.

### Logo

- Source: `public/logo.png` (already added)
- Referenced as `{baseUrl}/logo.png`
- `<img>` tag: explicit `width` and `height` attributes, `alt="DormantFile"`, `style="display:block"` to prevent Outlook gaps
- Display size: scaled to fit header (approximately 140px wide), 2x resolution for retina

### Gmail/Outlook inversion resilience

- No pure `#ffffff` or `#000000` used in dark mode palette — prevents harsh inversion artefacts
- Button uses `#3b82f6` background (mid-blue) that remains readable when inverted
- Logo PNG on white/transparent background — acceptable under inversion since the header area has clear contrast
- Inline styles on every element as fallback when `<style>` block is stripped (Gmail mobile)

## 2. Email Inventory

### Existing (refactored to use shell)

| # | Function | Subject | Trigger | Unsubscribe |
|---|----------|---------|---------|-------------|
| 1 | `buildVerificationEmail` | Verify your email address | Registration | No |
| 2 | `buildPasswordResetEmail` | Reset your DormantFile password | Forgot password | No |
| 3 | `buildEmailChangeEmail` | Confirm your new email address | Profile update → new email | No |
| 4 | `buildEmailChangeNotificationEmail` | Email change requested on your DormantFile account | Profile update → old email | No |
| 5 | `buildFilingConfirmationEmail` | {filingLabel} filed successfully: {companyName} | Accounts/CT600 accepted | No |
| 6 | `buildReminderEmail` | Action required / Filing reminder | Daily cron (08:00) | **Yes** |

### New

| # | Function | Subject | Trigger | Unsubscribe |
|---|----------|---------|---------|-------------|
| 7 | `buildWelcomeEmail` | Welcome to DormantFile | After email verification succeeds | No |
| 8 | `buildPaymentFailedEmail` | Payment failed — action required | Stripe `invoice.payment_failed` webhook | No |
| 9 | `buildSubscriptionCancelledEmail` | Your DormantFile subscription has ended | Stripe `customer.subscription.deleted` webhook | No |
| 10 | `buildAccountDeletedEmail` | Your DormantFile account has been deleted | After account delete completes | No |

### New email content

**Welcome (7):**
- Greeting with user's name
- "Your account is verified and ready to use."
- Brief value statement: file dormant company returns quickly and affordably
- CTA button: "Add Your First Company" → `{baseUrl}/dashboard`
- Secondary note: "Need help? Check our answers" with link to `/answers` (consistent with footer Help link)

**Payment failed (8):**
- "We couldn't process your latest payment."
- Mention the consequence: filing access will be paused if not resolved
- CTA button: "Update Payment Method" → `{baseUrl}/settings` (user clicks through to billing portal from settings, since portal session cannot be pre-generated in webhook context without an authenticated session)
- Note: "If your payment details are up to date, your bank may have declined the charge. Please try again or use a different card."

**Subscription cancelled (9):**
- "Your subscription has ended."
- What's preserved: filing history, company records
- What's lost: ability to submit new filings, deadline reminders paused
- CTA button: "Resubscribe" → `{baseUrl}/choose-plan`
- Tone: neutral, not guilt-tripping

**Account deleted (10):**
- "Your account and associated data have been permanently deleted."
- Confirm what was removed
- No CTA needed — just confirmation
- "If you didn't request this, contact us immediately" with contact link

## 3. Reminder Mute System

### Database

Add to `User` model in `prisma/schema.prisma`:

```prisma
remindersMuted Boolean @default(false)
```

Run migration: `npx prisma migrate dev --name add-reminders-muted`

### Mute link in emails

- Reminder emails include an HMAC-signed mute URL (no JWT library needed)
- Token is an HMAC-SHA256 of `userId:mute-reminders:expiry` signed with `NEXTAUTH_SECRET`
- URL format: `{baseUrl}/api/account/mute-reminders?uid={userId}&exp={timestamp}&sig={hmac}`
- Expiry: 7 days
- Uses Node's built-in `crypto` module — no new dependencies

### New route: `/api/account/mute-reminders`

Exports both `GET` and `POST` handlers (GET for email link clicks, POST for `List-Unsubscribe-Post` one-click):

- Accepts `uid`, `exp`, and `sig` query parameters
- Recomputes HMAC and compares to `sig`; rejects if mismatch or expired
- Sets `remindersMuted = true` on the user
- GET: redirects to `{baseUrl}/settings?reminders=muted`
- POST: returns 200 OK (for RFC 8058 one-click unsubscribe)

Note: GET performing a mutation is unconventional but standard practice for email unsubscribe links. Link prefetchers could trigger it — acceptable trade-off since the action is low-risk and reversible.

### Email headers

Reminder emails include via Resend's `headers` option:

```
List-Unsubscribe: <{mute-url}>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

This surfaces native unsubscribe buttons in Gmail and Apple Mail.

### Cron change

In `/api/cron/reminders`, add `remindersMuted: false` to the user query filter.

### Settings page

Add a "Notifications" section to the settings page:
- Toggle: "Reminder emails" — on/off
- Description: "Receive email reminders when filing deadlines are approaching"
- Hits `PATCH /api/account/update-profile` with `{ remindersMuted: boolean }`
- Default: on (muted = false)

### Re-enabling

Users turn reminders back on from the settings page at any time. The mute link is one-way (mute only); re-enabling requires logging in.

## 4. `sendEmail` changes

Update `sendEmail()` in `src/lib/email/client.ts` to accept an optional `headers` parameter:

```typescript
async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
  headers,
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}): Promise<void>
```

Pass `headers` through to the Resend `emails.send()` call.

## 5. Integration points

| File | Change |
|------|--------|
| `src/lib/email/templates.ts` | Add `emailShell()`, refactor 6 existing templates, add 4 new `build*Email()` functions |
| `src/lib/email/client.ts` | Add `headers` param to `sendEmail()` |
| `src/app/api/stripe/webhook/route.ts` | Refactor relevant `updateMany` calls to `findFirst` + `update` to retrieve user email. Send payment failed email on `invoice.payment_failed`. Send cancelled email on `customer.subscription.deleted` — but skip if user has been deleted (check user exists before sending). |
| `src/app/api/auth/verify-email/route.ts` | Send welcome email after successful verification |
| `src/app/api/account/delete/route.ts` | Send deletion confirmation email **before** deleting user data (accept edge case where email sends but deletion fails). Capture user email before the delete transaction. |
| `src/app/api/account/mute-reminders/route.ts` | **New route** — handles mute link clicks |
| `src/app/api/account/update-profile/route.ts` | Accept `remindersMuted` field in PATCH body. Relax validation so `name`/`email` are not required when only updating `remindersMuted`. |
| `src/app/api/cron/reminders/route.ts` | Filter out users with `remindersMuted: true`, pass `unsubscribeUrl` to template |
| `src/app/(app)/settings/page.tsx` | Add notifications section with reminder toggle |
| `prisma/schema.prisma` | Add `remindersMuted Boolean @default(false)` to User model |
| `src/__tests__/lib/email/templates.test.ts` | Tests for: shell wrapping, dark mode CSS presence, preheader, footer content, unsubscribe link inclusion, all 4 new templates |

## 6. Testing

- **Shell tests**: verify HTML structure (logo img, dark mode style block, footer links, copyright year, address placeholder)
- **Unsubscribe tests**: verify `List-Unsubscribe` header content, mute link presence only on reminder emails, absence on other emails
- **New template tests**: verify subject lines, key content, CTA links for all 4 new templates
- **Existing template tests**: verify they still produce correct output after shell refactor (snapshot tests may need updating). Add missing `buildPasswordResetEmail` test coverage.
- **Mute route tests**: verify HMAC validation, expiry enforcement, user update, redirect (GET) and 200 (POST) behaviour

## Non-goals

- React Email or any templating framework migration
- Email preview server
- Per-company mute (global user-level only)
- Marketing/newsletter emails
- Inline CSS tool (manual inline styles are sufficient for 10 templates)
