# CT600 Period Management Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically generate correct CT600 accounting periods (splitting >12-month periods of accounts into a 12-month CTAP + remainder) and give users a guided, validated way to manually create/edit/split CT600 periods.

**Architecture:** One shared pure helper (`generateCt600Ctaps`) + a pure validator (`validateCtapChain`) + a pure resync-protection predicate (`spanHasProtectedCt600`) in `src/lib/ctap.ts` become the single source of truth. All three CT600 generators (`materialiseFilings`, `company/update` enable-Corp-Tax, daily `cron/create-periods` Loop 2) are refactored onto them. A new validated `POST /api/company/ct600-periods` endpoint backs a "Manage periods" modal in the Corporation Tax tab. A new `Filing.ctapUserEdited` flag + the protection predicate stop regeneration from clobbering user edits or filed periods. A one-off backfill corrects existing rows.

**Tech Stack:** Next.js 16 (App Router, React 19), Prisma 7 / PostgreSQL, NextAuth v4, Vitest + @testing-library/react, Tailwind v4 (`cn()` from `@/lib/cn`).

**Spec:** `docs/superpowers/specs/2026-05-15-ct600-period-management-design.md`

Relevant skills: @superpowers:test-driven-development, @superpowers:verification-before-completion, @superpowers:subagent-driven-development

---

## Pre-flight

The working tree has uncommitted CT600 **engine** changes from a prior session (9 modified files + `prisma/migrations/20260515084730_add_filing_poll_endpoint/`). They are unrelated to this feature but already applied. **Do not revert them.** Stage files explicitly per task (never `git add -A`) so engine changes and this feature stay in separate commits. Recommend implementing on a dedicated branch/worktree off `main`.

Commands: `npm test` (vitest run), `npm run lint`, `npx prisma migrate dev`, `npx tsx scripts/<name>.ts`.

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `src/lib/ctap.ts` | `computeCtaps` (existing, unchanged) + new `generateCt600Ctaps`, `validateCtapChain`, `spanHasProtectedCt600` | Modify |
| `src/lib/utils.ts` | `calculateCT600Deadline` — **unchanged** (only callers change) | None |
| `prisma/schema.prisma` | `Filing.ctapUserEdited Boolean @default(false)` | Modify + migration |
| `src/lib/companies-house/materialise-filings.ts` | CT600 generator #1 → use helpers | Modify |
| `src/app/api/company/update/route.ts` | CT600 generator #2 (enable Corp Tax) → use helpers | Modify |
| `src/app/api/cron/create-periods/route.ts` | CT600 generator #3 (Loop 2) → use helpers; fix stale docstring | Modify |
| `src/app/api/company/ct600-periods/route.ts` | New validated transactional replace endpoint | Create |
| `src/components/ct600-period-editor.tsx` | "Manage periods" modal (client) | Create |
| `src/components/corp-tax-tab.tsx` | Mount the "Manage periods" button + modal | Modify |
| `scripts/backfill-ct600-ctaps.ts` | One-off idempotent backfill | Create |
| `src/__tests__/lib/ctap.test.ts` | Unit tests for the three pure helpers | **Modify (append — file already exists with computeCtaps/getNextCtapStart suites; never overwrite)** |
| `src/__tests__/api/ct600-periods.test.ts` | Route contract tests | Create |

---

## Task 1: Schema field + migration

**Files:** Modify `prisma/schema.prisma`; generates `prisma/migrations/<ts>_add_filing_ctap_user_edited/`

- [ ] **Step 1: Add the field.** In `prisma/schema.prisma`, in `model Filing`, directly after the `pollEndpoint String?` line add:

```prisma
  ctapUserEdited   Boolean      @default(false)
```

- [ ] **Step 2: Create & apply migration**

Run: `npx prisma migrate dev --name add_filing_ctap_user_edited`
Expected: "Your database is now in sync with your schema." and a new `prisma/migrations/<ts>_add_filing_ctap_user_edited/migration.sql`.

- [ ] **Step 3: Regenerate client & sanity-check**

Run: `npx prisma generate`
Expected: success. Then `npx tsc --noEmit -p tsconfig.json 2>&1 | grep ctapUserEdited || echo "type OK"` → `type OK`.

- [ ] **Step 4: Commit**

```bash
# Stage ONLY the new migration dir by its actual generated name — NOT
# `prisma/migrations/` wholesale, which would also stage the pre-existing
# untracked 20260515084730_add_filing_poll_endpoint/ from the prior session.
git add prisma/schema.prisma "prisma/migrations/$(ls -d prisma/migrations/*add_filing_ctap_user_edited)"
git commit -m "feat: add Filing.ctapUserEdited for CT600 period protection"
```

---

## Task 2: `generateCt600Ctaps` shared helper (TDD)

**Files:** Test `src/__tests__/lib/ctap.test.ts`; Modify `src/lib/ctap.ts`

- [ ] **Step 1: Write failing tests.** `src/__tests__/lib/ctap.test.ts` **already exists** (75 lines: `computeCtaps`/`getNextCtapStart` suites). Do **NOT** overwrite/recreate it. Add `generateCt600Ctaps` to the existing `@/lib/ctap` import, add `import { calculateCT600Deadline } from "@/lib/utils";` if absent, add the `d()` helper if absent, then **append** this new `describe` block to the end of the file:

```ts
// add to existing imports: import { generateCt600Ctaps } from "@/lib/ctap";
// add if absent: import { calculateCT600Deadline } from "@/lib/utils";
// add if absent: const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("generateCt600Ctaps", () => {
  it("splits the Anouar >12-month first period into two CTAPs sharing one deadline", () => {
    const out = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: null,
    });
    expect(out.map((c) => [c.start.toISOString().slice(0, 10), c.end.toISOString().slice(0, 10)]))
      .toEqual([
        ["2024-02-07", "2025-02-06"],
        ["2025-02-07", "2025-02-28"],
      ]);
    const shared = calculateCT600Deadline(d("2025-02-28")).getTime();
    expect(out.every((c) => c.deadline.getTime() === shared)).toBe(true);
  });

  it("returns a single CTAP for a <=12-month period", () => {
    const out = generateCt600Ctaps({
      accountsPeriodStart: d("2024-04-01"),
      accountsPeriodEnd: d("2025-03-31"),
      anchor: null,
    });
    expect(out).toHaveLength(1);
    expect(out[0].start.toISOString().slice(0, 10)).toBe("2024-04-01");
    expect(out[0].end.toISOString().slice(0, 10)).toBe("2025-03-31");
  });

  it("honours an explicit anchor later than the accounts start", () => {
    const out = generateCt600Ctaps({
      accountsPeriodStart: d("2024-02-07"),
      accountsPeriodEnd: d("2025-02-28"),
      anchor: d("2024-06-01"),
    });
    expect(out[0].start.toISOString().slice(0, 10)).toBe("2024-06-01");
    expect(out[out.length - 1].end.toISOString().slice(0, 10)).toBe("2025-02-28");
  });
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npx vitest run src/__tests__/lib/ctap.test.ts`
Expected: FAIL — `generateCt600Ctaps` is not exported.

- [ ] **Step 3: Implement.** Append to `src/lib/ctap.ts`:

```ts
import { calculateCT600Deadline } from "@/lib/utils";

export interface Ct600Ctap {
  start: Date;
  end: Date;
  deadline: Date;
}

/**
 * Single source of truth for CT600 CTAP generation. Wraps computeCtaps
 * (12-month chunks + short final remainder) and stamps every CTAP in the
 * period of accounts with the SAME filing deadline (12 months after the
 * period-of-accounts end — never the CTAP end).
 */
export function generateCt600Ctaps(input: {
  accountsPeriodStart: Date;
  accountsPeriodEnd: Date;
  anchor: Date | null;
}): Ct600Ctap[] {
  const { accountsPeriodStart, accountsPeriodEnd, anchor } = input;
  const start = anchor ?? accountsPeriodStart;
  if (start.getTime() > accountsPeriodEnd.getTime()) return [];
  const deadline = calculateCT600Deadline(accountsPeriodEnd);
  return computeCtaps(start, accountsPeriodEnd).map((r) => ({
    start: r.start,
    // computeCtaps' final chunk may run past the accounts end — clamp it.
    end: r.end.getTime() > accountsPeriodEnd.getTime() ? new Date(accountsPeriodEnd) : r.end,
    deadline: new Date(deadline),
  }));
}
```

> Note: `computeCtaps(start, upToDate)` loops `while (start < upToDate)` producing 12-month chunks; the last chunk's end can exceed `upToDate`, hence the clamp so the final CTAP ends exactly on the period-of-accounts end (`2025-02-28` in the Anouar case).

- [ ] **Step 4: Run, verify pass**

Run: `npx vitest run src/__tests__/lib/ctap.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ctap.ts src/__tests__/lib/ctap.test.ts
git commit -m "feat: add generateCt600Ctaps shared CTAP helper"
```

---

## Task 3: `validateCtapChain` + `spanHasProtectedCt600` (TDD)

**Files:** Modify `src/lib/ctap.ts`; extend `src/__tests__/lib/ctap.test.ts`

- [ ] **Step 1: Add failing tests** to `src/__tests__/lib/ctap.test.ts`:

```ts
import { validateCtapChain, spanHasProtectedCt600 } from "@/lib/ctap";

describe("validateCtapChain", () => {
  const base = { accountsPeriodStart: d("2024-02-07"), accountsPeriodEnd: d("2025-02-28") };
  it("accepts a correct contiguous split", () => {
    expect(validateCtapChain({
      ...base,
      periods: [
        { start: d("2024-02-07"), end: d("2025-02-06") },
        { start: d("2025-02-07"), end: d("2025-02-28") },
      ],
    })).toEqual([]);
  });
  it("rejects a CTAP longer than 12 months", () => {
    const errs = validateCtapChain({ ...base, periods: [{ start: d("2024-02-07"), end: d("2025-02-28") }] });
    expect(errs.join(" ")).toMatch(/12 months/i);
  });
  it("rejects gaps and non-spanning chains", () => {
    expect(validateCtapChain({ ...base, periods: [
      { start: d("2024-02-07"), end: d("2024-12-31") },
      { start: d("2025-02-07"), end: d("2025-02-28") },
    ] }).length).toBeGreaterThan(0);
  });
});

describe("spanHasProtectedCt600", () => {
  const span = { accountsPeriodStart: d("2024-02-07"), accountsPeriodEnd: d("2025-02-28") };
  const mk = (status: string, ctapUserEdited = false, ps = "2024-02-07", pe = "2025-02-06") =>
    ({ status, ctapUserEdited, periodStart: d(ps), periodEnd: d(pe) }) as never;
  it("is true when an in-span CT600 is submitted/accepted/etc", () => {
    expect(spanHasProtectedCt600(span, [mk("submitted")])).toBe(true);
    expect(spanHasProtectedCt600(span, [mk("filed_elsewhere")])).toBe(true);
  });
  it("is true when an in-span CT600 is user-edited", () => {
    expect(spanHasProtectedCt600(span, [mk("outstanding", true)])).toBe(true);
  });
  it("is false when only system-generated outstanding rows are in span", () => {
    expect(spanHasProtectedCt600(span, [mk("outstanding", false)])).toBe(false);
  });
});
```

- [ ] **Step 2: Run, verify fail.** `npx vitest run src/__tests__/lib/ctap.test.ts` → FAIL (not exported).

- [ ] **Step 3: Implement.** Append to `src/lib/ctap.ts`:

```ts
export function validateCtapChain(input: {
  accountsPeriodStart: Date;
  accountsPeriodEnd: Date;
  periods: { start: Date; end: Date }[];
}): string[] {
  const { accountsPeriodStart, accountsPeriodEnd, periods } = input;
  const errs: string[] = [];
  if (periods.length === 0) return ["At least one period is required."];
  const sorted = [...periods].sort((a, b) => a.start.getTime() - b.start.getTime());
  if (sorted[0].start.getTime() !== accountsPeriodStart.getTime())
    errs.push("The first period must start on the period-of-accounts start date.");
  if (sorted[sorted.length - 1].end.getTime() !== accountsPeriodEnd.getTime())
    errs.push("The last period must end on the period-of-accounts end date.");
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    if (p.end.getTime() < p.start.getTime()) errs.push(`Period ${i + 1}: end is before start.`);
    const max = new Date(p.start);
    max.setUTCFullYear(max.getUTCFullYear() + 1);
    max.setUTCDate(max.getUTCDate() - 1);
    if (p.end.getTime() > max.getTime())
      errs.push(`Period ${i + 1}: a CT accounting period cannot exceed 12 months.`);
    if (i > 0) {
      const prevEndPlus1 = new Date(sorted[i - 1].end);
      prevEndPlus1.setUTCDate(prevEndPlus1.getUTCDate() + 1);
      if (p.start.getTime() !== prevEndPlus1.getTime())
        errs.push(`Period ${i + 1}: must start the day after the previous period ends (no gaps or overlaps).`);
    }
  }
  return errs;
}

const PROTECTED_STATUSES = new Set([
  "submitted", "accepted", "rejected", "failed", "filed_elsewhere",
]);

/** True if a generator must NOT (re)generate CT600s for this accounts span. */
export function spanHasProtectedCt600(
  span: { accountsPeriodStart: Date; accountsPeriodEnd: Date },
  ct600Filings: { status: string; ctapUserEdited: boolean; periodStart: Date; periodEnd: Date }[],
): boolean {
  return ct600Filings.some((f) => {
    const inSpan =
      f.periodStart.getTime() >= span.accountsPeriodStart.getTime() &&
      f.periodEnd.getTime() <= span.accountsPeriodEnd.getTime();
    return inSpan && (PROTECTED_STATUSES.has(f.status) || f.ctapUserEdited);
  });
}
```

- [ ] **Step 4: Run, verify pass.** `npx vitest run src/__tests__/lib/ctap.test.ts` → PASS (all).

- [ ] **Step 5: Commit**

```bash
git add src/lib/ctap.ts src/__tests__/lib/ctap.test.ts
git commit -m "feat: add CTAP chain validator and resync-protection predicate"
```

---

## Task 4: Refactor generator #1 — `materialiseFilings` (TDD)

**Files:** Modify `src/lib/companies-house/materialise-filings.ts`; Test `src/__tests__/lib/materialise-filings.test.ts`

> **Decision (resolves a reviewer-flagged behaviour question — keep this scope-tight):**
> Today CT600 is generated only when `registeredForCorpTax && !isFiled`, where `isFiled`
> means the *accounts* period was filed at Companies House (gap detection). **Retain
> `!isFiled`.** This feature changes *how generated periods are shaped* (split), not
> *which* periods get a CT600. Whether a CH-filed historical period should still surface
> a CT600 is a separate product question, explicitly **out of scope** here. New gate:
> `registeredForCorpTax && !isFiled && !spanHasProtectedCt600(span, existingCt600s)`.

> **Pure-helper contract (so it is unit-testable without Prisma):** extract
> `buildCt600FilingData({ registeredForCorpTax, ctapStartDate, accountsPeriods, existingCt600s }): FilingData[]`
> where `accountsPeriods: { start: Date; end: Date; isFiled: boolean }[]` and
> `existingCt600s: { status; ctapUserEdited; periodStart; periodEnd }[]`. This helper is
> **pure (no Prisma import)**. `materialiseFilings` loads `existingCt600s` via
> `prisma.filing.findMany({ where: { companyId, filingType: "ct600" } })`, builds the
> `accountsPeriods` list it already iterates, calls the helper, and `createMany`s.

- [ ] **Step 1: Failing test** — create `src/__tests__/lib/materialise-filings.test.ts` exercising the pure `buildCt600FilingData` helper: (a) first accounts period `2024-02-07 → 2025-02-28`, `isFiled:false`, no existing CT600 → exactly the two CTAPs from `generateCt600Ctaps` with the shared deadline, `ctapUserEdited:false`; (b) a span containing a `submitted` CT600 → no CT600 rows for that span; (c) an accounts period with `isFiled:true` → no CT600 rows (behaviour retained).

- [ ] **Step 2: Run, verify fail.** `npx vitest run src/__tests__/lib/materialise-filings.test.ts` → FAIL (helper not exported).

- [ ] **Step 3: Implement.** Add `import { generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";`. Add and export the pure `buildCt600FilingData` per the contract above: for each accounts period, when `registeredForCorpTax && !isFiled && !spanHasProtectedCt600({accountsPeriodStart:start,accountsPeriodEnd:end}, existingCt600s)`, push one `ct600` `FilingData` per `generateCt600Ctaps({ accountsPeriodStart:start, accountsPeriodEnd:end, anchor: ctapStartDate ?? null })` with `periodStart/periodEnd/startDate/endDate` = CTAP bounds, `deadline` = CTAP deadline, `status:"outstanding"`, `ctapUserEdited:false`. Replace the inline CT600 block (~L98–110) so `materialiseFilings` instead: collects its accounts periods, loads `existingCt600s`, calls `buildCt600FilingData`, and pushes the result into `filingData`. The `accounts` block and `createMany({ skipDuplicates: true })` are unchanged.

- [ ] **Step 4: Run, verify pass.** `npx vitest run src/__tests__/lib/materialise-filings.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/companies-house/materialise-filings.ts src/__tests__/lib/materialise-filings.test.ts
git commit -m "feat: materialiseFilings generates correct split CT600 CTAPs"
```

---

## Task 5: Refactor generator #2 — `company/update` enable-Corp-Tax (TDD)

**Files:** Modify `src/app/api/company/update/route.ts` (~L98–136: `periodsNeedingCt600` map + the surrounding `$transaction`/`createMany`); Test `src/__tests__/api/company-update-ct600.test.ts`

- [ ] **Step 1: Failing test** — assert that enabling Corp Tax on a company whose accounts period is `2024-02-07 → 2025-02-28` creates **two** outstanding CT600 rows (the split) sharing the deadline, and creates none for a span already containing a protected CT600.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement.** Replace the `periodsNeedingCt600.map(...)` body so each accounts period that needs CT600 expands via `generateCt600Ctaps({ accountsPeriodStart: f.periodStart, accountsPeriodEnd: f.periodEnd, anchor: ctapStartDate ?? null })` into one row per CTAP (drop the `ctapEnd = f.periodEnd` / `calculateCT600Deadline(ctapEnd)` logic). **Preserve the existing `suppressedAt: f.suppressedAt` passthrough** — carry the source accounts filing's `suppressedAt` onto every generated CTAP row so suppression isn't silently regressed. Before expanding, skip spans where `spanHasProtectedCt600` is true (load the company's existing CT600 filings). Keep the existing `$transaction`/`createMany`.
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** `git add src/app/api/company/update/route.ts src/__tests__/api/company-update-ct600.test.ts && git commit -m "feat: enable-Corp-Tax path generates split CT600 CTAPs"`

---

## Task 6: Refactor generator #3 — daily cron `create-periods` Loop 2 (TDD)

**Files:** Modify `src/app/api/cron/create-periods/route.ts` (Loop 2, ~L90–140); Test `src/__tests__/api/cron-create-periods-ct600.test.ts`

- [ ] **Step 1: Failing test** — assert: (a) Loop 2 produces split CTAPs with the shared deadline via the helper; (b) **no resurrection** — for a span containing a `ctapUserEdited=true` CT600, the cron creates no CT600 rows for that span; (c) **a different, unprotected later span still generates** (the per-span guard must not halt the loop or suppress other spans — the cron still advances correctly for spans with no protected/edited CT600).
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement.** Replace Loop 2's manual `while` chunk + per-CTAP `calculateCT600Deadline(ctapEnd)` with `generateCt600Ctaps({ accountsPeriodStart, accountsPeriodEnd, anchor: getNextCtapStart(latestCt600EndDate, company.ctapStartDate) })`; gate the whole span on `!spanHasProtectedCt600(span, existingCt600s)`; keep the `upsert` (still keyed on `(companyId, periodStart, periodEnd, filingType)`). Correct the stale docstring at the top of the file (remove `periodId`/`Period` model references — no longer in schema).
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Commit** `git add src/app/api/cron/create-periods/route.ts src/__tests__/api/cron-create-periods-ct600.test.ts && git commit -m "feat: cron create-periods uses shared CTAP helper + resync guard"`

---

## Task 7: `POST /api/company/ct600-periods` endpoint (TDD)

**Files:** Create `src/app/api/company/ct600-periods/route.ts`; Test `src/__tests__/api/ct600-periods.test.ts`

> **Note (intentional supersede of spec §4):** the request body adds
> `accountsPeriodStartISO` in addition to the spec's `{ companyId,
> accountsPeriodEndISO, periods }`. `validateCtapChain` genuinely needs the accounts
> *start* to enforce "first CTAP start = accounts start". Task 8's modal sends it too —
> the plan is internally consistent; treat this as the authoritative payload, not a
> spec mistake to "fix back".

- [ ] **Step 1: Failing tests** — mock `getServerSession` and `prisma` (mirror `src/__tests__` patterns). Cover: 401 no session; 404/403 not owner; 400 when `validateCtapChain` returns errors (>12mo, gap, overlap, not spanning); success replaces editable CT600s for the accounts span with the submitted CTAPs, sets `ctapUserEdited=true`, recomputes `deadline = calculateCT600Deadline(accountsPeriodEnd)`, leaves `submitted/accepted/filed_elsewhere` rows untouched; concurrent-immutable → 409 "already filed — reopen to refresh".
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement** the route:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateCtapChain } from "@/lib/ctap";
import { calculateCT600Deadline } from "@/lib/utils";

const IMMUTABLE = new Set(["submitted", "accepted", "filed_elsewhere"]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { companyId?: string; accountsPeriodStartISO?: string; accountsPeriodEndISO?: string;
    periods?: { startISO: string; endISO: string }[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const { companyId, accountsPeriodStartISO, accountsPeriodEndISO, periods } = body;
  if (!companyId || !accountsPeriodStartISO || !accountsPeriodEndISO || !Array.isArray(periods))
    return NextResponse.json({ error: "companyId, accounts period and periods are required" }, { status: 400 });

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
    include: { filings: { where: { filingType: "ct600" } } },
  });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const accountsPeriodStart = new Date(accountsPeriodStartISO);
  const accountsPeriodEnd = new Date(accountsPeriodEndISO);
  const parsed = periods.map((p) => ({ start: new Date(p.startISO), end: new Date(p.endISO) }));
  if ([accountsPeriodStart, accountsPeriodEnd, ...parsed.flatMap((p) => [p.start, p.end])]
        .some((x) => isNaN(x.getTime())))
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });

  const errors = validateCtapChain({ accountsPeriodStart, accountsPeriodEnd, periods: parsed });
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const inSpan = (f: { periodStart: Date; periodEnd: Date }) =>
    f.periodStart.getTime() >= accountsPeriodStart.getTime() &&
    f.periodEnd.getTime() <= accountsPeriodEnd.getTime();
  const spanFilings = company.filings.filter(inSpan);
  if (spanFilings.some((f) => IMMUTABLE.has(f.status)))
    return NextResponse.json(
      { error: "A period in this span has already been filed. Reopen to refresh." },
      { status: 409 },
    );

  const deadline = calculateCT600Deadline(accountsPeriodEnd);
  const editableIds = spanFilings.filter((f) => !IMMUTABLE.has(f.status)).map((f) => f.id);

  await prisma.$transaction([
    prisma.filing.deleteMany({ where: { id: { in: editableIds } } }),
    prisma.filing.createMany({
      data: parsed.map((p) => ({
        companyId, filingType: "ct600" as const,
        periodStart: p.start, periodEnd: p.end, startDate: p.start, endDate: p.end,
        status: "outstanding" as const, deadline, ctapUserEdited: true,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true, count: parsed.length });
}
```

- [ ] **Step 4: Run, verify pass.** `npx vitest run src/__tests__/api/ct600-periods.test.ts` → PASS.
- [ ] **Step 5: Commit** `git add src/app/api/company/ct600-periods/route.ts src/__tests__/api/ct600-periods.test.ts && git commit -m "feat: add validated CT600 period replace endpoint"`

---

## Task 8: "Manage periods" modal + entry (component)

**Files:** Create `src/components/ct600-period-editor.tsx`; Modify `src/components/corp-tax-tab.tsx`

- [ ] **Step 1: Component test (failing)** — `src/__tests__/components/ct600-period-editor.test.tsx` using @testing-library/react: renders the suggested chain from props, shows a validation error when a row is edited to exceed 12 months (calls the real `validateCtapChain`), disables Save while invalid, calls `fetch` to `/api/company/ct600-periods` with the expected body on Save.
- [ ] **Step 2: Run, verify fail.**
- [ ] **Step 3: Implement `ct600-period-editor.tsx`** — a `"use client"` modal. Props: `companyId`, `accountsPeriodStartISO`, `accountsPeriodEndISO`, `suggested: {startISO,endISO}[]`, `immutable: {startISO,endISO,status}[]`. State = editable rows (init from `suggested`). Render: read-only period-of-accounts header + the >12-month explainer; immutable rows read-only; editable rows with date `<input type="date">`, **Split**, delete (×); **+ Add period**; live `validateCtapChain` summary; **Reset to suggested**; Cancel / Save (disabled until `validateCtapChain(...) === []`). Save → `POST /api/company/ct600-periods`, on `ok` `router.refresh()`, on non-OK show `data.error`. Tailwind only, reuse `cn()` and existing button classes from `corp-tax-tab.tsx` (no inline styles per CLAUDE.md).
- [ ] **Step 4: Run, verify pass.**
- [ ] **Step 5: Wire entry.** In `src/components/corp-tax-tab.tsx`, add a "Manage periods" button in the Outstanding sub-tab header area (next to the sub-tab bar, ~L66–103), opening `<Ct600PeriodEditor/>` (state `const [editing,setEditing]=useState(false)`). Thread props from `src/app/(app)/company/[companyId]/page.tsx` (server component, already loads `company.filings`): compute the suggestion server-side via `generateCt600Ctaps` so modal and server agree. Add these **exact** props to `CorpTaxTabProps` (and pass them straight through to `Ct600PeriodEditor`), matching the modal Props in Step 3 and the endpoint payload in Task 7:
  - `accountsPeriodStartISO: string`
  - `accountsPeriodEndISO: string`
  - `suggested: { startISO: string; endISO: string }[]`  (from `generateCt600Ctaps`, mapped to ISO)
  - `immutable: { startISO: string; endISO: string; status: string }[]`
  These names must be identical across page → `CorpTaxTab` → `Ct600PeriodEditor` → fetch body so there is no rework.
- [ ] **Step 6: Run full suite + lint.** `npm test` (expect no new failures vs. baseline) and `npm run lint` (expect clean for all created/modified files).
- [ ] **Step 7: Commit** `git add src/components/ct600-period-editor.tsx src/components/corp-tax-tab.tsx "src/app/(app)/company/[companyId]/page.tsx" src/__tests__/components/ct600-period-editor.test.tsx && git commit -m "feat: add Manage CT600 periods modal"`

---

## Task 9: One-off backfill script

**Files:** Create `scripts/backfill-ct600-ctaps.ts`

> **DB-access pattern (pick one — don't mix the two mirrors):** use the
> `scripts/grant-test-subscription.ts` pattern — `dotenv.config()` then
> `const { prisma } = await import("../src/lib/db")` (dynamic import *after* dotenv so
> `POSTGRES_URL` is loaded). Do **not** use `migrate-materialise-periods.ts`'s
> standalone `new PrismaClient()/PrismaPg` style; that script is only a structural
> reference for the per-company loop, not the DB-client approach.

- [ ] **Step 1: Implement.** Loads dotenv then dynamically imports `../src/lib/db`. For every company with `registeredForCorpTax`, per accounts period: if `!spanHasProtectedCt600(span, existingCt600s)`, in a `$transaction` delete the system-generated `outstanding` (`ctapUserEdited=false`) CT600s in span and `createMany` the `generateCt600Ctaps` result (`ctapUserEdited:false`, `status:"outstanding"`). Idempotent (deterministic). Print a per-company summary. Support `--dry-run`.
- [ ] **Step 2: Unit-test the per-company pure function** (extract `planBackfill(company, accountsPeriods, existingCt600s)` returning `{deleteIds, create[]}`): test idempotency (running on already-correct data yields empty plan) and protection (span with `ctapUserEdited`/submitted → no changes). `src/__tests__/lib/backfill-ct600.test.ts`.
- [ ] **Step 3: Run tests, verify pass.**
- [ ] **Step 4: Dry-run locally.** `npx tsx scripts/backfill-ct600-ctaps.ts --dry-run` → prints planned changes, makes none.
- [ ] **Step 5: Commit** `git add scripts/backfill-ct600-ctaps.ts src/__tests__/lib/backfill-ct600.test.ts && git commit -m "feat: add one-off CT600 CTAP backfill script"`

---

## Task 10: End-to-end verification (manual, headed Chrome)

**Files:** none (verification only). Use @superpowers:verification-before-completion.

- [ ] **Step 1:** Reset/resync the existing test company (`COMPANY 72396394 LIMITED`, user `ct600-test@example.com`) so a >12-month accounts period exists, run `npx tsx scripts/backfill-ct600-ctaps.ts`, and confirm in the DB that the long period now has **two** outstanding CT600 rows sharing one deadline.
- [ ] **Step 2:** Headed Chrome (superpowers-chrome:browsing): log in → company → Corporation Tax tab → confirm two correct CT600 cards auto-appear.
- [ ] **Step 3:** Open **Manage periods**, verify the suggested split, make an invalid edit (confirm Save disabled + message), **Reset to suggested**, Save; confirm `router.refresh()` shows the corrected cards and DB rows have `ctapUserEdited=true`.
- [ ] **Step 4:** Trigger the daily cron locally (`curl -H "authorization: Bearer $CRON_SECRET" .../api/cron/create-periods`) and confirm it does **not** resurrect a pre-edit CTAP.
- [ ] **Step 5:** File one CTAP end-to-end against HMRC test (reuse the prior session's flow) → expect `submitted` + CorrelationID.
- [ ] **Step 6:** Regression: `npm test` (same pre-existing failures only, no new), `npm run lint` clean. Record results before claiming done.

---

## Done criteria

- All three generators delegate to `generateCt600Ctaps`; the Anouar case produces two correct CTAPs everywhere.
- Manual modal creates/edits/splits within enforced rules; server revalidates; immutable/edited periods protected; cron cannot resurrect pre-edit CTAPs.
- Backfill idempotent; full suite has no new failures; lint clean; E2E walkthrough passes.
