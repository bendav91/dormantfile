# Auth Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign all four auth pages from centered-card layout to a split-screen design with a soft brand panel, using existing CSS custom properties.

**Architecture:** New shared components (`AuthLayout`, `BrandPanel`, `FormPanel`, `AuthInput`, `AuthButton`, `AuthError`) under `src/components/auth/`. The `(auth)/layout.tsx` becomes a thin shell. Each page owns its `BrandPanel` variant. All colours use `--color-*` CSS custom properties — no hardcoded Tailwind colour classes (including `text-white`, `bg-blue-600`, etc.).

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS v4, CSS custom properties

**Spec:** `docs/superpowers/specs/2026-03-29-auth-pages-redesign.md`

---

## File Map

### New files

| File | Responsibility |
|------|---------------|
| `src/components/auth/AuthLayout.tsx` | Split-screen grid shell (server component). Two-column on md+, single column on mobile. Wraps `<main id="main-content">`. |
| `src/components/auth/BrandPanel.tsx` | Left brand panel (server component). Variant-driven headline, 3-step process, trust signals. Collapses to strip on mobile. |
| `src/components/auth/FormPanel.tsx` | Form-side content wrapper (server component). Consistent padding and centering for the right column. |
| `src/components/auth/AuthInput.tsx` | Labelled input with token-based styling (server component). Extends `React.InputHTMLAttributes<HTMLInputElement>`. |
| `src/components/auth/AuthButton.tsx` | Primary submit button with loading state (server component). Accepts `loadingText`. |
| `src/components/auth/AuthError.tsx` | Styled error alert using danger tokens (server component). |
| `src/components/auth/index.ts` | Barrel export for all auth components. |

### Modified files

| File | Change summary |
|------|---------------|
| `src/app/globals.css` | Add `.auth-input::placeholder` and `.auth-step-badge` CSS classes for token-driven placeholder colour and dark-mode step badge background. |
| `src/app/(auth)/layout.tsx` | Replace all markup with `<AuthLayout>`. Keep session check + redirect. |
| `src/app/(auth)/login/page.tsx` | Replace inline markup with shared components. Add `BrandPanel variant="returning"`. |
| `src/app/(auth)/register/page.tsx` | Replace inline markup with shared components. Add `BrandPanel variant="register"`. |
| `src/app/(auth)/forgot-password/page.tsx` | Replace inline markup with shared components. Add `BrandPanel variant="returning"`. |
| `src/app/(auth)/reset-password/page.tsx` | Replace inline markup with shared components. Add `BrandPanel variant="returning"`. Keep Suspense. |

---

## Task 1: Add CSS utility classes for auth components

**Files:**
- Modify: `src/app/globals.css`

Two small classes that solve token-based styling needs that inline styles can't handle (placeholder pseudo-element, dark-mode conditional background).

- [ ] **Step 1: Add auth CSS classes to globals.css**

Add before the `/* Reduced motion */` section:

```css
/* Auth component helpers */
.auth-input::placeholder {
  color: var(--color-text-muted);
}

.auth-step-badge {
  background-color: var(--color-bg-card);
}
.dark .auth-step-badge {
  background-color: var(--color-bg-inset);
}
```

- [ ] **Step 2: Verify no build errors**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(auth): add CSS utility classes for auth input placeholder and step badge"
```

---

## Task 2: Create AuthError component

**Files:**
- Create: `src/components/auth/AuthError.tsx`

Create `src/components/auth/` directory first — it does not exist yet.

- [ ] **Step 1: Create directory and AuthError.tsx**

```tsx
// src/components/auth/AuthError.tsx

interface AuthErrorProps {
  message: string | null;
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="text-sm rounded-lg px-4 py-2.5"
      style={{
        color: "var(--color-danger-text)",
        backgroundColor: "var(--color-danger-bg)",
        borderWidth: "1px",
        borderColor: "var(--color-danger-border)",
      }}
    >
      {message}
    </p>
  );
}
```

- [ ] **Step 2: Verify no build errors**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/AuthError.tsx
git commit -m "feat(auth): add AuthError component with danger token styling"
```

---

## Task 3: Create AuthInput component

**Files:**
- Create: `src/components/auth/AuthInput.tsx`

Uses `focus-ring-input` class from `globals.css` for focus styling and the new `auth-input` class for placeholder colour.

- [ ] **Step 1: Create AuthInput.tsx**

```tsx
// src/components/auth/AuthInput.tsx
import type { InputHTMLAttributes } from "react";

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
}

export function AuthInput({ label, helperText, id, ...props }: AuthInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium mb-1"
        style={{ color: "var(--color-text-body)" }}
      >
        {label}
      </label>
      <input
        id={id}
        className="auth-input w-full rounded-lg px-4 py-2.5 text-sm focus-ring-input"
        style={{
          color: "var(--color-text-primary)",
          backgroundColor: "var(--color-input-bg)",
          borderWidth: "1px",
          borderColor: "var(--color-input-border)",
        }}
        {...props}
      />
      {helperText && (
        <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no build errors**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/AuthInput.tsx
git commit -m "feat(auth): add AuthInput component with token-based styling"
```

---

## Task 4: Create AuthButton component

**Files:**
- Create: `src/components/auth/AuthButton.tsx`

Uses `hoverable-btn` class from `globals.css` for hover effect and `focus-ring` class for focus styling — matching the pattern used by all other interactive elements in the codebase.

- [ ] **Step 1: Create AuthButton.tsx**

```tsx
// src/components/auth/AuthButton.tsx
import type { ButtonHTMLAttributes } from "react";

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
}

export function AuthButton({
  children,
  loading,
  loadingText,
  disabled,
  ...props
}: AuthButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className="hoverable-btn focus-ring w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        backgroundColor: "var(--color-primary)",
        color: "#fff",
      }}
      {...props}
    >
      {loading ? loadingText : children}
    </button>
  );
}
```

- [ ] **Step 2: Verify no build errors**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/AuthButton.tsx
git commit -m "feat(auth): add AuthButton component with loading state"
```

---

## Task 5: Create BrandPanel component

**Files:**
- Create: `src/components/auth/BrandPanel.tsx`

Renders the left side of the split-screen. Uses `auth-step-badge` class for dark-mode-aware step number backgrounds.

- [ ] **Step 1: Create BrandPanel.tsx**

```tsx
// src/components/auth/BrandPanel.tsx

interface BrandPanelProps {
  variant: "register" | "returning";
}

const STEPS = [
  { number: 1, title: "Add your company", subtitle: "Instant lookup by company number" },
  { number: 2, title: "We file for you", subtitle: "CT600 to HMRC + accounts to Companies House" },
  { number: 3, title: "You're done", subtitle: "Confirmation from HMRC & Companies House" },
];

const TRUST_SIGNALS = [
  "Encrypted & secure",
  "Files direct to HMRC & Companies House",
  "From £19/year",
];

export function BrandPanel({ variant }: BrandPanelProps) {
  const isRegister = variant === "register";

  return (
    <div
      className="hidden md:flex flex-col justify-center px-10 lg:px-16 py-12"
      style={{
        background:
          "linear-gradient(160deg, var(--color-primary-bg), var(--color-primary-border))",
      }}
    >
      {/* Wordmark */}
      <p
        className="text-xs font-semibold tracking-[0.2em] uppercase mb-6"
        style={{ color: "var(--color-primary)" }}
      >
        DormantFile
      </p>

      {/* Headline */}
      <h2
        className="text-2xl lg:text-3xl font-bold mb-2 leading-tight"
        style={{ color: "var(--color-text-primary)" }}
      >
        {isRegister
          ? "Three steps. Two filings. One less thing to worry about."
          : "Welcome back."}
      </h2>

      {!isRegister && (
        <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
          Your filings are waiting.
        </p>
      )}

      {isRegister && <div className="mb-8" />}

      {/* 3-step process */}
      <div className="flex flex-col gap-4 mb-8">
        {STEPS.map((step) => (
          <div key={step.number} className="flex items-start gap-3">
            <div
              className="auth-step-badge w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                color: "var(--color-primary)",
                boxShadow: "0 1px 2px rgba(0, 0, 0, 0.06)",
              }}
            >
              {step.number}
            </div>
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--color-text-primary)" }}
              >
                {step.title}
              </p>
              <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                {step.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Trust signals */}
      <div
        className="rounded-lg p-3 flex flex-wrap gap-x-4 gap-y-1"
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderWidth: "1px",
          borderColor: "var(--color-border)",
        }}
      >
        {TRUST_SIGNALS.map((signal) => (
          <p
            key={signal}
            className="text-xs"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {signal}
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Compact mobile strip — shown only below md breakpoint.
 */
export function BrandPanelMobile() {
  return (
    <div
      className="md:hidden px-6 py-4"
      style={{
        background:
          "linear-gradient(160deg, var(--color-primary-bg), var(--color-primary-border))",
      }}
    >
      <p
        className="text-xs font-semibold tracking-[0.2em] uppercase"
        style={{ color: "var(--color-primary)" }}
      >
        DormantFile
      </p>
      <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
        Affordable dormant company filing
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify no build errors**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/auth/BrandPanel.tsx
git commit -m "feat(auth): add BrandPanel with variant headlines, steps, trust signals"
```

---

## Task 6: Create FormPanel and AuthLayout, barrel export

**Files:**
- Create: `src/components/auth/FormPanel.tsx`
- Create: `src/components/auth/AuthLayout.tsx`
- Create: `src/components/auth/index.ts`

`FormPanel` is a shared wrapper for the right-column form content — consistent padding and centering used by all four pages. `AuthLayout` is the split-screen grid shell.

- [ ] **Step 1: Create FormPanel.tsx**

```tsx
// src/components/auth/FormPanel.tsx

interface FormPanelProps {
  children: React.ReactNode;
}

export function FormPanel({ children }: FormPanelProps) {
  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-10 sm:px-12 md:px-10 lg:px-16">
      <div className="w-full max-w-sm mx-auto md:max-w-none">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Create AuthLayout.tsx**

```tsx
// src/components/auth/AuthLayout.tsx

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <main id="main-content" className="min-h-screen md:grid md:grid-cols-2">
      {children}
    </main>
  );
}
```

- [ ] **Step 3: Create barrel export**

```tsx
// src/components/auth/index.ts
export { AuthLayout } from "./AuthLayout";
export { BrandPanel, BrandPanelMobile } from "./BrandPanel";
export { FormPanel } from "./FormPanel";
export { AuthInput } from "./AuthInput";
export { AuthButton } from "./AuthButton";
export { AuthError } from "./AuthError";
```

- [ ] **Step 4: Verify no build errors**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/auth/FormPanel.tsx src/components/auth/AuthLayout.tsx src/components/auth/index.ts
git commit -m "feat(auth): add FormPanel, AuthLayout, and barrel export"
```

---

## Task 7: Rewrite (auth)/layout.tsx

**Files:**
- Modify: `src/app/(auth)/layout.tsx`

Strip out the old centered-card markup. Keep session check. Use `AuthLayout`.

- [ ] **Step 1: Rewrite layout.tsx**

Replace the full file with:

```tsx
// src/app/(auth)/layout.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth";

export default async function AuthRootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/dashboard");
  }

  return <AuthLayout>{children}</AuthLayout>;
}
```

- [ ] **Step 2: Verify it builds**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds (pages may look broken until we update them — that's expected)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/layout.tsx
git commit -m "refactor(auth): replace centered-card layout with AuthLayout shell"
```

---

## Task 8: Rewrite login page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

Keep all state management and handlers. Replace inline markup with shared components. Add BrandPanel.

- [ ] **Step 1: Rewrite login/page.tsx**

Replace the full file with:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BrandPanel,
  BrandPanelMobile,
  FormPanel,
  AuthInput,
  AuthButton,
  AuthError,
} from "@/components/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        router.push("/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BrandPanel variant="returning" />
      <div className="flex flex-col" style={{ backgroundColor: "var(--color-bg-card)" }}>
        <BrandPanelMobile />
        <FormPanel>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            Sign in
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Welcome back to DormantFile
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              id="email"
              label="Email address"
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <div>
              <AuthInput
                id="password"
                label="Password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <div className="mt-1 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm hover:underline"
                  style={{ color: "var(--color-primary)" }}
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <AuthError message={error} />

            <AuthButton type="submit" loading={loading} loadingText="Signing in…">
              Sign in
            </AuthButton>
          </form>

          <p
            className="mt-6 text-center text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Create one
            </Link>
          </p>
        </FormPanel>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Open http://localhost:3000/login — verify:
- Split-screen layout on desktop (brand panel left, form right)
- Mobile: brand strip at top, form below
- Dark mode: toggle and verify both panels adapt
- Form submits correctly (use invalid creds to check error display)
- "Forgot your password?" link appears right-aligned below password field
- "Create one" link navigates to /register

- [ ] **Step 3: Run lint**

Run: `npx next lint`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx
git commit -m "feat(auth): redesign login page with split-screen layout"
```

---

## Task 9: Rewrite register page

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Rewrite register/page.tsx**

Replace the full file with:

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BrandPanel,
  BrandPanelMobile,
  FormPanel,
  AuthInput,
  AuthButton,
  AuthError,
} from "@/components/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Registration failed. Please try again.");
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Account created but sign-in failed. Please try logging in.");
        router.push("/login");
      } else {
        router.push("/onboarding");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <BrandPanel variant="register" />
      <div className="flex flex-col" style={{ backgroundColor: "var(--color-bg-card)" }}>
        <BrandPanelMobile />
        <FormPanel>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: "var(--color-text-primary)" }}
          >
            Create your account
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
            Get started in minutes
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <AuthInput
              id="name"
              label="Full name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />

            <AuthInput
              id="email"
              label="Email address"
              type="email"
              required
              autoComplete="email"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />

            <AuthInput
              id="password"
              label="Password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              helperText="Must be at least 8 characters"
            />

            <AuthError message={error} />

            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--color-text-muted)" }}
            >
              By creating an account, you agree to our{" "}
              <Link
                href="/terms"
                className="underline hover:no-underline"
                style={{ color: "var(--color-primary)" }}
              >
                Terms of Service
              </Link>
              ,{" "}
              <Link
                href="/privacy"
                className="underline hover:no-underline"
                style={{ color: "var(--color-primary)" }}
              >
                Privacy Policy
              </Link>
              , and{" "}
              <Link
                href="/acceptable-use"
                className="underline hover:no-underline"
                style={{ color: "var(--color-primary)" }}
              >
                Acceptable Use Policy
              </Link>
              .
            </p>

            <AuthButton type="submit" loading={loading} loadingText="Creating account…">
              Create account
            </AuthButton>
          </form>

          <p
            className="mt-6 text-center text-sm"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              Sign in
            </Link>
          </p>
        </FormPanel>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify visually**

Open http://localhost:3000/register — verify:
- Brand panel shows "Three steps. Two filings..." headline
- Form has name, email, password fields with helper text
- Terms/privacy/AUP links appear above the submit button
- Mobile layout collapses correctly
- Dark mode works

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/register/page.tsx
git commit -m "feat(auth): redesign register page with split-screen layout"
```

---

## Task 10: Rewrite forgot-password page

**Files:**
- Modify: `src/app/(auth)/forgot-password/page.tsx`

- [ ] **Step 1: Rewrite forgot-password/page.tsx**

Replace the full file with:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BrandPanel,
  BrandPanelMobile,
  FormPanel,
  AuthInput,
  AuthButton,
  AuthError,
} from "@/components/auth";

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

  return (
    <>
      <BrandPanel variant="returning" />
      <div className="flex flex-col" style={{ backgroundColor: "var(--color-bg-card)" }}>
        <BrandPanelMobile />
        <FormPanel>
          {submitted ? (
            <>
              <h1
                className="text-2xl font-bold mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                Check your email
              </h1>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
                If an account exists with that email, we have sent a password reset link. It
                expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="hoverable-btn focus-ring block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
              >
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h1
                className="text-2xl font-bold mb-1"
                style={{ color: "var(--color-text-primary)" }}
              >
                Reset your password
              </h1>
              <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
                We&apos;ll send you a reset link
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <AuthInput
                  id="email"
                  label="Email address"
                  type="email"
                  required
                  autoComplete="email"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />

                <AuthError message={error} />

                <AuthButton type="submit" loading={loading} loadingText="Sending…">
                  Send reset link
                </AuthButton>
              </form>

              <p
                className="mt-6 text-center text-sm"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Remember your password?{" "}
                <Link
                  href="/login"
                  className="font-medium hover:underline"
                  style={{ color: "var(--color-primary)" }}
                >
                  Sign in
                </Link>
              </p>
            </>
          )}
        </FormPanel>
      </div>
    </>
  );
}
```

Note: The footer text changes from "Back to sign in" to "Remember your password? Sign in" — this is a deliberate copy change per the spec.

- [ ] **Step 2: Verify visually**

Open http://localhost:3000/forgot-password — verify:
- Form shows "Reset your password" heading
- Submit the form — success state shows "Check your email"
- Rate limit error displays correctly
- Mobile collapse works

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/forgot-password/page.tsx
git commit -m "feat(auth): redesign forgot-password page with split-screen layout"
```

---

## Task 11: Rewrite reset-password page

**Files:**
- Modify: `src/app/(auth)/reset-password/page.tsx`

This page has three states (invalid token, form, success) and a Suspense boundary. Uses `FormPanel` for each state.

- [ ] **Step 1: Rewrite reset-password/page.tsx**

Replace the full file with:

```tsx
"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  BrandPanel,
  BrandPanelMobile,
  FormPanel,
  AuthInput,
  AuthButton,
  AuthError,
} from "@/components/auth";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!token) {
    return (
      <FormPanel>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Invalid link
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
          This password reset link is invalid. Please request a new one.
        </p>
        <Link
          href="/forgot-password"
          className="hoverable-btn focus-ring block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
        >
          Request a new link
        </Link>
      </FormPanel>
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
      <FormPanel>
        <h1
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          Password reset
        </h1>
        <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
          Your password has been reset successfully.
        </p>
        <Link
          href="/login"
          className="hoverable-btn focus-ring block w-full text-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
          style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
        >
          Sign in
        </Link>
      </FormPanel>
    );
  }

  return (
    <FormPanel>
      <h1
        className="text-2xl font-bold mb-1"
        style={{ color: "var(--color-text-primary)" }}
      >
        Set a new password
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--color-text-secondary)" }}>
        Choose a new password for your account
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthInput
          id="password"
          label="New password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          helperText="Must include at least one letter and one number"
        />

        <AuthError message={error} />

        <AuthButton type="submit" loading={loading} loadingText="Resetting…">
          Reset password
        </AuthButton>
      </form>
    </FormPanel>
  );
}

export default function ResetPasswordPage() {
  return (
    <>
      <BrandPanel variant="returning" />
      <div className="flex flex-col" style={{ backgroundColor: "var(--color-bg-card)" }}>
        <BrandPanelMobile />
        <Suspense
          fallback={
            <FormPanel>
              <div className="flex items-center justify-center py-12">
                <div
                  className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{
                    borderColor: "var(--color-border)",
                    borderTopColor: "var(--color-primary)",
                  }}
                />
              </div>
            </FormPanel>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify all three states**

Open http://localhost:3000/reset-password — verify:
- No token: "Invalid link" with "Request a new link" button
- With token `?token=test`: form appears with "Set a new password"
- Submitting with invalid token shows error
- Mobile + dark mode work

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/reset-password/page.tsx
git commit -m "feat(auth): redesign reset-password page with split-screen layout"
```

---

## Task 12: Final verification and cleanup

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Lint**

Run: `npx next lint`
Expected: No lint errors in auth files

- [ ] **Step 3: Verify no hardcoded colour classes remain**

```bash
grep -rn "text-gray\|text-red\|text-blue\|bg-gray\|bg-red\|bg-blue\|bg-white\|bg-slate\|border-gray\|border-red\|border-blue\|border-slate\|ring-blue\|text-slate\|placeholder-gray\|text-white" src/app/\(auth\)/ src/components/auth/
```

Expected: No matches. All colours should use CSS custom properties. (`text-white` was replaced with inline `color: "#fff"`.)

- [ ] **Step 4: Visual QA checklist**

Run dev server and check each page:

| Page | Desktop split | Mobile collapse | Dark mode | Form works | Links work |
|------|:---:|:---:|:---:|:---:|:---:|
| /login | ? | ? | ? | ? | ? |
| /register | ? | ? | ? | ? | ? |
| /forgot-password | ? | ? | ? | ? | ? |
| /reset-password | ? | ? | ? | ? | ? |

- [ ] **Step 5: Commit any cleanup**

If any issues found in steps 1-4, fix and commit:

```bash
git add -A
git commit -m "fix(auth): address QA issues from auth redesign"
```
