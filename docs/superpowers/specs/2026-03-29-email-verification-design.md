# Email Verification Design

## Overview

Add email verification to DormantFile for two triggers: new user registration and email address changes in settings. Unverified users are hard-gated from the app until they confirm. Existing users are grandfathered in as verified.

## Decisions

| Decision                   | Choice                                  | Rationale                                                                       |
| -------------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| Unverified user experience | Hard gate — redirect to `/verify-email` | Tax filing product; bad email means missed confirmations and deadline reminders |
| Email change strategy      | Verify new email before switching       | Prevents typo lockouts where user can't receive the verification link           |
| Existing users             | Grandfathered as verified               | Disruptive to force verification on paying users whose emails already work      |

## Data Model

### User changes

Add one field:

```prisma
emailVerified DateTime?
```

- `null` = unverified
- Timestamp = when verified
- Migration backfills existing users with `emailVerified = createdAt`

### New model: EmailVerificationToken

```prisma
model EmailVerificationToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id])

  @@index([userId])
}
```

- `token` stores SHA256 hash of the raw token (same pattern as `PasswordResetToken`)
- 24-hour expiry
- When resending, old unused tokens for the same user are deleted first

### New model: PendingEmailChange

```prisma
model PendingEmailChange {
  id        String    @id @default(cuid())
  userId    String    @unique
  newEmail  String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id])
}
```

- `token` stores SHA256 hash of the raw token (same pattern as `PasswordResetToken`)
- `userId` is unique — at most one pending change per user, enforced at DB level
- 24-hour expiry
- Requesting a new change deletes any existing pending change for that user (upsert pattern)
- On confirmation: update `User.email`, set `User.emailVerified = now()`
- Re-check email uniqueness at confirmation time (not just at request time)

## Registration Flow

1. User submits the registration form (no form changes)
2. `/api/auth/register` creates the user with `emailVerified: null`
3. Same endpoint generates an `EmailVerificationToken` and sends the verification email via Resend
4. If the email send fails, the user is still created — they can use the resend button on the verify page
5. NextAuth signs them in — JWT includes `emailVerified: null`
6. Hard gate in `(app)` layout catches unverified state, redirects to `/verify-email`

## Email Change Flow

1. User edits email in settings, clicks save
2. `PATCH /api/account/update-profile` updates name immediately; for email changes, creates a `PendingEmailChange` record instead of updating `User.email`
3. Sends verification email to the **new** address
4. Sends notification email to the **old** address: "Someone requested to change the email on your DormantFile account. If this wasn't you, please secure your account."
5. UI shows: "Verification email sent to {newEmail}" — old email stays active
6. User clicks link: `/verify-email-change?token={rawToken}`
7. `/verify-email-change` page reads token from URL, calls `POST /api/account/verify-email-change`, which confirms token, swaps email, sets `emailVerified = now()`
8. Redirects to `/settings`

## Verify Email Page

**Route:** `src/app/(verify)/verify-email/page.tsx`

Lives in a `(verify)` route group — not `(auth)` (which redirects authenticated users to dashboard) and not `(app)` (which would hard-gate back to itself). Has its own minimal layout.

Two modes on the same page:

1. **Waiting mode** (no token in URL): "Check your inbox" message showing the user's email, resend button (rate limited 1/60s), "Wrong email?" link that signs out
2. **Confirmation mode** (token in URL): calls verify API, on success triggers `useSession().update()` to refresh the JWT, then redirects to `/dashboard` (the existing dashboard/onboarding routing handles whether they need onboarding)

## Verify Email Change Page

**Route:** `src/app/(verify)/verify-email-change/page.tsx`

Same `(verify)` route group. Reads token from URL, calls the verify-email-change API, redirects to `/settings` on success. Shows error state if token is invalid/expired.

## Session

### Session changes

- `authorize` callback: return `emailVerified` from the DB query alongside `id`, `email`, `name` — the JWT callback only sees what `authorize` returns
- JWT callback: include `emailVerified` from user object on sign-in. Add a `trigger === "update"` branch that re-reads `emailVerified` from the database, so `useSession().update()` can refresh the value after verification without requiring a sign-out/sign-in
- Session callback: expose `emailVerified` to client
- Type augmentation: add `emailVerified` to `declare module "next-auth/jwt"` JWT type and `next-auth` Session type

### Hard gate

Implemented in `src/app/(app)/layout.tsx` (consistent with the existing auth check that redirects to `/login`):

- After the existing session check, if `emailVerified` is null, redirect to `/verify-email`
- This naturally exempts all non-`(app)` routes (auth pages, API routes, verify pages, marketing)

### After verification

- Client calls `useSession().update()` to refresh the JWT with the new `emailVerified` value
- Redirect to `/dashboard` (registration) or `/settings` (email change)

## Email Templates

Three new templates in `src/lib/email/templates.ts`:

### `buildVerificationEmail({ verifyUrl })`

- Subject: "Verify your email address"
- Body: button linking to `verifyUrl`, mentions 24-hour expiry
- Sender: "DormantFile <noreply@dormantfile.co.uk>"

### `buildEmailChangeEmail({ verifyUrl, newEmail })`

- Subject: "Confirm your new email address"
- Body: "You requested to change your email to {newEmail}", button linking to `verifyUrl`, 24-hour expiry
- Sent to the **new** email address

### `buildEmailChangeNotificationEmail({ newEmail })`

- Subject: "Email change requested on your DormantFile account"
- Body: "A request was made to change your email to {newEmail}. If this wasn't you, please secure your account."
- Sent to the **old** email address

## API Routes

### New routes

| Route                              | Method | Purpose                                                                                                          |
| ---------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `/api/auth/verify-email`           | POST   | Takes `token`, validates, sets `emailVerified = now()`, marks token used                                         |
| `/api/auth/resend-verification`    | POST   | Requires session. Rate limited (1/60s per userId). Deletes old tokens for user, generates new token, sends email |
| `/api/account/verify-email-change` | POST   | Takes `token`, validates, re-checks email uniqueness, swaps `User.email`, sets `emailVerified = now()`           |

### Modified routes

| Route                               | Change                                                                                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/register`           | Also creates `EmailVerificationToken` and sends verification email                                                                          |
| `PATCH /api/account/update-profile` | Name updates immediately; email change creates `PendingEmailChange` + sends verification to new address + sends notification to old address |

## Rate Limits

| Endpoint                                | Limit            | Key                                               |
| --------------------------------------- | ---------------- | ------------------------------------------------- |
| `POST /api/auth/resend-verification`    | 1 per 60 seconds | `resend-verification:{userId}` (requires session) |
| `POST /api/auth/verify-email`           | 5 per 60 seconds | `verify-email:{ip}`                               |
| `POST /api/account/verify-email-change` | 5 per 60 seconds | `verify-email-change:{ip}`                        |

## Files to Create

- `prisma/migrations/XXXX_add_email_verification/migration.sql`
- `src/app/(verify)/layout.tsx` — minimal layout for verify pages
- `src/app/(verify)/verify-email/page.tsx`
- `src/app/(verify)/verify-email-change/page.tsx`
- `src/app/api/auth/verify-email/route.ts`
- `src/app/api/auth/resend-verification/route.ts`
- `src/app/api/account/verify-email-change/route.ts`

## Files to Modify

- `prisma/schema.prisma` — add `emailVerified` field on User, two new models, relations
- `src/lib/auth.ts` — add `emailVerified` to JWT callback (including `trigger === "update"` branch) and session callback
- `src/lib/email/templates.ts` — three new templates
- `src/app/api/auth/register/route.ts` — generate token + send verification email
- `src/app/api/account/update-profile/route.ts` — email change creates `PendingEmailChange` + sends emails
- `src/app/(app)/layout.tsx` — add `emailVerified` null check, redirect to `/verify-email`
- `src/components/profile-form.tsx` — show pending email change notice
