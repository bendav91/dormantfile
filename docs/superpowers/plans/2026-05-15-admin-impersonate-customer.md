# Admin Impersonate-Customer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin press a button on the customer-detail screen to act as that customer inside the app with full access, with a persistent banner to stop and return to admin.

**Architecture:** Swap the user inside the NextAuth v4 JWT. The `jwt` callback's existing `trigger === "update"` branch is restructured into three mutually-exclusive cases (start / stop / normal) with early returns. The admin check runs on the *pre-swap* `token.id` (server-signed JWT, client only supplies the target id). A client `ImpersonateButton` triggers the swap via `useSession().update()`; a layout-mounted `ImpersonationBanner` triggers the restore. The `(app)` layout's verify-email redirect is bypassed while impersonating.

**Tech Stack:** Next.js 16 (App Router), NextAuth v4 (JWT strategy, credentials), Prisma 7, React 19, Vitest (+ jsdom for components), Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-05-15-admin-impersonate-customer-design.md`

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/auth.ts` | Core: JWT/Session type augmentation; `jwt` callback start/stop/normal; `session` callback exposes `impersonating`/`impersonatedName` |
| `src/components/admin/ImpersonateButton.tsx` | Client: confirm + `update({impersonate})` + navigate / error |
| `src/components/ImpersonationBanner.tsx` | Client: sticky banner, `update({stopImpersonating})` + navigate |
| `src/app/(app)/admin/customers/[userId]/page.tsx` | Render `ImpersonateButton` in the customer header |
| `src/app/(app)/layout.tsx` | Mount `ImpersonationBanner`; bypass verify-email redirect when impersonating |
| `src/__tests__/lib/auth-impersonation.test.ts` | Unit tests for `jwt`/`session` callbacks |
| `src/__tests__/components/ImpersonateButton.test.tsx` | Component tests |
| `src/__tests__/components/ImpersonationBanner.test.tsx` | Component tests |

No Prisma schema change. No migration. No audit log.

---

## Task 1: Type augmentation + `session` callback exposure

**Files:**
- Modify: `src/lib/auth.ts` (the two `declare module` blocks, lines ~7-24; `session` callback, lines ~89-95)
- Test: `src/__tests__/lib/auth-impersonation.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/auth-impersonation.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { authOptions } from "@/lib/auth";

// Helpers to call the inline callbacks directly.
const jwt = (args: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (authOptions.callbacks!.jwt as any)(args);
const sessionCb = (args: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (authOptions.callbacks!.session as any)(args);

describe("session callback — impersonation exposure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does NOT set impersonating when token has no impersonatorId", async () => {
    const session = { user: {} };
    const result = await sessionCb({ session, token: { id: "u1" } });
    expect(result.impersonating).toBeUndefined();
    expect(result.user.id).toBe("u1");
  });

  it("sets impersonating + impersonatedName when token.impersonatorId present", async () => {
    const session = { user: {} };
    const result = await sessionCb({
      session,
      token: { id: "customer1", impersonatorId: "admin1", impersonatedName: "Acme Ltd" },
    });
    expect(result.impersonating).toBe(true);
    expect(result.impersonatedName).toBe("Acme Ltd");
    expect(result.user.id).toBe("customer1");
  });

  it("sets impersonatedName to null when token.impersonatedName missing", async () => {
    const session = { user: {} };
    const result = await sessionCb({
      session,
      token: { id: "customer1", impersonatorId: "admin1" },
    });
    expect(result.impersonating).toBe(true);
    expect(result.impersonatedName).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/lib/auth-impersonation.test.ts`
Expected: FAIL — `result.impersonating` is `undefined` in the "sets impersonating" cases (callback doesn't expose it yet).

- [ ] **Step 3: Implement — augment types**

In `src/lib/auth.ts`, replace the two `declare module` blocks with:

```ts
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
    };
    impersonating?: boolean;
    impersonatedName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    emailVerified?: Date | null;
    impersonatorId?: string;
    impersonatedName?: string;
  }
}
```

- [ ] **Step 4: Implement — extend `session` callback**

Replace the `session` callback with:

```ts
async session({ session, token }) {
  if (token.id) {
    session.user.id = token.id as string;
  }
  session.user.emailVerified = token.emailVerified as Date | null;
  if (token.impersonatorId) {
    session.impersonating = true;
    session.impersonatedName =
      (token.impersonatedName as string | undefined) ?? null;
  }
  return session;
},
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- src/__tests__/lib/auth-impersonation.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/__tests__/lib/auth-impersonation.test.ts
git commit -m "feat: expose impersonation state on session (types + session callback)"
```

---

## Task 2: `jwt` callback — start impersonation

**Files:**
- Modify: `src/lib/auth.ts` (`jwt` callback, lines ~73-88)
- Test: `src/__tests__/lib/auth-impersonation.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/lib/auth-impersonation.test.ts`:

```ts
import { prisma } from "@/lib/db";

describe("jwt callback — start impersonation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin starting impersonation swaps identity and sets impersonatorId", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isAdmin: true } as never) // admin lookup
      .mockResolvedValueOnce({
        id: "cust1",
        name: "Acme Ltd",
        email: "owner@acme.test",
        emailVerified: null,
      } as never); // target lookup

    const token: Record<string, unknown> = { id: "admin1", emailVerified: new Date() };
    const result = await jwt({
      token,
      trigger: "update",
      session: { impersonate: "cust1" },
    });

    expect(result.impersonatorId).toBe("admin1");
    expect(result.id).toBe("cust1");
    expect(result.email).toBe("owner@acme.test");
    expect(result.name).toBe("Acme Ltd");
    expect(result.emailVerified).toBeNull();
    expect(result.impersonatedName).toBe("Acme Ltd");
  });

  it("non-admin attempting to impersonate is a no-op", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isAdmin: false } as never);

    const token: Record<string, unknown> = { id: "user1" };
    const result = await jwt({
      token,
      trigger: "update",
      session: { impersonate: "cust1" },
    });

    expect(result.impersonatorId).toBeUndefined();
    expect(result.id).toBe("user1");
  });

  it("admin impersonating a nonexistent target is a no-op", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isAdmin: true } as never)
      .mockResolvedValueOnce(null as never);

    const token: Record<string, unknown> = { id: "admin1" };
    const result = await jwt({
      token,
      trigger: "update",
      session: { impersonate: "ghost" },
    });

    expect(result.impersonatorId).toBeUndefined();
    expect(result.id).toBe("admin1");
  });

  it("already impersonating: a second start is blocked (no nested impersonation)", async () => {
    const token: Record<string, unknown> = {
      id: "cust1",
      impersonatorId: "admin1",
      impersonatedName: "Acme Ltd",
    };
    const result = await jwt({
      token,
      trigger: "update",
      session: { impersonate: "cust2" },
    });

    expect(result.id).toBe("cust1");
    expect(result.impersonatorId).toBe("admin1");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/lib/auth-impersonation.test.ts`
Expected: FAIL — start-impersonation cases fail (callback only refreshes `emailVerified`); the no-op cases may pass incidentally.

- [ ] **Step 3: Implement — restructure `jwt` callback (start case + early returns)**

Replace the entire `jwt` callback with the following. The `trigger === "update"` body becomes three **mutually exclusive** cases with early `return token` so the normal `emailVerified` re-fetch (now the `else`/fall-through) never clobbers a swapped/restored identity:

```ts
async jwt({ token, user, trigger, session }) {
  if (user) {
    token.id = user.id;
    token.emailVerified =
      (user as { emailVerified?: Date | null }).emailVerified ?? null;
  }

  if (trigger === "update") {
    const update = session as
      | { impersonate?: string; stopImpersonating?: boolean }
      | undefined;

    // Start impersonation: admin (current token) -> target customer.
    if (update?.impersonate && !token.impersonatorId) {
      const admin = await prisma.user.findUnique({
        where: { id: token.id as string },
        select: { isAdmin: true },
      });
      const target = admin?.isAdmin
        ? await prisma.user.findUnique({
            where: { id: update.impersonate },
            select: { id: true, name: true, email: true, emailVerified: true },
          })
        : null;
      if (admin?.isAdmin && target) {
        token.impersonatorId = token.id as string;
        token.id = target.id;
        token.email = target.email;
        token.name = target.name;
        token.emailVerified = target.emailVerified;
        token.impersonatedName = target.name ?? undefined;
      }
      return token;
    }

    // (Stop impersonation case added in Task 3.)

    // Normal update (e.g. email verification): refresh emailVerified.
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/lib/auth-impersonation.test.ts`
Expected: PASS (Task 1 + Task 2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/auth.ts src/__tests__/lib/auth-impersonation.test.ts
git commit -m "feat: jwt callback starts admin impersonation (admin-verified, no nesting)"
```

---

## Task 3: `jwt` callback — stop impersonation + protect the normal-update tail

**Files:**
- Modify: `src/lib/auth.ts` (`jwt` callback — add the stop case)
- Test: `src/__tests__/lib/auth-impersonation.test.ts` (append)

- [ ] **Step 1: Write the failing tests**

Append to `src/__tests__/lib/auth-impersonation.test.ts`:

```ts
describe("jwt callback — stop impersonation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stop restores the original admin identity and clears impersonation fields", async () => {
    const verified = new Date("2024-01-01");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      name: "Admin User",
      email: "admin@dormantfile.test",
      emailVerified: verified,
    } as never);

    const token: Record<string, unknown> = {
      id: "cust1",
      email: "owner@acme.test",
      name: "Acme Ltd",
      emailVerified: null,
      impersonatorId: "admin1",
      impersonatedName: "Acme Ltd",
    };
    const result = await jwt({
      token,
      trigger: "update",
      session: { stopImpersonating: true },
    });

    expect(result.id).toBe("admin1");
    expect(result.email).toBe("admin@dormantfile.test");
    expect(result.name).toBe("Admin User");
    expect(result.emailVerified).toEqual(verified);
    expect(result.impersonatorId).toBeUndefined();
    expect(result.impersonatedName).toBeUndefined();
  });

  it("stopImpersonating with no active impersonation falls through to normal refresh", async () => {
    const verified = new Date("2024-02-02");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      emailVerified: verified,
    } as never);

    const token: Record<string, unknown> = { id: "u1", emailVerified: null };
    const result = await jwt({
      token,
      trigger: "update",
      session: { stopImpersonating: true },
    });

    expect(result.id).toBe("u1");
    expect(result.emailVerified).toEqual(verified);
    expect(result.impersonatorId).toBeUndefined();
  });

  it("regression: a normal update still refreshes emailVerified", async () => {
    const verified = new Date("2024-03-03");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      emailVerified: verified,
    } as never);

    const token: Record<string, unknown> = { id: "u1", emailVerified: null };
    const result = await jwt({ token, trigger: "update", session: {} });

    expect(result.emailVerified).toEqual(verified);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/__tests__/lib/auth-impersonation.test.ts`
Expected: FAIL — "stop restores the original admin identity" fails (no stop case yet; falls through to the normal refetch which would `findUnique` on `cust1` for `emailVerified` only and leave `id` as `cust1`).

- [ ] **Step 3: Implement — add the stop case**

In `src/lib/auth.ts`, replace the `// (Stop impersonation case added in Task 3.)` placeholder with:

```ts
    // Stop impersonation: restore the original admin identity.
    if (update?.stopImpersonating && token.impersonatorId) {
      const adminId = token.impersonatorId;
      const admin = await prisma.user.findUnique({
        where: { id: adminId },
        select: { name: true, email: true, emailVerified: true },
      });
      token.id = adminId;
      token.email = admin?.email ?? null;
      token.name = admin?.name ?? null;
      token.emailVerified = admin?.emailVerified ?? null;
      delete token.impersonatorId;
      delete token.impersonatedName;
      return token;
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/__tests__/lib/auth-impersonation.test.ts`
Expected: PASS (all Task 1–3 tests).

- [ ] **Step 5: Full unit-test regression**

Run: `npm test`
Expected: PASS — no existing tests broken (especially any auth/session-dependent tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.ts src/__tests__/lib/auth-impersonation.test.ts
git commit -m "feat: jwt callback stops impersonation, restores admin; protect normal-update tail"
```

---

## Task 4: `ImpersonateButton` component + wire into customer-detail page

**Files:**
- Create: `src/components/admin/ImpersonateButton.tsx`
- Modify: `src/app/(app)/admin/customers/[userId]/page.tsx` (header `<div className="flex items-center gap-3">`)
- Test: `src/__tests__/components/ImpersonateButton.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/ImpersonateButton.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const updateMock = vi.fn();
vi.mock("next-auth/react", () => ({
  useSession: () => ({ update: updateMock }),
}));

import { ImpersonateButton } from "@/components/admin/ImpersonateButton";

describe("ImpersonateButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("does nothing if the confirm dialog is cancelled", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ImpersonateButton userId="cust1" name="Acme Ltd" />);
    fireEvent.click(screen.getByRole("button", { name: /impersonate/i }));
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("on success calls update and navigates to /dashboard", async () => {
    updateMock.mockResolvedValue({ impersonating: true });
    render(<ImpersonateButton userId="cust1" name="Acme Ltd" />);
    fireEvent.click(screen.getByRole("button", { name: /impersonate/i }));
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ impersonate: "cust1" }),
    );
    await waitFor(() => expect(window.location.href).toBe("/dashboard"));
  });

  it("on failure shows an error and does NOT navigate", async () => {
    updateMock.mockResolvedValue({ impersonating: undefined });
    render(<ImpersonateButton userId="cust1" name={null} />);
    fireEvent.click(screen.getByRole("button", { name: /impersonate/i }));
    expect(
      await screen.findByText(/could not start impersonation/i),
    ).toBeInTheDocument();
    expect(window.location.href).toBe("");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/components/ImpersonateButton.test.tsx`
Expected: FAIL — module `@/components/admin/ImpersonateButton` not found.

- [ ] **Step 3: Implement the component**

Create `src/components/admin/ImpersonateButton.tsx`. Styling mirrors the existing admin action buttons in `AdminCustomerDetail.tsx` (Tailwind tokens only — no inline styles):

```tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { UserCog } from "lucide-react";

export function ImpersonateButton({
  userId,
  name,
}: {
  userId: string;
  name: string | null;
}) {
  const { update } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = name ?? "this customer";

  async function handleImpersonate() {
    const ok = window.confirm(
      `Impersonate ${label}? You will act as this customer with full access, ` +
        `including real HMRC and Companies House submissions.`,
    );
    if (!ok) return;

    setLoading(true);
    setError(null);
    try {
      const next = await update({ impersonate: userId });
      if (next?.impersonating) {
        window.location.href = "/dashboard";
        return;
      }
      setError("Could not start impersonation.");
    } catch {
      setError("Could not start impersonation.");
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleImpersonate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md cursor-pointer disabled:opacity-50 text-primary border border-primary-border bg-primary-bg"
      >
        <UserCog size={12} />
        {loading ? "Starting…" : "Impersonate"}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/components/ImpersonateButton.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Wire the button into the customer-detail page**

In `src/app/(app)/admin/customers/[userId]/page.tsx`:

Add the import near the other component imports:

```ts
import { ImpersonateButton } from "@/components/admin/ImpersonateButton";
```

Inside the header, the right-hand `<div className="flex items-center gap-3">` currently holds the status badges and the Stripe link. Add the button as the first child of that div:

```tsx
<div className="flex items-center gap-3">
  <ImpersonateButton userId={user.id} name={user.name} />
  <StatusBadge status={user.subscriptionStatus} />
  {/* ...existing tier badge + Stripe link unchanged... */}
</div>
```

(`user.id` and `user.name` are already available from `getCustomerDetail`; `user.name` is `string | null`, matching the prop.)

- [ ] **Step 6: Verify build/lint and commit**

Run: `npm run lint && npm test -- src/__tests__/components/ImpersonateButton.test.tsx`
Expected: lint clean; tests PASS.

```bash
git add src/components/admin/ImpersonateButton.tsx \
        src/__tests__/components/ImpersonateButton.test.tsx \
        "src/app/(app)/admin/customers/[userId]/page.tsx"
git commit -m "feat: add Impersonate button to admin customer-detail page"
```

---

## Task 5: `ImpersonationBanner` + mount in layout + verify-email bypass

**Files:**
- Create: `src/components/ImpersonationBanner.tsx`
- Modify: `src/app/(app)/layout.tsx` (verify-email redirect; mount banner above `SiteNav`)
- Test: `src/__tests__/components/ImpersonationBanner.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/components/ImpersonationBanner.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const updateMock = vi.fn();
let sessionData: unknown = null;
vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: sessionData, update: updateMock }),
}));

import { ImpersonationBanner } from "@/components/ImpersonationBanner";

describe("ImpersonationBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionData = null;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { href: "" },
    });
  });

  it("renders nothing when not impersonating", () => {
    sessionData = { impersonating: false };
    const { container } = render(<ImpersonationBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the impersonated name when impersonating", () => {
    sessionData = { impersonating: true, impersonatedName: "Acme Ltd" };
    render(<ImpersonationBanner />);
    expect(screen.getByText(/impersonating/i)).toHaveTextContent("Acme Ltd");
  });

  it("Stop calls update({stopImpersonating}) and navigates to /admin", async () => {
    sessionData = { impersonating: true, impersonatedName: "Acme Ltd" };
    updateMock.mockResolvedValue({});
    render(<ImpersonationBanner />);
    fireEvent.click(screen.getByRole("button", { name: /stop/i }));
    await waitFor(() =>
      expect(updateMock).toHaveBeenCalledWith({ stopImpersonating: true }),
    );
    await waitFor(() => expect(window.location.href).toBe("/admin"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/components/ImpersonationBanner.test.tsx`
Expected: FAIL — module `@/components/ImpersonationBanner` not found.

- [ ] **Step 3: Implement the component**

Create `src/components/ImpersonationBanner.tsx` (Tailwind danger tokens, matching the `bg-danger-bg text-danger border-danger-border` usage in `AdminCustomerDetail.tsx`):

```tsx
"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);

  if (!session?.impersonating) return null;

  async function handleStop() {
    setLoading(true);
    try {
      await update({ stopImpersonating: true });
      window.location.href = "/admin";
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium bg-danger-bg text-danger border-b border-danger-border">
      <span>Impersonating {session.impersonatedName ?? "customer"}</span>
      <button
        onClick={handleStop}
        disabled={loading}
        className="text-xs font-semibold px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-50 text-danger border border-danger-border bg-card"
      >
        {loading ? "Stopping…" : "Stop impersonating"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/components/ImpersonationBanner.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Mount banner + add verify-email bypass in the app layout**

In `src/app/(app)/layout.tsx`:

Add the import:

```ts
import { ImpersonationBanner } from "@/components/ImpersonationBanner";
```

Change the verify-email guard so impersonation bypasses it:

```ts
// before:  if (!user?.emailVerified) {
if (!user?.emailVerified && !session.impersonating) {
  redirect("/verify-email");
}
```

Mount the banner as the first child of the root layout `<div>`, above `<SiteNav .../>`:

```tsx
<div className={`${ibmPlexSans.variable} min-h-screen font-[family-name:var(--font-ibm-plex-sans),sans-serif] bg-page flex flex-col`}>
  <ImpersonationBanner />
  <SiteNav variant="app" user={{ email: session.user.email! }} isAdmin={isAdmin} />
  {/* ...rest unchanged... */}
</div>
```

- [ ] **Step 6: Manual smoke test (dev server)**

Run: `npm run dev`. As an admin: open `/admin/customers/<id>`, click **Impersonate**, confirm. Verify: redirected to `/dashboard`, banner visible, app behaves as the customer, `/admin/*` is 404. Click **Stop impersonating** → back at `/admin`, banner gone, admin nav restored. Repeat against an unverified customer to confirm no `/verify-email` redirect.

- [ ] **Step 7: Lint, full test run, commit**

Run: `npm run lint && npm test`
Expected: lint clean; all tests PASS.

```bash
git add src/components/ImpersonationBanner.tsx \
        src/__tests__/components/ImpersonationBanner.test.tsx \
        "src/app/(app)/layout.tsx"
git commit -m "feat: impersonation banner + verify-email bypass while impersonating"
```

---

## Verification Checklist (end of plan)

- [ ] `npm test` — all green, including `src/__tests__/lib/auth-impersonation.test.ts` and both component test files.
- [ ] `npm run lint` — clean.
- [ ] `npm run build` — succeeds (no TS errors from the type augmentation).
- [ ] Manual: start/stop impersonation round-trips; admin restored; unverified customer reachable while impersonating; non-admin cannot trigger a swap (callback no-op).

## Notes for the implementer

- The `jwt`/`session` callbacks are inline on `authOptions.callbacks`; tests invoke them directly via `authOptions.callbacks!.jwt` / `.session` with `as any` casts (NextAuth's callback arg types are broad). This mirrors the existing `src/__tests__/lib/admin.test.ts` Prisma-mock style. `auth-impersonation.test.ts` runs under the default `node` env (no docblock needed).
- **No new dependencies.** Vitest is configured with `environment: "node"` globally and no setup file. Component test files MUST opt into jsdom per-file with a leading `/** @vitest-environment jsdom */` docblock and `import "@testing-library/jest-dom/vitest";` (matching `src/__tests__/components/SiteNav.test.tsx`). Use `fireEvent` from `@testing-library/react` — `@testing-library/user-event` is NOT installed and must not be introduced. After an async click handler, assert via `await waitFor(...)` / `await screen.findBy...`.
- `SessionProvider` is already mounted globally (`src/components/providers.tsx`), so client `useSession()` works in the layout-mounted banner.
- Do not invent new Tailwind tokens. Reuse the `text-primary / border-primary-border / bg-primary-bg` and `bg-danger-bg / text-danger / border-danger-border` combinations already used in `AdminCustomerDetail.tsx`.
- Full-page navigation (`window.location.href`) is intentional over `router.push` so server components re-render under the swapped identity.
