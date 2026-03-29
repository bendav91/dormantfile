# Email Verification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email verification to DormantFile for registration and email changes, with a hard gate blocking unverified users from the app.

**Architecture:** Token-based verification following the existing `PasswordResetToken` pattern (SHA256-hashed tokens, Resend emails, expiry). Hard gate in the `(app)` layout redirects unverified users to a `(verify)` route group. Email changes use a verify-before-swap model with `PendingEmailChange`.

**Tech Stack:** Next.js 16, NextAuth v4 (JWT), Prisma 7, PostgreSQL, Resend, Vitest

**Spec:** `docs/superpowers/specs/2026-03-29-email-verification-design.md`

---

### Task 1: Prisma Schema — Add emailVerified and token models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `emailVerified` field to User model**

After the `filingAsAgent` field:

```prisma
emailVerified      DateTime?
```

Add relations to User model:

```prisma
verificationTokens EmailVerificationToken[]
pendingEmailChange PendingEmailChange?
```

- [ ] **Step 2: Add EmailVerificationToken model**

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

- [ ] **Step 3: Add PendingEmailChange model**

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

- [ ] **Step 4: Create and run migration**

```bash
npx prisma migrate dev --name add_email_verification
```

The migration SQL must include a backfill for existing users:

```sql
UPDATE "User" SET "emailVerified" = "createdAt" WHERE "emailVerified" IS NULL;
```

If Prisma doesn't generate this automatically, edit the migration file to add it before running.

- [ ] **Step 5: Verify migration**

```bash
npx prisma generate
```

Check the generated client has the new models and fields.

- [ ] **Step 6: Commit**

```bash
git add prisma/
git commit -m "feat: add email verification schema and migration"
```

---

### Task 2: NextAuth — Add emailVerified to session

**Files:**
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add type augmentations**

At the top of the file, add module augmentations:

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    emailVerified?: Date | null;
  }
}
```

- [ ] **Step 2: Update the authorize callback**

In the CredentialsProvider `authorize` function, update the return to include `emailVerified`:

```typescript
return {
  id: user.id,
  email: user.email,
  name: user.name,
  emailVerified: user.emailVerified,
};
```

- [ ] **Step 3: Update the JWT callback**

Replace the existing JWT callback with:

```typescript
async jwt({ token, user, trigger }) {
  if (user) {
    token.id = user.id;
    token.emailVerified = (user as { emailVerified?: Date | null }).emailVerified ?? null;
  }
  if (trigger === "update") {
    const dbUser = await prisma.user.findUnique({
      where: { id: token.id as string },
      select: { emailVerified: true },
    });
    if (dbUser) {
      token.emailVerified = dbUser.emailVerified;
    }
  }
  return token;
},
```

Add the prisma import at the top if not already present:

```typescript
import { prisma } from "@/lib/db";
```

- [ ] **Step 4: Update the session callback**

Add `emailVerified` to the session:

```typescript
async session({ session, token }) {
  if (token.id) {
    session.user.id = token.id as string;
  }
  session.user.emailVerified = token.emailVerified as Date | null;
  return session;
},
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts
git commit -m "feat: add emailVerified to NextAuth session and JWT"
```

---

### Task 3: Email templates

**Files:**
- Modify: `src/lib/email/templates.ts`
- Test: `src/__tests__/lib/email/templates.test.ts`

- [ ] **Step 1: Write tests for the three new templates**

Add to existing test file (or create if it doesn't exist):

```typescript
import { buildVerificationEmail, buildEmailChangeEmail, buildEmailChangeNotificationEmail } from "@/lib/email/templates";

describe("buildVerificationEmail", () => {
  it("returns correct subject and includes verify URL in html", () => {
    const result = buildVerificationEmail({ verifyUrl: "https://example.com/verify?token=abc" });
    expect(result.subject).toBe("Verify your email address");
    expect(result.html).toContain("https://example.com/verify?token=abc");
    expect(result.html).toContain("24 hours");
  });
});

describe("buildEmailChangeEmail", () => {
  it("returns correct subject and includes new email and verify URL", () => {
    const result = buildEmailChangeEmail({
      verifyUrl: "https://example.com/verify-change?token=abc",
      newEmail: "new@example.com",
    });
    expect(result.subject).toBe("Confirm your new email address");
    expect(result.html).toContain("new@example.com");
    expect(result.html).toContain("https://example.com/verify-change?token=abc");
  });
});

describe("buildEmailChangeNotificationEmail", () => {
  it("returns correct subject and includes new email", () => {
    const result = buildEmailChangeNotificationEmail({ newEmail: "new@example.com" });
    expect(result.subject).toBe("Email change requested on your DormantFile account");
    expect(result.html).toContain("new@example.com");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- src/__tests__/lib/email/templates.test.ts
```

Expected: FAIL — functions not exported.

- [ ] **Step 3: Implement the three templates**

Add to `src/lib/email/templates.ts`, following the existing pattern (each returns `{ subject, html }`):

**`buildVerificationEmail`:** Subject "Verify your email address", body has a CTA button to `verifyUrl`, mentions 24-hour expiry. Match the existing email styling (inline CSS, `#f8f9fa` background, `#0066cc` button).

**`buildEmailChangeEmail`:** Subject "Confirm your new email address", body mentions `newEmail`, CTA button to `verifyUrl`, 24-hour expiry.

**`buildEmailChangeNotificationEmail`:** Subject "Email change requested on your DormantFile account", body says a request was made to change to `newEmail`, advises securing account if not them. No CTA button — informational only.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/__tests__/lib/email/templates.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/templates.ts src/__tests__/lib/email/templates.test.ts
git commit -m "feat: add email verification templates"
```

---

### Task 4: POST /api/auth/verify-email

**Files:**
- Create: `src/app/api/auth/verify-email/route.ts`

- [ ] **Step 1: Implement the route**

```typescript
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`verify-email:${ip}`, 5, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
  }

  const body = await req.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/verify-email/route.ts
git commit -m "feat: add POST /api/auth/verify-email endpoint"
```

---

### Task 5: POST /api/auth/resend-verification

**Files:**
- Create: `src/app/api/auth/resend-verification/route.ts`

- [ ] **Step 1: Implement the route**

```typescript
import { randomBytes, createHash } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { resend } from "@/lib/email/client";
import { buildVerificationEmail } from "@/lib/email/templates";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit(`resend-verification:${session.user.id}`, 1, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Please wait before requesting another email." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });

  if (!user || user.emailVerified) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  // Delete old tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId: session.user.id, usedAt: null },
  });

  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");

  await prisma.emailVerificationToken.create({
    data: {
      userId: session.user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/verify-email?token=${rawToken}`;
  const { subject, html } = buildVerificationEmail({ verifyUrl });

  try {
    await resend.emails.send({
      from: "DormantFile <noreply@dormantfile.co.uk>",
      to: user.email,
      subject,
      html,
    });
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/resend-verification/route.ts
git commit -m "feat: add POST /api/auth/resend-verification endpoint"
```

---

### Task 6: POST /api/account/verify-email-change

**Files:**
- Create: `src/app/api/account/verify-email-change/route.ts`

- [ ] **Step 1: Implement the route**

```typescript
import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`verify-email-change:${ip}`, 5, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
  }

  const body = await req.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const record = await prisma.pendingEmailChange.findUnique({
    where: { token: hashedToken },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  // Re-check email uniqueness at confirmation time
  const existing = await prisma.user.findUnique({
    where: { email: record.newEmail.trim().toLowerCase() },
  });
  if (existing && existing.id !== record.userId) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        email: record.newEmail.trim().toLowerCase(),
        emailVerified: new Date(),
      },
    }),
    prisma.pendingEmailChange.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/account/verify-email-change/route.ts
git commit -m "feat: add POST /api/account/verify-email-change endpoint"
```

---

### Task 7: Update registration to send verification email

**Files:**
- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Add imports**

Add at the top:

```typescript
import { randomBytes, createHash } from "crypto";
import { resend } from "@/lib/email/client";
import { buildVerificationEmail } from "@/lib/email/templates";
```

- [ ] **Step 2: After user creation, generate token and send email**

After the `prisma.user.create()` call and before the `return NextResponse.json()`, add:

```typescript
// Send verification email (failure doesn't block registration)
try {
  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/verify-email?token=${rawToken}`;
  const { subject, html } = buildVerificationEmail({ verifyUrl });

  await resend.emails.send({
    from: "DormantFile <noreply@dormantfile.co.uk>",
    to: trimmedEmail,
    subject,
    html,
  });
} catch (err) {
  console.error("Failed to send verification email:", err);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat: send verification email on registration"
```

---

### Task 8: Update profile endpoint for email change flow

**Files:**
- Modify: `src/app/api/account/update-profile/route.ts`

- [ ] **Step 1: Add imports**

```typescript
import { randomBytes, createHash } from "crypto";
import { resend } from "@/lib/email/client";
import { buildEmailChangeEmail, buildEmailChangeNotificationEmail } from "@/lib/email/templates";
```

- [ ] **Step 2: Replace the direct email update with pending change logic**

Replace the current email update logic. Name should still update immediately. For email:

```typescript
const trimmedEmail = email.trim().toLowerCase();
const trimmedName = name.trim();

// Name always updates immediately
await prisma.user.update({
  where: { id: session.user.id },
  data: { name: trimmedName },
});

// Email change: verify-before-swap
if (trimmedEmail !== session.user.email) {
  // Check email isn't taken
  const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  // Delete any existing pending change, create new one
  await prisma.pendingEmailChange.deleteMany({ where: { userId: session.user.id } });

  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");

  await prisma.pendingEmailChange.create({
    data: {
      userId: session.user.id,
      newEmail: trimmedEmail,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/verify-email-change?token=${rawToken}`;

  // Send verification to new address, notification to old address
  try {
    const changeEmail = buildEmailChangeEmail({ verifyUrl, newEmail: trimmedEmail });
    const notifyEmail = buildEmailChangeNotificationEmail({ newEmail: trimmedEmail });

    await Promise.all([
      resend.emails.send({
        from: "DormantFile <noreply@dormantfile.co.uk>",
        to: trimmedEmail,
        subject: changeEmail.subject,
        html: changeEmail.html,
      }),
      resend.emails.send({
        from: "DormantFile <noreply@dormantfile.co.uk>",
        to: session.user.email!,
        subject: notifyEmail.subject,
        html: notifyEmail.html,
      }),
    ]);
  } catch (err) {
    console.error("Failed to send email change emails:", err);
  }

  return NextResponse.json({ success: true, pendingEmail: trimmedEmail });
}

return NextResponse.json({ success: true });
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/account/update-profile/route.ts
git commit -m "feat: email changes create pending verification instead of updating directly"
```

---

### Task 9: Hard gate in (app) layout

**Files:**
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Add emailVerified check after existing session check**

After the existing `if (!session?.user) { redirect("/login"); }` block, add:

```typescript
if (!session.user.emailVerified) {
  redirect("/verify-email");
}
```

This is all that's needed — the `(verify)` route group is outside `(app)`, so it won't loop.

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "feat: hard gate unverified users to /verify-email"
```

---

### Task 10: Verify route group and pages

**Files:**
- Create: `src/app/(verify)/layout.tsx`
- Create: `src/app/(verify)/verify-email/page.tsx`
- Create: `src/app/(verify)/verify-email-change/page.tsx`

- [ ] **Step 1: Create the (verify) layout**

Minimal layout — same styling approach as the `(auth)` layout but without the authenticated-user redirect. Centered card on page, consistent with auth pages.

Match the `(auth)` layout styling (Tailwind classes) but without the session check/redirect:

```typescript
export default function VerifyLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="main-content" className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 px-4 py-12">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 shadow-md rounded-xl p-8">
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create the verify-email page**

Client component (`"use client"`) with two modes:

**Waiting mode** (no `token` search param):
- Get session via `useSession()`
- Show "Check your inbox" heading
- Display the user's email from session
- "Resend" button that calls `POST /api/auth/resend-verification`
  - Loading state while sending
  - Disable for 60 seconds after click (local cooldown matching rate limit)
  - Show "Email sent!" confirmation
- "Wrong email? Sign out" link that calls `signOut()`

**Confirmation mode** (`token` search param present):
- On mount (`useEffect`), call `POST /api/auth/verify-email` with the token
- Show "Verifying..." loading state
- On success: call `update()` from `useSession()` to refresh JWT, then `router.push("/dashboard")`
- On error: show error message with "Try again" / "Resend" options

Use `useSearchParams()` to detect the token.

Style consistently with auth pages — card with heading, description, form elements.

- [ ] **Step 3: Create the verify-email-change page**

Client component:

- On mount, read `token` from `useSearchParams()`
- If no token: show error "No verification token provided"
- If token: call `POST /api/account/verify-email-change` with the token
- Show "Confirming..." loading state
- On success: call `update()` from `useSession()`, then `router.push("/settings")`
- On error: show error message (invalid/expired token, email taken) with link to settings

- [ ] **Step 4: Commit**

```bash
git add src/app/(verify)/
git commit -m "feat: add verify-email and verify-email-change pages"
```

---

### Task 11: Update profile form for pending email state

**Files:**
- Modify: `src/components/profile-form.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Pass pending email data to ProfileForm**

In `src/app/(app)/settings/page.tsx`, query for any pending email change:

```typescript
const pendingChange = await prisma.pendingEmailChange.findUnique({
  where: { userId: session.user.id },
  select: { newEmail: true, expiresAt: true },
});
```

Pass to `ProfileForm`:

```typescript
<ProfileForm
  name={user.name}
  email={user.email}
  pendingEmail={pendingChange && pendingChange.expiresAt > new Date() ? pendingChange.newEmail : null}
/>
```

- [ ] **Step 2: Update ProfileForm to show pending state**

Add `pendingEmail` to props interface:

```typescript
interface ProfileFormProps {
  name: string;
  email: string;
  pendingEmail: string | null;
}
```

When `pendingEmail` is set, show below the email input:

```typescript
{pendingEmail && (
  <p style={{ fontSize: "13px", color: "var(--color-primary)", margin: "4px 0 0 0" }}>
    Verification email sent to {pendingEmail}. Check your inbox.
  </p>
)}
```

Also update `handleSave` to detect the `pendingEmail` field in the API response and set it locally without requiring a page refresh:

```typescript
const data = await res.json();
if (data.pendingEmail) {
  setPendingEmail(data.pendingEmail);
}
```

The email input still shows the current (old) email — the user can submit a new change which will replace the pending one.

- [ ] **Step 3: Commit**

```bash
git add src/components/profile-form.tsx src/app/(app)/settings/page.tsx
git commit -m "feat: show pending email change notice in profile form"
```

---

### Task 12: Manual integration testing

- [ ] **Step 1: Test registration flow**

1. Register a new user
2. Confirm you're redirected to `/verify-email` (not dashboard)
3. Check email received
4. Click verification link
5. Confirm redirect to `/dashboard`

- [ ] **Step 2: Test resend flow**

1. Register without clicking the link
2. On `/verify-email`, click resend
3. Confirm new email received
4. Confirm rate limit blocks rapid re-clicks

- [ ] **Step 3: Test email change flow**

1. Go to settings, change email
2. Confirm "Verification email sent" notice appears
3. Check new email for verification link
4. Check old email for notification
5. Click verification link
6. Confirm redirect to `/settings` with new email shown

- [ ] **Step 4: Test existing user is grandfathered**

1. Log in as a pre-existing user
2. Confirm they go straight to dashboard (not verify page)

- [ ] **Step 5: Test expired token**

1. Register, wait or manually expire the token in DB
2. Click the verification link
3. Confirm error message shown

- [ ] **Step 6: Run full test suite**

```bash
npm test
npm run build
```
