# Flow Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix dead ends, missing validation, unhappy paths, and resilience gaps across signup, onboarding, payment, and filing flows.

**Architecture:** Three batches applied sequentially. Batch 1 hardens auth (validation, password reset, rate limiting). Batch 2 fixes payment/subscription flow gaps (abandoned checkout, tier enforcement, duplicate prevention, stuck filing recovery). Batch 3 polishes UX and resilience (silent failures, clearer messaging, date validation, race conditions).

**Tech Stack:** Next.js 16, Prisma 7, NextAuth, Stripe, Resend, Vitest, bcryptjs

**Spec:** `docs/superpowers/specs/2026-03-27-flow-hardening-design.md`

---

## Task 1: Add validatePassword and validateEmail to utils

**Files:**

- Modify: `src/lib/utils.ts`
- Modify: `src/__tests__/lib/utils.test.ts`

- [ ] **Step 1: Write failing tests for validatePassword**

Add to `src/__tests__/lib/utils.test.ts`:

```typescript
describe("validatePassword", () => {
  it("accepts a valid password with letters and numbers", () => {
    expect(validatePassword("hello123")).toBe(true);
  });

  it("rejects a password shorter than 8 characters", () => {
    expect(validatePassword("abc123")).toBe(false);
  });

  it("rejects a password with only letters", () => {
    expect(validatePassword("abcdefgh")).toBe(false);
  });

  it("rejects a password with only numbers", () => {
    expect(validatePassword("12345678")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validatePassword("")).toBe(false);
  });
});
```

Import `validatePassword` at the top alongside existing imports.

- [ ] **Step 2: Write failing tests for validateEmail**

Add to `src/__tests__/lib/utils.test.ts`:

```typescript
describe("validateEmail", () => {
  it("accepts a valid email", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("rejects a string without @", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("rejects a string without domain", () => {
    expect(validateEmail("user@")).toBe(false);
  });

  it("rejects a string without dot after @", () => {
    expect(validateEmail("user@example")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(validateEmail("")).toBe(false);
  });
});
```

Import `validateEmail` at the top.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/utils.test.ts`
Expected: FAIL — `validatePassword` and `validateEmail` not exported.

- [ ] **Step 4: Implement validatePassword and validateEmail**

Add to `src/lib/utils.ts`:

```typescript
export function validatePassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/utils.test.ts`
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils.ts src/__tests__/lib/utils.test.ts
git commit -m "feat: add validatePassword and validateEmail utilities"
```

---

## Task 2: Harden registration API

**Files:**

- Modify: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: Add validation and P2002 handling**

Replace the contents of `src/app/api/auth/register/route.ts`:

```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { validateEmail, validatePassword } from "@/lib/utils";
import { Prisma } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 },
      );
    }

    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    if (!validateEmail(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters with at least one letter and one number" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        name: name.trim(),
      },
    });

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Run full test suite to verify nothing broke**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/auth/register/route.ts
git commit -m "feat: add backend validation and race condition handling to registration"
```

---

## Task 3: Redirect authenticated users from auth pages

**Files:**

- Modify: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Add session check to auth layout**

Replace `src/app/(auth)/layout.tsx`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md bg-white shadow-md rounded-xl p-8">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/layout.tsx
git commit -m "feat: redirect authenticated users away from login/register pages"
```

---

## Task 4: Add rate limiting utility

**Files:**

- Create: `src/lib/rate-limit.ts`
- Create: `src/__tests__/lib/rate-limit.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/__tests__/lib/rate-limit.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimits();
});

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const result = rateLimit("test-ip", 3, 60000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests over the limit", () => {
    rateLimit("test-ip", 2, 60000);
    rateLimit("test-ip", 2, 60000);
    const result = rateLimit("test-ip", 2, 60000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    rateLimit("ip-1", 1, 60000);
    const result = rateLimit("ip-2", 1, 60000);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/rate-limit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement rate limiter**

Create `src/lib/rate-limit.ts`:

```typescript
const requests = new Map<string, number[]>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { success: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = requests.get(key) ?? [];

  // Remove expired timestamps
  const valid = timestamps.filter((t) => now - t < windowMs);

  if (valid.length >= limit) {
    requests.set(key, valid);
    return { success: false, remaining: 0 };
  }

  valid.push(now);
  requests.set(key, valid);

  return { success: true, remaining: limit - valid.length };
}

export function resetRateLimits(): void {
  requests.clear();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/rate-limit.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/rate-limit.ts src/__tests__/lib/rate-limit.test.ts
git commit -m "feat: add in-memory rate limiting utility"
```

---

## Task 5: Apply rate limiting to registration and auth

**Files:**

- Modify: `src/app/api/auth/register/route.ts`
- Modify: `src/lib/auth.ts`

- [ ] **Step 1: Add rate limiting to register route**

At the top of the POST handler in `src/app/api/auth/register/route.ts`, after parsing the body, add:

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

And at the start of the POST function, before parsing body:

```typescript
const ip = request.headers.get("x-forwarded-for") ?? "unknown";
const { success } = rateLimit(ip, 5, 60000);
if (!success) {
  return NextResponse.json(
    { error: "Too many requests. Please try again in a minute." },
    { status: 429 },
  );
}
```

- [ ] **Step 2: Add rate limiting to NextAuth authorize callback**

In `src/lib/auth.ts`, import rate limiter and add check at start of `authorize`:

```typescript
import { rateLimit } from "@/lib/rate-limit";
```

Inside the `authorize` function, before the credential checks:

```typescript
async authorize(credentials, req) {
  const ip = req?.headers?.["x-forwarded-for"] ?? "unknown";
  const { success } = rateLimit(`login:${ip}`, 5, 60000);
  if (!success) return null;

  // ... existing code
}
```

- [ ] **Step 3: Build and test**

Run: `npx next build 2>&1 | tail -5 && npx vitest run`
Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/register/route.ts src/lib/auth.ts
git commit -m "feat: apply rate limiting to registration and login"
```

---

## Task 6: Password reset — schema and migration

**Files:**

- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add PasswordResetToken model to schema**

Add to `prisma/schema.prisma` after the Reminder model:

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  userId    String
  token     String    @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())
  user      User      @relation(fields: [userId], references: [id])
}
```

Add to the User model: `resetTokens PasswordResetToken[]`

- [ ] **Step 2: Create and apply migration**

Run: `npx prisma migrate dev --name add_password_reset_tokens`
Expected: Migration created and applied successfully.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add PasswordResetToken model"
```

---

## Task 7: Password reset — email template

**Files:**

- Modify: `src/lib/email/templates.ts`
- Modify: `src/__tests__/lib/email/templates.test.ts`

- [ ] **Step 1: Write failing test**

Add to `src/__tests__/lib/email/templates.test.ts`:

```typescript
import { buildPasswordResetEmail } from "@/lib/email/templates";

describe("buildPasswordResetEmail", () => {
  it("returns subject and html with reset link", () => {
    const result = buildPasswordResetEmail({
      resetUrl: "https://dormantfile.co.uk/reset-password?token=abc123",
    });
    expect(result.subject).toBe("Reset your DormantFile password");
    expect(result.html).toContain("abc123");
    expect(result.html).toContain("1 hour");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/email/templates.test.ts`
Expected: FAIL — `buildPasswordResetEmail` not exported.

- [ ] **Step 3: Implement the template**

Add to `src/lib/email/templates.ts`:

```typescript
interface PasswordResetEmailData {
  resetUrl: string;
}

interface PasswordResetEmailResult {
  subject: string;
  html: string;
}

export function buildPasswordResetEmail(data: PasswordResetEmailData): PasswordResetEmailResult {
  const { resetUrl } = data;

  const subject = "Reset your DormantFile password";

  const html = `
<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #1a1a1a;">Reset your password</h1>
    <p>
      We received a request to reset the password for your DormantFile account.
      Click the button below to set a new password.
    </p>
    <p>
      <a
        href="${resetUrl}"
        style="
          display: inline-block;
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 24px;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
        "
      >
        Reset Password
      </a>
    </p>
    <p style="color: #666; font-size: 14px;">
      This link expires in <strong>1 hour</strong>. If you did not request a
      password reset, you can safely ignore this email.
    </p>
  </body>
</html>
`.trim();

  return { subject, html };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/email/templates.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/email/templates.ts src/__tests__/lib/email/templates.test.ts
git commit -m "feat: add password reset email template"
```

---

## Task 8: Password reset — API routes

**Files:**

- Create: `src/app/api/auth/forgot-password/route.ts`
- Create: `src/app/api/auth/reset-password/route.ts`

- [ ] **Step 1: Create forgot-password route**

Create `src/app/api/auth/forgot-password/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { buildPasswordResetEmail } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`forgot:${ip}`, 3, 60000);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return 200 to avoid revealing if email exists
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
    const { subject, html } = buildPasswordResetEmail({ resetUrl });

    try {
      await resend.emails.send({
        from: "DormantFile <noreply@dormantfile.co.uk>",
        to: user.email,
        subject,
        html,
      });
    } catch {
      console.error("Failed to send password reset email");
    }
  }

  return NextResponse.json({
    message: "If an account exists with that email, we have sent a password reset link.",
  });
}
```

- [ ] **Step 2: Create reset-password route**

Create `src/app/api/auth/reset-password/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`reset:${ip}`, 5, 60000);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { token, newPassword } = body;

  if (!token || !newPassword) {
    return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
  }

  if (!validatePassword(newPassword)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters with at least one letter and one number" },
      { status: 400 },
    );
  }

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: hashedToken },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Password has been reset. You can now sign in." });
}
```

- [ ] **Step 3: Build to verify**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/forgot-password/route.ts src/app/api/auth/reset-password/route.ts
git commit -m "feat: add forgot-password and reset-password API routes"
```

---

## Task 9: Password reset — UI pages and login link

**Files:**

- Create: `src/app/(auth)/forgot-password/page.tsx`
- Create: `src/app/(auth)/reset-password/page.tsx`
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create forgot-password page**

Create `src/app/(auth)/forgot-password/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setError("Too many requests. Please try again in a minute.");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Check your email</h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          If an account exists with that email, we have sent a password reset link. It expires in 1
          hour.
        </p>
        <Link
          href="/login"
          className="block w-full text-center bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Reset your password</h1>
      <p className="text-center text-gray-500 text-sm mb-6">
        Enter your email address and we will send you a link to reset your password.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        <Link href="/login" className="text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Create reset-password page**

Create `src/app/(auth)/reset-password/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Invalid link</h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          This password reset link is invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full text-center bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition-colors"
        >
          Request new link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Password reset</h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          Your password has been reset successfully.
        </p>
        <Link
          href="/login"
          className="block w-full text-center bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Set new password</h1>
      <p className="text-center text-gray-500 text-sm mb-6">Enter your new password below.</p>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            New password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-400 mt-1">
            Must include at least one letter and one number.
          </p>
        </div>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Add "Forgot your password?" link to login page**

In `src/app/(auth)/login/page.tsx`, add a link below the sign-in button (before the "Don't have an account?" text):

```tsx
<p className="text-center text-sm text-gray-500 mt-3">
  <Link href="/forgot-password" className="text-blue-600 hover:underline">
    Forgot your password?
  </Link>
</p>
```

- [ ] **Step 4: Build to verify**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/(auth)/forgot-password/page.tsx src/app/(auth)/reset-password/page.tsx src/app/(auth)/login/page.tsx
git commit -m "feat: add password reset UI pages and forgot-password link on login"
```

---

## Task 10: Abandoned checkout recovery

**Files:**

- Modify: `src/components/subscription-banner.tsx`
- Modify: `src/app/api/stripe/create-checkout/route.ts`

- [ ] **Step 1: Update subscription banner text for "none" status**

In `src/components/subscription-banner.tsx`, change the `status === "none"` banner text from:

```
No active subscription. Subscribe to file your CT600 with HMRC.
```

To:

```
You haven't completed your subscription yet. Choose a plan to start filing.
```

And change the button text from "Subscribe now" to "Choose a plan".

- [ ] **Step 2: Update Stripe checkout cancel_url**

In `src/app/api/stripe/create-checkout/route.ts`, change:

```typescript
cancel_url: `${process.env.NEXTAUTH_URL}/dashboard`,
```

To:

```typescript
cancel_url: `${process.env.NEXTAUTH_URL}/choose-plan`,
```

- [ ] **Step 3: Commit**

```bash
git add src/components/subscription-banner.tsx src/app/api/stripe/create-checkout/route.ts
git commit -m "fix: improve abandoned checkout recovery messaging and redirect"
```

---

## Task 11: Tier validation during filing

**Files:**

- Modify: `src/app/api/file/submit/route.ts`

- [ ] **Step 1: Add tier check after subscription status check**

In `src/app/api/file/submit/route.ts`, after the `subscriptionStatus !== "active"` check (around line 108), add:

```typescript
import { getCompanyLimit } from "@/lib/subscription";
```

And after the subscription check:

```typescript
// Verify tier covers this company
const companyCount = await prisma.company.count({
  where: { userId: session.user.id },
});
const limit = getCompanyLimit(user.subscriptionTier);
if (companyCount > limit) {
  return NextResponse.json(
    { error: "Your plan doesn't cover all your companies. Upgrade your plan to file." },
    { status: 403 },
  );
}
```

- [ ] **Step 2: Build to verify**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/file/submit/route.ts
git commit -m "feat: enforce subscription tier limits during filing"
```

---

## Task 12: Duplicate company prevention

**Files:**

- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/company/route.ts`

- [ ] **Step 1: Add compound unique constraint to schema**

In `prisma/schema.prisma`, add to the Company model:

```prisma
@@unique([userId, companyRegistrationNumber])
```

- [ ] **Step 2: Create and apply migration**

Run: `npx prisma migrate dev --name add_unique_company_per_user`
Expected: Migration created and applied.

- [ ] **Step 3: Add duplicate check to company API**

In `src/app/api/company/route.ts`, after the tier limit check and before creating the company, add:

```typescript
// Check for duplicate company
const duplicate = await prisma.company.findFirst({
  where: {
    userId: session.user.id,
    companyRegistrationNumber: companyRegistrationNumber.trim(),
  },
});

if (duplicate) {
  return NextResponse.json({ error: "This company is already on your account." }, { status: 409 });
}
```

Also catch P2002 in the catch block as a fallback (same pattern as registration).

- [ ] **Step 4: Build and test**

Run: `npx next build 2>&1 | tail -5 && npx vitest run`
Expected: Build succeeds, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/app/api/company/route.ts
git commit -m "feat: prevent duplicate companies per user"
```

---

## Task 13: Stuck pending filing recovery

**Files:**

- Modify: `src/app/api/file/submit/route.ts`

- [ ] **Step 1: Add stale pending cleanup before idempotency check**

In `src/app/api/file/submit/route.ts`, before the idempotency check (around line 135), add:

```typescript
// Clean up stale pending filings (older than 5 minutes — never reached HMRC)
const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
await prisma.filing.deleteMany({
  where: {
    companyId,
    periodStart: company.accountingPeriodStart,
    periodEnd: company.accountingPeriodEnd,
    status: "pending",
    createdAt: { lt: fiveMinutesAgo },
  },
});
```

- [ ] **Step 2: Update idempotency error message**

Change the existing error message from:

```typescript
{
  error: "A filing already exists for this period";
}
```

To:

```typescript
{
  error: "A filing for this period has already been submitted. Check your dashboard for the current status.";
}
```

- [ ] **Step 3: Build to verify**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/file/submit/route.ts
git commit -m "fix: clean up stale pending filings and improve idempotency messaging"
```

---

## Task 14: Silent failure handling

**Files:**

- Modify: `src/components/subscription-banner.tsx`
- Modify: `src/components/settings-actions.tsx`
- Modify: `src/components/company-form.tsx`

- [ ] **Step 1: Add error handling to subscription banner portal button**

In `src/components/subscription-banner.tsx`, update `handlePortal` to handle errors:

```typescript
const [portalError, setPortalError] = useState("");

async function handlePortal() {
  setPortalError("");
  try {
    const res = await fetch("/api/stripe/create-portal", { method: "POST" });
    if (res.ok) {
      const { url } = await res.json();
      if (url) window.location.href = url;
    } else {
      setPortalError("Unable to open billing portal. Please try again.");
    }
  } catch {
    setPortalError("Unable to open billing portal. Please try again.");
  }
}
```

Display `portalError` inline below the button when set.

- [ ] **Step 2: Add lookup error state to company form**

In `src/components/company-form.tsx`, add a new lookup status `"error"` and show a message:

In the useEffect catch block, change `setLookupStatus("idle")` to `setLookupStatus("error")`.

Also handle the case where `!res.ok` and status is not 503 or 404 — set to `"error"`.

Add the UI for it after the `not_found` block:

```tsx
{
  lookupStatus === "error" && (
    <div style={{ marginTop: "2px" }}>
      <span style={{ fontSize: "13px", color: "#64748B" }}>
        Lookup failed — enter company name manually.
      </span>
    </div>
  );
}
```

Update the type: `"idle" | "loading" | "found" | "not_found" | "unavailable" | "error"`.

- [ ] **Step 3: Build to verify**

Run: `npx next build 2>&1 | tail -5`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/subscription-banner.tsx src/components/settings-actions.tsx src/components/company-form.tsx
git commit -m "fix: handle silent failures in subscription portal, billing, and company lookup"
```

---

## Task 15: Clearer filing status messaging

**Files:**

- Modify: `src/components/filing-status-badge.tsx`

- [ ] **Step 1: Update polling_timeout label**

In `src/components/filing-status-badge.tsx`, change the `polling_timeout` config:

```typescript
polling_timeout: {
  label: "Awaiting HMRC",
  backgroundColor: "#FEFCE8",
  color: "#A16207",
},
```

- [ ] **Step 2: Commit**

```bash
git add src/components/filing-status-badge.tsx
git commit -m "fix: show 'Awaiting HMRC' instead of 'Processing' for polling timeout status"
```

---

## Task 16: Accounting period date validation

**Files:**

- Modify: `src/app/api/company/route.ts`
- Modify: `src/components/company-form.tsx`

- [ ] **Step 1: Add server-side date validation**

In `src/app/api/company/route.ts`, after parsing `periodEnd`, add:

```typescript
const now = new Date();
const twoYearsAgo = new Date();
twoYearsAgo.setUTCFullYear(twoYearsAgo.getUTCFullYear() - 2);

if (periodEnd > now) {
  return NextResponse.json(
    { error: "Accounting period end date cannot be in the future." },
    { status: 400 },
  );
}

if (periodEnd < twoYearsAgo) {
  return NextResponse.json(
    { error: "Accounting period end date cannot be more than 2 years in the past." },
    { status: 400 },
  );
}
```

- [ ] **Step 2: Add client-side validation to company form**

In `src/components/company-form.tsx`, in the `validate()` function, after the existing `accountingPeriodEnd` required check, add:

```typescript
if (accountingPeriodEnd) {
  const periodEnd = new Date(accountingPeriodEnd);
  const now = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setUTCFullYear(twoYearsAgo.getUTCFullYear() - 2);

  if (periodEnd > now) {
    errs.accountingPeriodEnd = "Accounting period end date cannot be in the future.";
  } else if (periodEnd < twoYearsAgo) {
    errs.accountingPeriodEnd =
      "Accounting period end date cannot be more than 2 years in the past.";
  }
}
```

- [ ] **Step 3: Build and test**

Run: `npx next build 2>&1 | tail -5 && npx vitest run`
Expected: Build succeeds, all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/company/route.ts src/components/company-form.tsx
git commit -m "feat: validate accounting period end date range"
```

---

## Task 17: Final build and full test run

- [ ] **Step 1: Full build**

Run: `npx next build 2>&1 | tail -30`
Expected: Build succeeds with all routes listed.

- [ ] **Step 2: Run all tests**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 3: Final commit if any unstaged changes**

```bash
git status
```

If clean, done. If not, stage and commit remaining changes.
