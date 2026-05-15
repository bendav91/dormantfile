# Onboarding Activation Checklist — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bespoke, launch-flag-aware activation checklist to the dashboard (plus a one-time first-filing reassurance note) that guides a new user from empty dashboard to their first submitted filing.

**Architecture:** A pure `getOnboardingState` helper derives progress from data the dashboard already loads + one new `User.onboardingDismissedAt` field. A client `OnboardingChecklist` renders the strip and dismisses optimistically via a server action. A static `FirstFilingNote` shows once at the company hub. No tour library.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, Prisma 7 / PostgreSQL, NextAuth v4, Tailwind v4 (`@theme` tokens, `cn()`), Vitest (+ `@testing-library/react`, jsdom per-file).

**Spec:** `docs/superpowers/specs/2026-05-15-onboarding-activation-checklist-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `prisma/schema.prisma` (+ migration) | Add nullable `onboardingDismissedAt` to `User` |
| `src/lib/onboarding.ts` | Pure `getOnboardingState` + types **only** (no server imports — must stay unit-testable without a DB) |
| `src/lib/onboarding-actions.ts` | File-level `"use server"` module: `dismissOnboarding` action |
| `src/__tests__/lib/onboarding.test.ts` | Unit tests for `getOnboardingState` (full launch-flag matrix) |
| `src/components/OnboardingChecklist.tsx` | Client: renders the strip, optimistic dismiss |
| `src/__tests__/components/OnboardingChecklist.test.tsx` | Render tests (jsdom) |
| `src/components/FirstFilingNote.tsx` | Static server component: one-time reassurance copy |
| `src/app/(app)/dashboard/page.tsx` | Compute state, render checklist in both return branches |
| `src/app/(app)/company/[companyId]/page.tsx` | Render `FirstFilingNote` conditionally |
| `src/app/globals.css` | One `@keyframes` for the staggered step reveal |

Conventions verified against the codebase: path alias `@/*` → `./src/*`; styling via Tailwind tokens only (`bg-card`, `border-border`, `text-foreground`, `text-secondary`, `bg-primary`, `bg-primary-bg`, `border-primary-border`, `text-primary-text`), `cn()` from `@/lib/cn`; component tests use `/** @vitest-environment jsdom */` + `import "@testing-library/jest-dom/vitest"` + `@testing-library/react`.

---

## Task 1: Database migration

**Files:**
- Modify: `prisma/schema.prisma` (`User` model, after `calendarFeedToken` line)

- [ ] **Step 1: Add the field to the schema**

In `prisma/schema.prisma`, inside `model User`, add this line immediately after the `calendarFeedToken  String?            @unique` line:

```prisma
  onboardingDismissedAt DateTime?
```

- [ ] **Step 2: Create and apply the migration**

Run: `npx prisma migrate dev --name add_onboarding_dismissed_at`
Expected: migration created under `prisma/migrations/`, applied cleanly, "Your database is now in sync with your schema."

- [ ] **Step 3: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" — `onboardingDismissedAt` now on the `User` type.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add User.onboardingDismissedAt for onboarding checklist"
```

---

## Task 2: `getOnboardingState` pure helper (TDD)

**Files:**
- Test: `src/__tests__/lib/onboarding.test.ts`
- Create: `src/lib/onboarding.ts` (pure function + types only this task)

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/lib/onboarding.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { getOnboardingState, type OnboardingStateInput } from "@/lib/onboarding";

function base(overrides: Partial<OnboardingStateInput> = {}): OnboardingStateInput {
  return {
    companyCount: 0,
    subscriptionStatus: "none",
    hasSubmittedFiling: false,
    dismissedAt: null,
    accountsFilingLive: true,
    ct600FilingLive: true,
    firstCompanyId: null,
    ...overrides,
  };
}

describe("getOnboardingState — step done conditions", () => {
  it("company step done only when companyCount > 0", () => {
    expect(getOnboardingState(base()).steps[0].done).toBe(false);
    expect(getOnboardingState(base({ companyCount: 1 })).steps[0].done).toBe(true);
  });

  it("plan step done for active or cancelling, not for none/past_due/cancelled", () => {
    const done = (s: OnboardingStateInput["subscriptionStatus"]) =>
      getOnboardingState(base({ subscriptionStatus: s })).steps[1].done;
    expect(done("active")).toBe(true);
    expect(done("cancelling")).toBe(true);
    expect(done("none")).toBe(false);
    expect(done("past_due")).toBe(false);
    expect(done("cancelled")).toBe(false);
  });

  it("file step done only when hasSubmittedFiling", () => {
    expect(getOnboardingState(base()).steps[2].done).toBe(false);
    expect(getOnboardingState(base({ hasSubmittedFiling: true })).steps[2].done).toBe(true);
  });
});

describe("getOnboardingState — activeStepKey", () => {
  it("is the first not-done, not-locked step", () => {
    expect(getOnboardingState(base()).activeStepKey).toBe("company");
    expect(getOnboardingState(base({ companyCount: 1 })).activeStepKey).toBe("plan");
    expect(
      getOnboardingState(base({ companyCount: 1, subscriptionStatus: "active" })).activeStepKey,
    ).toBe("file");
  });

  it("is null when all steps done", () => {
    expect(
      getOnboardingState(
        base({ companyCount: 1, subscriptionStatus: "active", hasSubmittedFiling: true }),
      ).activeStepKey,
    ).toBe(null);
  });

  it("is null when every not-done step is locked (pre-launch with company added)", () => {
    const s = getOnboardingState(
      base({ companyCount: 1, accountsFilingLive: false, ct600FilingLive: false }),
    );
    expect(s.activeStepKey).toBe(null);
    expect(s.visible).toBe(true);
    expect(s.steps[1].locked).toBe(true);
    expect(s.steps[2].locked).toBe(true);
  });
});

describe("getOnboardingState — complete & visible", () => {
  it("complete true when hasSubmittedFiling; visible false when complete", () => {
    const s = getOnboardingState(base({ hasSubmittedFiling: true }));
    expect(s.complete).toBe(true);
    expect(s.visible).toBe(false);
  });

  it("visible false when dismissedAt set and not complete", () => {
    const s = getOnboardingState(base({ dismissedAt: new Date() }));
    expect(s.visible).toBe(false);
    expect(s.complete).toBe(false);
  });

  it("complete overrides dismissed (complete true even if dismissedAt set)", () => {
    const s = getOnboardingState(base({ hasSubmittedFiling: true, dismissedAt: new Date() }));
    expect(s.complete).toBe(true);
    expect(s.visible).toBe(false);
  });

  it("visible true when not complete and not dismissed", () => {
    expect(getOnboardingState(base()).visible).toBe(true);
  });
});

describe("getOnboardingState — launch-flag matrix", () => {
  it("plan step locked + lockedNote when accounts filing not live", () => {
    const s = getOnboardingState(base({ accountsFilingLive: false }));
    expect(s.steps[1].locked).toBe(true);
    expect(s.steps[1].lockedNote).toBe("Opens soon — we'll email you.");
  });

  it("plan step unlocked, no lockedNote, when accounts filing live", () => {
    const s = getOnboardingState(base({ accountsFilingLive: true }));
    expect(s.steps[1].locked).toBe(false);
    expect(s.steps[1].lockedNote).toBeUndefined();
  });

  it("file step locked + lockedNote + no subLabel when neither path live", () => {
    const s = getOnboardingState(base({ accountsFilingLive: false, ct600FilingLive: false }));
    expect(s.steps[2].locked).toBe(true);
    expect(s.steps[2].subLabel).toBeUndefined();
    expect(s.steps[2].lockedNote).toBe(
      "Filing opens soon — we'll email you the moment it does.",
    );
  });

  it("file step subLabel: both paths live", () => {
    const s = getOnboardingState(base({ accountsFilingLive: true, ct600FilingLive: true }));
    expect(s.steps[2].locked).toBe(false);
    expect(s.steps[2].subLabel).toBe("Accounts or CT600 — whichever's due first.");
  });

  it("file step subLabel: accounts only", () => {
    const s = getOnboardingState(base({ accountsFilingLive: true, ct600FilingLive: false }));
    expect(s.steps[2].subLabel).toBe("File your dormant accounts.");
  });

  it("file step subLabel: CT600 only", () => {
    const s = getOnboardingState(base({ accountsFilingLive: false, ct600FilingLive: true }));
    expect(s.steps[2].subLabel).toBe("File your CT600.");
  });
});

describe("getOnboardingState — file step href", () => {
  it("links to company hub when firstCompanyId present", () => {
    expect(getOnboardingState(base({ firstCompanyId: "c1" })).steps[2].href).toBe(
      "/company/c1",
    );
  });

  it("falls back to /dashboard when firstCompanyId null", () => {
    expect(getOnboardingState(base()).steps[2].href).toBe("/dashboard");
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/onboarding.test.ts`
Expected: FAIL — cannot resolve `@/lib/onboarding` (module does not exist yet).

- [ ] **Step 3: Implement the pure helper**

Create `src/lib/onboarding.ts`:

```ts
import type { SubscriptionStatus } from "@prisma/client";

export type OnboardingStepKey = "company" | "plan" | "file";

export interface OnboardingStep {
  key: OnboardingStepKey;
  label: string;
  subLabel?: string;
  done: boolean;
  locked: boolean;
  lockedNote?: string;
  href: string;
}

export interface OnboardingStateInput {
  companyCount: number;
  subscriptionStatus: SubscriptionStatus;
  hasSubmittedFiling: boolean;
  dismissedAt: Date | null;
  accountsFilingLive: boolean;
  ct600FilingLive: boolean;
  firstCompanyId: string | null;
}

export interface OnboardingState {
  steps: OnboardingStep[];
  activeStepKey: OnboardingStepKey | null;
  complete: boolean;
  visible: boolean;
}

export function getOnboardingState(input: OnboardingStateInput): OnboardingState {
  const {
    companyCount,
    subscriptionStatus,
    hasSubmittedFiling,
    dismissedAt,
    accountsFilingLive,
    ct600FilingLive,
    firstCompanyId,
  } = input;

  const anyPathLive = accountsFilingLive || ct600FilingLive;

  let fileSubLabel: string | undefined;
  if (anyPathLive) {
    if (accountsFilingLive && ct600FilingLive) {
      fileSubLabel = "Accounts or CT600 — whichever's due first.";
    } else if (accountsFilingLive) {
      fileSubLabel = "File your dormant accounts.";
    } else {
      fileSubLabel = "File your CT600.";
    }
  }

  const planLocked = !accountsFilingLive;
  const fileLocked = !anyPathLive;

  const steps: OnboardingStep[] = [
    {
      key: "company",
      label: "Add your company",
      done: companyCount > 0,
      locked: false,
      href: "/onboarding",
    },
    {
      key: "plan",
      label: "Choose your plan",
      done: subscriptionStatus === "active" || subscriptionStatus === "cancelling",
      locked: planLocked,
      lockedNote: planLocked ? "Opens soon — we'll email you." : undefined,
      href: "/choose-plan",
    },
    {
      key: "file",
      label: "File your first return",
      subLabel: fileSubLabel,
      done: hasSubmittedFiling,
      locked: fileLocked,
      lockedNote: fileLocked
        ? "Filing opens soon — we'll email you the moment it does."
        : undefined,
      href: firstCompanyId ? `/company/${firstCompanyId}` : "/dashboard",
    },
  ];

  const complete = hasSubmittedFiling;
  const activeStep = steps.find((s) => !s.done && !s.locked);

  return {
    steps,
    activeStepKey: activeStep ? activeStep.key : null,
    complete,
    visible: !complete && dismissedAt == null,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/onboarding.test.ts`
Expected: PASS — all cases green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/onboarding.ts src/__tests__/lib/onboarding.test.ts
git commit -m "feat: getOnboardingState helper with launch-flag-aware steps"
```

---

## Task 3: `dismissOnboarding` server action (separate module)

**Why a separate file:** `@/lib/db` parses `process.env.POSTGRES_URL` with `new URL(...)` at module-eval time. Vitest has no `POSTGRES_URL` and no env setup, so *any* test that transitively imports `@/lib/db` throws `TypeError: Invalid URL` at import. Keeping the action out of `onboarding.ts` means the pure helper (Task 2) and its test never touch `@/lib/db`. This also keeps server-only deps out of the client bundle. (The spec was updated to pin this location.)

**Files:**
- Create: `src/lib/onboarding-actions.ts`

- [ ] **Step 1: Create the server-action module**

Create `src/lib/onboarding-actions.ts`:

```ts
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function dismissOnboarding(): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return;
  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingDismissedAt: new Date() },
  });
  revalidatePath("/dashboard");
}
```

File-level `"use server"` makes every export an action; this file exports only the action. The client `OnboardingChecklist` imports it; Next.js strips the server body from the client bundle.

- [ ] **Step 2: Verify the pure-helper tests still pass (no regression)**

Run: `npx vitest run src/__tests__/lib/onboarding.test.ts`
Expected: PASS — `onboarding.ts` is untouched and imports no DB module, so the suite is unaffected.

- [ ] **Step 3: Typecheck/lint**

Run: `npm run lint`
Expected: no errors for `src/lib/onboarding-actions.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/onboarding-actions.ts
git commit -m "feat: dismissOnboarding server action"
```

---

## Task 4: `OnboardingChecklist` client component (TDD)

**Files:**
- Modify: `src/app/globals.css` (add one keyframe)
- Test: `src/__tests__/components/OnboardingChecklist.test.tsx`
- Create: `src/components/OnboardingChecklist.tsx`

- [ ] **Step 1: Add the staggered-reveal keyframe**

Append to `src/app/globals.css` (do not modify existing rules):

```css
@keyframes onboarding-step-in {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 2: Write the failing render tests**

Create `src/__tests__/components/OnboardingChecklist.test.tsx`:

```tsx
/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import type { OnboardingState } from "@/lib/onboarding";

// Stub the server-action module so the test never loads @/lib/db
// (which throws at import without POSTGRES_URL). The OnboardingState
// import above is type-only and erased at runtime — @/lib/onboarding is
// pure, so it does not need mocking.
vi.mock("@/lib/onboarding-actions", () => ({ dismissOnboarding: vi.fn() }));

function state(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    steps: [
      { key: "company", label: "Add your company", done: true, locked: false, href: "/onboarding" },
      { key: "plan", label: "Choose your plan", done: false, locked: false, href: "/choose-plan" },
      {
        key: "file",
        label: "File your first return",
        subLabel: "Accounts or CT600 — whichever's due first.",
        done: false,
        locked: false,
        href: "/company/c1",
      },
    ],
    activeStepKey: "plan",
    complete: false,
    visible: true,
    ...overrides,
  };
}

describe("OnboardingChecklist", () => {
  it("renders nothing when not visible and not complete", () => {
    const { container } = render(
      <OnboardingChecklist state={state({ visible: false, complete: false })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders all step labels when visible", () => {
    render(<OnboardingChecklist state={state()} />);
    expect(screen.getByText("Add your company")).toBeInTheDocument();
    expect(screen.getByText("Choose your plan")).toBeInTheDocument();
    expect(screen.getByText("File your first return")).toBeInTheDocument();
  });

  it("shows the active step's CTA as a link to its href", () => {
    render(<OnboardingChecklist state={state()} />);
    const cta = screen.getByRole("link", { name: /continue/i });
    expect(cta).toHaveAttribute("href", "/choose-plan");
  });

  it("renders a locked step's note and no link for it", () => {
    render(
      <OnboardingChecklist
        state={state({
          steps: [
            { key: "company", label: "Add your company", done: true, locked: false, href: "/onboarding" },
            {
              key: "plan",
              label: "Choose your plan",
              done: false,
              locked: true,
              lockedNote: "Opens soon — we'll email you.",
              href: "/choose-plan",
            },
            {
              key: "file",
              label: "File your first return",
              done: false,
              locked: true,
              lockedNote: "Filing opens soon — we'll email you the moment it does.",
              href: "/dashboard",
            },
          ],
          activeStepKey: null,
        })}
      />,
    );
    expect(screen.getByText("Opens soon — we'll email you.")).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /choose your plan/i }),
    ).not.toBeInTheDocument();
  });

  it("renders the complete state with a soft pointer", () => {
    render(<OnboardingChecklist state={state({ complete: true, visible: false })} />);
    expect(screen.getByText(/you're set/i)).toBeInTheDocument();
  });

  it("has a Hide this control when visible", () => {
    render(<OnboardingChecklist state={state()} />);
    expect(screen.getByRole("button", { name: /hide this/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx vitest run src/__tests__/components/OnboardingChecklist.test.tsx`
Expected: FAIL — cannot resolve `@/components/OnboardingChecklist`.

- [ ] **Step 4: Implement the component**

Create `src/components/OnboardingChecklist.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Lock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { dismissOnboarding } from "@/lib/onboarding-actions";
import type { OnboardingState } from "@/lib/onboarding";

export default function OnboardingChecklist({ state }: { state: OnboardingState }) {
  const [hidden, setHidden] = useState(false);
  const [, startTransition] = useTransition();

  if (hidden) return null;
  if (!state.visible && !state.complete) return null;

  if (state.complete) {
    return (
      <section className="bg-card border border-border rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold text-foreground mb-1.5">You&apos;re set</h2>
        <p className="text-[15px] text-secondary leading-normal m-0">
          Your first return is in. Your other return — Accounts or CT600 — is on your
          company page whenever you&apos;re ready.
        </p>
      </section>
    );
  }

  function handleDismiss() {
    setHidden(true);
    startTransition(() => {
      void dismissOnboarding();
    });
  }

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground mb-1">
            Get your first filing done
          </h2>
          <p className="text-sm text-secondary m-0 leading-normal">
            Three quick steps. We handle the submission to HMRC and Companies House.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-muted hover:text-secondary transition-colors shrink-0"
        >
          Hide this
        </button>
      </div>

      <ol className="flex flex-col gap-3 m-0 p-0 list-none">
        {state.steps.map((step, i) => {
          const isActive = state.activeStepKey === step.key;
          const note = step.locked ? step.lockedNote : step.subLabel;
          return (
            <li
              key={step.key}
              className="flex items-center gap-4 motion-safe:[animation:onboarding-step-in_320ms_cubic-bezier(0.22,1,0.36,1)_both]"
              style={undefined}
              data-delay={i}
            >
              <span
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                  step.done
                    ? "bg-primary-bg text-primary"
                    : step.locked
                      ? "bg-inset text-muted"
                      : isActive
                        ? "bg-primary text-card"
                        : "bg-inset text-secondary",
                )}
              >
                {step.done ? (
                  <Check size={15} strokeWidth={2.5} />
                ) : step.locked ? (
                  <Lock size={13} strokeWidth={2.5} />
                ) : (
                  i + 1
                )}
              </span>

              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "text-[15px] font-semibold m-0",
                    step.done ? "text-secondary" : "text-foreground",
                  )}
                >
                  {step.label}
                </p>
                {note && (
                  <p className="text-[13px] text-muted m-0 mt-0.5 leading-normal">{note}</p>
                )}
              </div>

              {isActive && !step.locked && (
                <Link
                  href={step.href}
                  className="inline-flex items-center gap-1.5 bg-primary text-card py-2 px-4 rounded-lg font-semibold text-sm no-underline shrink-0"
                >
                  Continue
                  <ArrowRight size={15} strokeWidth={2.5} />
                </Link>
              )}
              {!isActive && !step.done && !step.locked && (
                <Link
                  href={step.href}
                  className="text-sm font-semibold text-primary no-underline shrink-0"
                >
                  Open
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
```

Per-step stagger: add the delay via a CSS attribute selector so no inline `style` is used (CLAUDE.md forbids inline styles). Append to `src/app/globals.css`:

```css
li[data-delay="0"] { animation-delay: 0ms; }
li[data-delay="1"] { animation-delay: 70ms; }
li[data-delay="2"] { animation-delay: 140ms; }
```

Then remove the unused `style={undefined}` attribute from the `<li>` in the component (it is a placeholder to make this instruction explicit — the final `<li>` should have only `key`, `className`, and `data-delay`).

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/__tests__/components/OnboardingChecklist.test.tsx`
Expected: PASS — all six cases green.

- [ ] **Step 6: Commit**

```bash
git add src/components/OnboardingChecklist.tsx src/__tests__/components/OnboardingChecklist.test.tsx src/app/globals.css
git commit -m "feat: OnboardingChecklist component with optimistic dismiss"
```

---

## Task 5: `FirstFilingNote` + company hub wiring

**Files:**
- Create: `src/components/FirstFilingNote.tsx`
- Modify: `src/app/(app)/company/[companyId]/page.tsx`

- [ ] **Step 1: Create the note component**

Create `src/components/FirstFilingNote.tsx`:

```tsx
import { ShieldCheck } from "lucide-react";

export default function FirstFilingNote() {
  return (
    <div className="flex items-start gap-2.5 px-4 py-3.5 bg-primary-bg border border-primary-border rounded-lg mb-6">
      <span className="text-primary shrink-0 mt-px flex">
        <ShieldCheck size={18} color="currentColor" strokeWidth={2} />
      </span>
      <p className="text-sm text-primary-text m-0 leading-normal">
        Your first filing takes about 10 minutes. It&apos;s a nil return — nothing is
        owed. We build it, you confirm, and we submit it directly to HMRC / Companies
        House. You&apos;ll get an email the moment it&apos;s accepted.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into the company hub**

In `src/app/(app)/company/[companyId]/page.tsx`:

Add to the imports near the top (alongside the other `@/components` imports):

```ts
import FirstFilingNote from "@/components/FirstFilingNote";
import { isFilingLive, isTaxFilingLive } from "@/lib/launch-mode";
```

After the `company` is loaded (the `if (!company) redirect("/dashboard");` guard around line 33), add:

```ts
  const hasSubmittedFiling = company.filings.some(
    (f) => f.status === "submitted" || f.status === "accepted",
  );
  const showFirstFilingNote =
    !hasSubmittedFiling && (isFilingLive() || isTaxFilingLive());
```

In the JSX, insert the note immediately **after** the ARD-change banner block (the `{company.ardChangeDetected && ... && ( <ArdMismatchBanner ... /> )}` block ending ~line 180) and **before** the `{/* Tab bar */}` `<div className="flex border-b border-border mb-6">`:

```tsx
      {showFirstFilingNote && <FirstFilingNote />}
```

- [ ] **Step 3: Lint and build**

Run: `npm run lint && npm run build`
Expected: clean — no type/lint errors; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/FirstFilingNote.tsx "src/app/(app)/company/[companyId]/page.tsx"
git commit -m "feat: one-time first-filing reassurance note on company hub"
```

---

## Task 6: Dashboard wiring (both return branches)

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Add imports**

In `src/app/(app)/dashboard/page.tsx`, the line `import { isFilingLive } from "@/lib/launch-mode";` already exists. Change it to:

```ts
import { isFilingLive, isTaxFilingLive } from "@/lib/launch-mode";
```

Add (alongside the other `@/` imports):

```ts
import { getOnboardingState } from "@/lib/onboarding";
import OnboardingChecklist from "@/components/OnboardingChecklist";
```

- [ ] **Step 2: Extend the existing `Promise.all` and compute state**

The current `Promise.all` destructures `[allCompanyCount, hasAcceptedFiling, existingReview]` (around line 60). **Do not** alter `hasAcceptedFiling`/`existingReview`/`showReviewPrompt` — they gate the unrelated review prompt. Add two members:

```ts
  const [
    allCompanyCount,
    hasAcceptedFiling,
    existingReview,
    hasSubmittedFilingRow,
    firstCompany,
  ] = await Promise.all([
    prisma.company.count({
      where: { userId: user.id, deletedAt: null },
    }),
    prisma.filing.findFirst({
      where: { company: { userId: user.id }, status: "accepted" },
      select: { id: true },
    }),
    prisma.review.findUnique({
      where: { userId: user.id },
      select: { id: true },
    }),
    prisma.filing.findFirst({
      where: {
        company: { userId: user.id },
        status: { in: ["submitted", "accepted"] },
      },
      select: { id: true },
    }),
    prisma.company.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);
```

Immediately after the existing `const showReviewPrompt = ...;` line, add a best-effort state computation (Section F — must never block the dashboard):

```ts
  let onboardingState: ReturnType<typeof getOnboardingState> | null = null;
  try {
    onboardingState = getOnboardingState({
      companyCount: allCompanyCount,
      subscriptionStatus: user.subscriptionStatus,
      hasSubmittedFiling: !!hasSubmittedFilingRow,
      dismissedAt: user.onboardingDismissedAt ?? null,
      accountsFilingLive: isFilingLive(),
      ct600FilingLive: isTaxFilingLive(),
      firstCompanyId: firstCompany?.id ?? null,
    });
  } catch {
    onboardingState = null;
  }
  const showOnboarding =
    !!onboardingState && (onboardingState.visible || onboardingState.complete);
```

- [ ] **Step 3: Render in the zero-company branch (replace the empty-state card)**

In the `if (allCompanyCount === 0) { return ( ... ) }` block: keep the `<SubscriptionBanner>` and the `Dashboard` `<h1>` header. Replace the empty-state card (the `<div className="text-center px-6 py-16 bg-card ...">…</div>` block, currently ~lines 91–109) with:

```tsx
        {showOnboarding && onboardingState ? (
          <OnboardingChecklist state={onboardingState} />
        ) : (
          <div className="text-center px-6 py-16 bg-card border border-border rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-primary-bg inline-flex items-center justify-center mb-4">
              <Building2 size={24} color="var(--color-primary)" strokeWidth={2} />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">No companies yet</h2>
            <p className="text-[15px] text-secondary mb-6 max-w-[400px] mx-auto leading-normal">
              Add your first company to get started with filing. You can explore the
              dashboard in the meantime.
            </p>
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 bg-primary text-card py-2.5 px-6 rounded-lg font-semibold text-sm no-underline"
            >
              <Plus size={16} strokeWidth={2.5} />
              Add your first company
            </Link>
          </div>
        )}
```

(The original card is preserved as the fallback for a user who dismissed the checklist while still having no companies.)

- [ ] **Step 4: Render in the populated branch**

In the main `return (` block (around line 210), immediately after `<SubscriptionBanner status={user.subscriptionStatus} />` and **before** `{showReviewPrompt && <ReviewPrompt />}`, add:

```tsx
      {showOnboarding && onboardingState && (
        <OnboardingChecklist state={onboardingState} />
      )}
```

- [ ] **Step 5: Lint and build**

Run: `npm run lint && npm run build`
Expected: clean; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx"
git commit -m "feat: render onboarding checklist on dashboard (both branches)"
```

---

## Task 7: Full verification & finish

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — entire suite green (baseline is fully green per project history; new tests included, no regressions).

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors or warnings introduced by the new files.

- [ ] **Step 3: Production build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 4: Manual smoke checklist (record results)**

Confirm by reasoning/inspection (and dev server if available, `npm run dev`):
- New user, 0 companies, both flags live → checklist is the dashboard hero, step 1 active.
- 1 company, no subscription, accounts flag live → step 2 active ("Continue" → `/choose-plan`).
- Pre-launch (`NEXT_PUBLIC_FILING_LIVE=false`, `NEXT_PUBLIC_TAX_FILING_LIVE=false`) with 1 company → checklist visible, steps 2–3 locked with notes, no active CTA.
- After first filing `submitted` → checklist shows "You're set", disappears on next load.
- "Hide this" → panel disappears; reload → still gone (`onboardingDismissedAt` set); a later submitted filing still flips `complete` correctly.
- Company hub with no submitted filing and a live path → `FirstFilingNote` shows; after submission it is gone.

- [ ] **Step 5: Final commit (only if Step 4 surfaced fixes)**

```bash
git add -A
git commit -m "fix: onboarding checklist verification fixes"
```

Report the exact output of Steps 1–3 (pass/fail counts) when claiming completion — see superpowers:verification-before-completion.

---

## Notes for the implementer

- **DRY:** `getOnboardingState` is the single source of truth for progress. The dashboard computes it once; the component is purely presentational.
- **YAGNI:** No analytics, no settings replay, no tour engine, no per-path submitted state — out of scope per spec.
- **Styling:** Tailwind tokens only, no inline `style`. `cn()` from `@/lib/cn`. No `border-left`/`border-right` accent stripes, no gradient text, no decorative glass — these are explicit bans.
- **Accessibility/motion:** the staggered reveal is wrapped in `motion-safe:` so `prefers-reduced-motion` users get no animation.
- **Module split is mandatory, not optional:** `getOnboardingState` lives in `src/lib/onboarding.ts` with only a type-only `@prisma/client` import (erased at runtime). The `dismissOnboarding` action lives in `src/lib/onboarding-actions.ts`. Never import `@/lib/db`, `next-auth`, or `next/cache` into `onboarding.ts` — doing so reintroduces the Vitest `POSTGRES_URL` import-time crash and regresses the green baseline.
- **Test-mock convention:** any test whose import graph would reach `@/lib/db` must `vi.mock` the offending module *before* importing the unit under test (see `src/__tests__/lib/auth-impersonation.test.ts` for the established pattern). Here, `OnboardingChecklist.test.tsx` stubs `@/lib/onboarding-actions`; `onboarding.test.ts` needs no mocks because `onboarding.ts` is pure.
