# DormantFile Flow Hardening Spec

**Date:** 2026-03-27
**Scope:** Fix dead ends, missing validation, unhappy paths, and resilience gaps across signup, onboarding, payment, and filing flows.
**Approach:** Three batches — auth hardening, payment/subscription fixes, UX/resilience polish.

---

## Batch 1: Auth & Validation Hardening

### 1.1 Backend password validation

**Problem:** Only client-side `minLength=8`. Server accepts any string.

**Fix:** Add `validatePassword()` to `src/lib/utils.ts`. Rules: min 8 chars, at least one letter, at least one number. Call from `/api/auth/register` before hashing. Return 400 with specific message on failure.

**Files:** `src/lib/utils.ts`, `src/app/api/auth/register/route.ts`

### 1.2 Backend email format validation

**Problem:** No server-side email validation. User can register with `"x"` as email.

**Fix:** Add `validateEmail()` to `src/lib/utils.ts`. Basic regex check (contains `@` and `.` after `@`). Call from `/api/auth/register`. Return 400 on failure.

**Files:** `src/lib/utils.ts`, `src/app/api/auth/register/route.ts`

### 1.3 Password reset flow

**Problem:** No way to recover a forgotten password. User is permanently locked out.

**Design:**

**Schema change:** Add `PasswordResetToken` model:
```
model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())
  user      User     @relation(fields: [userId], references: [id])
}
```
Add `resetTokens PasswordResetToken[]` relation on User.

**New API routes:**
- `POST /api/auth/forgot-password` — accepts `{ email }`. Generates a crypto-random token, stores hashed version in DB with 1-hour expiry, sends reset link via Resend. Always returns 200 (don't reveal if email exists).
- `POST /api/auth/reset-password` — accepts `{ token, newPassword }`. Validates token exists, not expired, not used. Validates new password strength. Hashes and updates user password. Marks token as used.

**New pages:**
- `/forgot-password` — form with email input. Shows "If an account exists, we've sent a reset link" on submit.
- `/reset-password?token=xxx` — form with new password input. Shows success message with link to login on completion. Shows error if token expired/invalid.

**Login page update:** Add "Forgot your password?" link below the sign-in button.

**Email template:** Add `buildPasswordResetEmail()` to `src/lib/email/templates.ts`. Contains reset link with token, 1-hour expiry notice.

**Files:** `prisma/schema.prisma`, `src/lib/utils.ts`, `src/lib/email/templates.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`, `src/app/(auth)/forgot-password/page.tsx`, `src/app/(auth)/reset-password/page.tsx`, `src/app/(auth)/login/page.tsx`

### 1.4 Redirect authenticated users away from auth pages

**Problem:** Logged-in users can visit `/login` and `/register` and create duplicate accounts or re-sign-in.

**Fix:** In the `(auth)` layout, check for existing session. If session exists, redirect to `/dashboard`.

**Files:** `src/app/(auth)/layout.tsx`

### 1.5 Rate limiting on auth endpoints

**Problem:** No rate limiting. Login and registration can be brute-forced.

**Design:** Simple in-memory rate limiter (Map of IP → request timestamps). Limit: 5 attempts per minute per IP on `/api/auth/register`, `/api/auth/[...nextauth]`, `/api/auth/forgot-password`, and `/api/auth/reset-password`. Return 429 "Too many requests" when exceeded.

Create `src/lib/rate-limit.ts` with a `rateLimit(key: string, limit: number, windowMs: number)` function that returns `{ success: boolean, remaining: number }`.

**Files:** `src/lib/rate-limit.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/auth/forgot-password/route.ts`, `src/app/api/auth/reset-password/route.ts`

Note: NextAuth's credential provider route (`/api/auth/[...nextauth]`) is harder to rate-limit directly. We'll add rate limiting inside the `authorize` callback in `src/lib/auth.ts`.

---

## Batch 2: Payment & Subscription Flow Fixes

### 2.1 Abandoned checkout recovery

**Problem:** User registers, adds company, goes to Stripe checkout, cancels. They now have a company but `subscriptionStatus: "none"`. Dashboard shows company but they can't file. No clear path to complete payment.

**Fix:** The subscription banner already shows for `status: "none"` with a "Subscribe now" button that goes to `/choose-plan`. This path works. The issue is the banner text doesn't acknowledge the abandoned state.

Update subscription banner `none` state text: "You haven't completed your subscription yet. Choose a plan to start filing." Button: "Choose a plan".

Also: set Stripe checkout `cancel_url` to `/choose-plan` instead of `/dashboard`, so if they cancel checkout they land back on plan selection, not a confusing dashboard.

**Files:** `src/components/subscription-banner.tsx`, `src/app/api/stripe/create-checkout/route.ts`

### 2.2 Tier validation during filing

**Problem:** Filing API only checks `subscriptionStatus === "active"`. A Basic user with 2 companies (e.g., from before limits existed) can file for both.

**Fix:** In `/api/file/submit`, after checking subscription status, also verify the company belongs to a slot within the user's tier limit. Count user's companies, check `companyIndex < tierLimit`. If exceeded, return 403 "Your plan doesn't cover this company. Upgrade to file."

**Files:** `src/app/api/file/submit/route.ts`, `src/app/api/file/check-status/route.ts`

### 2.3 Duplicate company prevention

**Problem:** Same company (same registration number) can be added multiple times to the same account.

**Fix:** In `/api/company` POST handler, before creating, check if a company with the same `companyRegistrationNumber` already exists for this user. Return 409 "This company is already on your account."

Also add a compound unique constraint to the schema: `@@unique([userId, companyRegistrationNumber])`.

**Files:** `prisma/schema.prisma`, `src/app/api/company/route.ts`

### 2.4 Stuck "pending" filing recovery

**Problem:** If server crashes between creating a filing record (status: "pending") and submitting to HMRC (status: "submitted"), the filing is stuck forever. Idempotency check blocks retrying for that period.

**Fix:** Two changes:
1. In the idempotency check, exclude "pending" filings older than 5 minutes. A filing that's been "pending" for 5+ minutes clearly failed before reaching HMRC. Delete the stale record and allow retry.
2. In the filing creation, use a transaction: create the record and attempt submission atomically, so if submission fails the record is cleaned up.

Actually, approach 2 is complex with async polling. Simpler: just delete stale pending filings (older than 5 min) before the idempotency check.

**Files:** `src/app/api/file/submit/route.ts`

---

## Batch 3: UX & Resilience

### 3.1 Silent failure handling

**Problem:** Several user actions fail silently — Stripe portal creation, email sending, company lookup.

**Fixes:**
- **Stripe portal failure:** In `subscription-banner.tsx` and `settings-actions.tsx`, handle fetch errors and show an inline error message.
- **Email sending failure during filing:** Already non-blocking (correct). Add console.error for observability. No user-facing change needed.
- **Company lookup failure:** The `idle` state after a non-503/non-404 error is confusing. Change to show a subtle "Lookup failed — enter company name manually" message.

**Files:** `src/components/subscription-banner.tsx`, `src/components/settings-actions.tsx`, `src/components/company-form.tsx`

### 3.2 Clearer filing status messaging

**Problem:** Users don't understand the difference between "pending", "submitted", "polling_timeout". Error messages for duplicate filing attempts are confusing.

**Fixes:**
- Change idempotency error from generic to: "A filing for this period has already been submitted. Check your dashboard for the current status."
- In the filing flow result step, make the "polling_timeout" state clearer: "Your filing was sent to HMRC but they haven't confirmed yet. This is normal — HMRC can take up to 24 hours. We'll email you when it's confirmed. You can also check from your dashboard."
- On dashboard, for "polling_timeout" filings, show "Awaiting HMRC confirmation" instead of raw status.

**Files:** `src/app/api/file/submit/route.ts`, `src/app/(app)/file/[companyId]/filing-flow.tsx`, `src/components/filing-status-badge.tsx`

### 3.3 Accounting period date validation

**Problem:** No validation that the accounting period end date is sensible. User could enter a date 50 years ago or 10 years in the future.

**Fix:** In `/api/company` POST handler, validate that `accountingPeriodEnd` is:
- Not more than 2 years in the past
- Not in the future (must have already ended to file)

Return 400 with specific message if invalid.

Also add the same validation client-side in `company-form.tsx`.

**Files:** `src/app/api/company/route.ts`, `src/components/company-form.tsx`

### 3.4 Concurrent registration race condition

**Problem:** Two simultaneous registrations with the same email — both pass the "not exists" check, second one hits the DB unique constraint and returns a generic 500 instead of "already exists".

**Fix:** Catch Prisma's unique constraint violation error (P2002) in the register route and return 409 "Email already in use" instead of 500.

**Files:** `src/app/api/auth/register/route.ts`

---

## Files Changed Summary

### New files
- `src/lib/rate-limit.ts`
- `src/app/api/auth/forgot-password/route.ts`
- `src/app/api/auth/reset-password/route.ts`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/(auth)/reset-password/page.tsx`
- `src/lib/email/templates.ts` (add `buildPasswordResetEmail`)
- `prisma/migrations/xxx_add_password_reset_tokens/migration.sql`

### Modified files
- `prisma/schema.prisma` — PasswordResetToken model, company unique constraint
- `src/lib/utils.ts` — validatePassword, validateEmail
- `src/lib/auth.ts` — rate limiting in authorize callback
- `src/app/api/auth/register/route.ts` — validation, P2002 handling, rate limiting
- `src/app/(auth)/layout.tsx` — redirect authenticated users
- `src/app/(auth)/login/page.tsx` — forgot password link
- `src/components/subscription-banner.tsx` — better messaging, error handling
- `src/app/api/stripe/create-checkout/route.ts` — cancel_url change
- `src/app/api/file/submit/route.ts` — tier validation, stale pending cleanup, clearer errors
- `src/app/api/file/check-status/route.ts` — tier validation
- `src/app/api/company/route.ts` — duplicate check, date validation
- `src/components/company-form.tsx` — date validation, lookup error state
- `src/components/settings-actions.tsx` — portal error handling
- `src/components/filing-status-badge.tsx` — clearer labels
- `src/app/(app)/file/[companyId]/filing-flow.tsx` — clearer timeout messaging

---

## Out of scope

- **Full CSRF protection** — NextAuth provides baseline protection via CSRF tokens on forms.
- **Gateway credential encryption at rest** — credentials are never stored, only used in-flight. TLS covers transit. No change needed.
- **Admin dashboard** — separate feature, not a flow fix.
- **Multi-factor authentication** — nice to have for future, not required for launch.
