# CT600 Manual-Only Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CT600 (Corporation Tax) entirely user-driven — no auto-detection or auto-generation of CTAP periods; the user enters/confirms the period (or split periods) manually and only then can attempt a filing.

**Architecture:** Remove all three CT600 auto-generators (the daily `create-periods` cron Loop 2, the `update/route.ts` enable-Corp-Tax flow, and `materialise-filings.ts`). Re-seed the existing manual period editor from the company's *accounts period* (instead of from a pre-existing CT600 chain) so it can create a chain from scratch. Gate the Corporation Tax tab on UTR presence (UTR becomes the single user-facing switch; `registeredForCorpTax` is kept as an internal mirror so downstream consumers keep working). A one-off migration clears existing unconfirmed auto-generated CT600 rows.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 / PostgreSQL, Vitest (mocked Prisma via `vi.mock("@/lib/db")`), Tailwind v4.

---

## Background & Design Decisions (the "spec")

**Why:** The system cannot proactively or accurately detect missing CT600s — the reminders cron is `filingType:"accounts"`-only ([reminders/route.ts:83](../../../src/app/api/cron/reminders/route.ts#L83)), `create-periods` Loop 1 skips companies with no filing chain (`if (!latestPeriodEnd) continue`), and CT600 CTAPs are derived purely from local accounts spans with no HMRC reconciliation. Getting CT600 period boundaries wrong carries user penalties, so the user must be the source of truth.

**Confirmed requirements (Ben, 2026-05-16):**

1. **UTR is the single switch.** No UTR on the company ⇒ the Corporation Tax tab is not accessible at all. UTR can be added any time after company creation (existing path: Settings tab → "Enable CT600").
2. **CT600 is fully manual.** No auto-suggestion / auto-generation. The manual period editor becomes the *sole* path that creates CT600 `Filing` rows.
3. **`registeredForCorpTax` ceases to be the user-facing gate; UTR-on-`Company` is.** Decision: keep `registeredForCorpTax` in the DB as an internal mirror (`registeredForCorpTax === (uniqueTaxReference != null)` is already maintained by every UTR write path — see "Invariant" below). UI gates strictly on `uniqueTaxReference`. This avoids a wide refactor of downstream consumers ([`/api/file/submit:126-131`](../../../src/app/api/file/submit/route.ts#L126), [`dashboard-filters.matchesNeedsAttention`](../../../src/lib/dashboard-filters.ts#L31)) while honouring "UTR is the source of truth".
4. **Clear existing unconfirmed auto-generated CT600 rows** — but never touch CT600s that are submitted/accepted/rejected/failed/filed_elsewhere (real filing history) or `ctapUserEdited:true` (user edits). Concretely: delete `Filing WHERE filingType='ct600' AND status='outstanding' AND ctapUserEdited=false`.

**Invariant (already holds — verify, don't rebuild):** Every path that writes `uniqueTaxReference` also sets `registeredForCorpTax` consistently:
- Create ([api/company/route.ts:257](../../../src/app/api/company/route.ts#L257)) — sets both from the form.
- Enable ([update/route.ts:64-151](../../../src/app/api/company/update/route.ts#L64-L151) Case 3) — sets `registeredForCorpTax:true` + UTR.
- Disable ([update/route.ts:37-49](../../../src/app/api/company/update/route.ts#L37-L49) Case 1) — clears both.
- UTR update ([update/route.ts:52-61](../../../src/app/api/company/update/route.ts#L52-L61) Case 2) — company already registered.

So gating UI on `uniqueTaxReference` is equivalent to gating on `registeredForCorpTax`, but matches the requirement literally and is robust to drift.

**Out of scope:** Accounts (Companies House) detection/reminders are unchanged. Multi-accounts-period CT600 management UI (managing several spans at once) — the editor manages one accounts span at a time, as today; the user repeats per period. The `company-form.tsx` add-company UTR field is functionally unchanged (no CT600 is generated downstream once generators are removed).

**Key architectural insight:** `Ct600PeriodEditor` is opened from `corp-tax-tab.tsx` only when `canManagePeriods` (props `accountsPeriodStartISO/EndISO/suggested/immutable` all present). Those props are computed in `page.tsx` from a pre-existing `targetCt600` filing. With auto-generation gone there is no `targetCt600` for a fresh company, so the derivation **must be re-based on the accounts-type `Filing`** (the period of accounts). The editor + `POST /api/company/ct600-periods` endpoint already persist with `ctapUserEdited:true` and need **no change**.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `prisma/migrations/<ts>_clear_auto_ct600_filings/migration.sql` | One-off data cleanup | Create |
| `src/app/api/cron/create-periods/route.ts` | Daily period creation | Remove Loop 2 (CT600) |
| `src/app/api/company/update/route.ts` | Company settings updates | Gut CT600 generation in Case 3 |
| `src/lib/companies-house/materialise-filings.ts` | Resync materialisation | Delete `buildCt600FilingData` + its use |
| `src/app/(app)/company/[companyId]/page.tsx` | Company detail page | Re-base CT600 editor seed on accounts period; gate tab on UTR |
| `src/components/corp-tax-tab.tsx` | CT600 tab UI | Context-aware empty state / button copy |
| `src/components/enable-corp-tax.tsx` | (dead code) | Delete |
| `scripts/backfill-ct600-ctaps.ts` + test | Old CT600 backfill | Delete (regenerates auto rows — now dangerous) |
| `src/__tests__/...` (cron/update/materialise/page) | Tests | Update to assert no auto-generation + new seed logic |

---

## Task 1: Remove CT600 auto-generation from the `create-periods` cron (Loop 2)

**Files:**
- Modify: `src/app/api/cron/create-periods/route.ts` (delete lines 108-186 Loop 2; fix imports line 1-8)
- Test: `src/__tests__/api/cron-create-periods-ct600.test.ts` (repurpose to assert NO ct600 is created)

- [ ] **Step 1: Rewrite the failing test**

Replace the body of `src/__tests__/api/cron-create-periods-ct600.test.ts` so it asserts the cron no longer creates any `ct600` rows. Mirror the existing mock setup in that file (it already mocks `@/lib/db`). Key new assertion — after invoking the route `GET` with a CT-registered company that has elapsed accounts spans and zero ct600 rows:

```ts
// every prisma.filing.upsert call must be for accounts only
const upsertCalls = (prisma.filing.upsert as unknown as vi.Mock).mock.calls;
expect(upsertCalls.length).toBeGreaterThan(0); // accounts still created
for (const [arg] of upsertCalls) {
  expect(arg.create.filingType).toBe("accounts");
  expect(arg.where.companyId_periodStart_periodEnd_filingType.filingType).toBe("accounts");
}
```

Keep/adapt any existing accounts-Loop-1 assertions in the file so Loop 1 behaviour stays covered.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api/cron-create-periods-ct600.test.ts`
Expected: FAIL — current code still upserts `ct600` rows.

- [ ] **Step 3: Delete Loop 2 and unused imports**

In `src/app/api/cron/create-periods/route.ts`:
- Delete the entire `// ── Loop 2: CT600 CTAPs ──` block (lines 108-186, the second `for (const company of companies)` loop), leaving Loop 1 and `return NextResponse.json({ created });`.
- Delete lines 4-8 — the `import { getNextCtapStart, generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";` block (none are used by Loop 1). **Do not** re-add a `calculateAccountsDeadline` import — line 3 (`import { calculateAccountsDeadline } from "@/lib/utils";`) already covers Loop 1 and must stay.
- In the `prisma.company.findMany` `select`, the `registeredForCorpTax`, `ctapStartDate`, and per-filing `startDate/endDate/filingType/status/ctapUserEdited` selections were only needed by Loop 2. Trim the `select` to what Loop 1 uses (`id`, and `filings: { select: { periodEnd: true }, orderBy: { periodEnd: "desc" } }`). Keep `deletedAt`/subscription `where` unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api/cron-create-periods-ct600.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint the file**

Run: `npx eslint src/app/api/cron/create-periods/route.ts`
Expected: clean (no unused-import errors).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/create-periods/route.ts src/__tests__/api/cron-create-periods-ct600.test.ts
git commit -m "feat: stop auto-generating CT600 CTAPs in create-periods cron"
```

---

## Task 2: Gut CT600 auto-generation in the enable-Corp-Tax flow

**Files:**
- Modify: `src/app/api/company/update/route.ts` (Case 3 lines 63-151; imports line 6)
- Test: `src/__tests__/api/company-update-ct600.test.ts`

- [ ] **Step 1: Rewrite the failing test**

In `src/__tests__/api/company-update-ct600.test.ts`, change the "enable Corp Tax" expectations so that enabling sets the UTR + flag but creates **no** CT600 filings:

```ts
// PATCH with registeredForCorpTax:true + valid UTR on an unregistered company
expect(prisma.company.update).toHaveBeenCalledWith(
  expect.objectContaining({
    data: expect.objectContaining({
      registeredForCorpTax: true,
      uniqueTaxReference: "1234567890",
    }),
  }),
);
expect(prisma.filing.createMany).not.toHaveBeenCalled();
```

Keep the validation tests (missing UTR → 400, bad UTR → 400).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api/company-update-ct600.test.ts`
Expected: FAIL — Case 3 still calls `prisma.filing.createMany`.

- [ ] **Step 3: Simplify Case 3**

In `src/app/api/company/update/route.ts`, replace the Case 3 block (lines 63-151) with validation + a plain company update (no CT600 generation):

```ts
  // Case 3: Enable Corp Tax for the first time (set UTR — the single switch
  // that unlocks the Corporation Tax tab). CT600 periods are created only
  // when the user manually confirms them via the period editor.
  if (registeredForCorpTax === true && !company.registeredForCorpTax) {
    if (!uniqueTaxReference) {
      return NextResponse.json(
        { error: "UTR is required when enabling Corporation Tax" },
        { status: 400 },
      );
    }
    if (!validateUTR(uniqueTaxReference)) {
      return NextResponse.json({ error: "UTR must be exactly 10 digits" }, { status: 400 });
    }

    const ctapStartDate = ctapStartDateStr ? new Date(ctapStartDateStr) : null;
    if (ctapStartDate && isNaN(ctapStartDate.getTime())) {
      return NextResponse.json({ error: "Invalid ctapStartDate" }, { status: 400 });
    }

    await prisma.company.update({
      where: { id: companyId },
      data: {
        registeredForCorpTax: true,
        uniqueTaxReference,
        ctapStartDate,
      },
    });

    return NextResponse.json({ success: true });
  }
```

Then update the import on line 6 — remove the now-unused ctap import:

```ts
import { validateUTR } from "@/lib/utils";
```

(Delete `import { generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";`. `validateUTR` from `@/lib/utils` stays.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api/company-update-ct600.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/app/api/company/update/route.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/company/update/route.ts src/__tests__/api/company-update-ct600.test.ts
git commit -m "feat: enabling Corp Tax sets UTR only, no CT600 auto-generation"
```

---

## Task 3: Remove CT600 generation from resync materialisation

**Files:**
- Modify: `src/lib/companies-house/materialise-filings.ts` (delete `buildCt600FilingData` lines 31-91; remove its use lines 182-202; imports line 2)
- Test: `src/__tests__/lib/materialise-filings.test.ts`

- [ ] **Step 1: Rewrite the failing test**

In `src/__tests__/lib/materialise-filings.test.ts`, delete all `buildCt600FilingData` test blocks. Add/keep an assertion that `materialiseFilings` only ever creates `accounts` rows:

```ts
const created = (prisma.filing.createMany as unknown as vi.Mock).mock.calls[0][0].data;
expect(created.length).toBeGreaterThan(0);
expect(created.every((r: { filingType: string }) => r.filingType === "accounts")).toBe(true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/materialise-filings.test.ts`
Expected: FAIL — `buildCt600FilingData` still exported / ct600 rows still produced.

- [ ] **Step 3: Remove CT600 from materialise-filings**

In `src/lib/companies-house/materialise-filings.ts`:
- Delete the exported `buildCt600FilingData` function (lines 31-91, including its doc comment).
- In `materialiseFilings`, delete the existing-CT600 query + CT600 push (lines 182-202): the `const existingCt600s = await prisma.filing.findMany(...)` block, the `const ct600Rows = buildCt600FilingData(...)` call, and the `for (const row of ct600Rows) { ... }` loop. Keep the `const { prisma } = await import("@/lib/db");` line and the final `if (filingData.length > 0) { await prisma.filing.createMany(...) }`.
- In the input destructuring at the top of `materialiseFilings` (lines ~106-116), remove `registeredForCorpTax` and `ctapStartDate` — both are now unused (they only fed `buildCt600FilingData`). This keeps `npm run lint` warning-free. (The `MaterialiseFilingsInput` *interface* still declares these fields — leave the interface unchanged so call sites in `api/company/route.ts` / `full-resync.ts` are untouched.)
- Update line 2 import — remove the unused ctap helpers, keeping only what's still used (`calculateAccountsDeadline` on line 1 stays; `computeFirstPeriodEnd`/`GapDetectionResult` on lines 3-4 stay):

```ts
// delete: import { generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";
```

- Remove the now-unused `MaterialiseFilingsInput.registeredForCorpTax` / `ctapStartDate` only if no caller passes them — **do not** change the interface; callers still pass these and TS allows extra unused fields. Leave the interface as-is (YAGNI; avoids touching `api/company/route.ts` and `full-resync.ts` call sites).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/materialise-filings.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck + lint the module and its callers**

Run: `npx tsc --noEmit` then `npx eslint src/lib/companies-house/materialise-filings.ts`
Expected: clean. (Confirms `api/company/route.ts` and `full-resync.ts` still compile against the unchanged interface.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/companies-house/materialise-filings.ts src/__tests__/lib/materialise-filings.test.ts
git commit -m "feat: resync no longer materialises CT600 filings"
```

---

## Task 4: Re-base the CT600 editor seed on the accounts period (page.tsx)

This lets the manual editor create a CT600 chain from scratch (no pre-existing `targetCt600` required).

**Files:**
- Modify: `src/app/(app)/company/[companyId]/page.tsx` (lines 47-131 derivation; lines 196-198 + 228-240 gating)
- Test: `src/__tests__/lib/ct600-editor-seed.test.ts` (new — extract the derivation into a pure helper to make it unit-testable)
- Create: `src/lib/ct600-editor-seed.ts` (pure helper)

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/ct600-editor-seed.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { deriveCt600EditorSeed } from "@/lib/ct600-editor-seed";

const d = (s: string) => new Date(s + "T00:00:00.000Z");

describe("deriveCt600EditorSeed", () => {
  it("seeds from the earliest accounts period when no CT600 exists yet", () => {
    const seed = deriveCt600EditorSeed({
      filings: [
        { filingType: "accounts", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: false },
      ],
      ctapStartDate: null,
    });
    expect(seed).toBeTruthy();
    expect(seed!.accountsPeriodStartISO).toBe("2023-01-01");
    expect(seed!.accountsPeriodEndISO).toBe("2023-12-31");
    expect(seed!.suggested.length).toBe(1); // 12-month period → single CTAP
    expect(seed!.immutable).toEqual([]);
  });

  it("skips an accounts span already protected by a filed CT600 and advances to the next", () => {
    const seed = deriveCt600EditorSeed({
      filings: [
        { filingType: "accounts", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: false },
        { filingType: "accounts", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: false },
        { filingType: "ct600", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "accepted", suppressedAt: null, ctapUserEdited: false },
      ],
      ctapStartDate: null,
    });
    expect(seed!.accountsPeriodStartISO).toBe("2023-01-01");
  });

  it("skips an accounts span protected by an OUTSTANDING but user-edited CT600 (ctapUserEdited)", () => {
    const seed = deriveCt600EditorSeed({
      filings: [
        { filingType: "accounts", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: false },
        { filingType: "accounts", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: false },
        // user has already manually confirmed CT600 periods for the 2022 span
        { filingType: "ct600", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: true },
      ],
      ctapStartDate: null,
    });
    expect(seed!.accountsPeriodStartISO).toBe("2023-01-01");
  });

  it("returns null when there are no accounts periods", () => {
    expect(deriveCt600EditorSeed({ filings: [], ctapStartDate: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/ct600-editor-seed.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the pure helper**

Create `src/lib/ct600-editor-seed.ts`:

```ts
import { generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";

const IMMUTABLE_CT600 = new Set(["submitted", "accepted", "filed_elsewhere"]);

interface SeedFiling {
  filingType: string;
  periodStart: Date;
  periodEnd: Date;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  suppressedAt: Date | null;
  ctapUserEdited: boolean;
}

export interface Ct600EditorSeed {
  accountsPeriodStartISO: string;
  accountsPeriodEndISO: string;
  suggested: { startISO: string; endISO: string }[];
  immutable: { startISO: string; endISO: string; status: string }[];
}

const iso = (dt: Date) => dt.toISOString().split("T")[0];

/**
 * Picks the accounts period the manual CT600 editor should manage:
 * the earliest accounts-type Filing whose span does NOT already contain a
 * protected CT600 (submitted/accepted/etc. or user-edited); falls back to
 * the earliest accounts period. Returns the suggested split (from the shared
 * `generateCt600Ctaps`) and any already-filed CT600s in the span as immutable.
 * Returns null if the company has no accounts periods yet.
 */
export function deriveCt600EditorSeed(input: {
  filings: SeedFiling[];
  ctapStartDate: Date | null;
}): Ct600EditorSeed | null {
  const { filings, ctapStartDate } = input;
  const accounts = filings
    .filter((f) => f.filingType === "accounts")
    .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  if (accounts.length === 0) return null;

  const ct600s = filings
    .filter((f) => f.filingType === "ct600")
    .map((f) => ({
      status: f.status,
      ctapUserEdited: f.ctapUserEdited,
      periodStart: f.startDate ?? f.periodStart,
      periodEnd: f.endDate ?? f.periodEnd,
    }));

  const target =
    accounts.find(
      (a) =>
        !spanHasProtectedCt600(
          { accountsPeriodStart: a.periodStart, accountsPeriodEnd: a.periodEnd },
          ct600s,
        ),
    ) ?? accounts[0];

  const accountsPeriodStart = target.periodStart;
  const accountsPeriodEnd = target.periodEnd;

  const suggested = generateCt600Ctaps({
    accountsPeriodStart,
    accountsPeriodEnd,
    anchor: ctapStartDate,
  }).map((c) => ({ startISO: iso(c.start), endISO: iso(c.end) }));

  const immutable = filings
    .filter((f) => f.filingType === "ct600")
    .filter((f) => {
      const fs = (f.startDate ?? f.periodStart).getTime();
      const fe = (f.endDate ?? f.periodEnd).getTime();
      return (
        fs >= accountsPeriodStart.getTime() &&
        fe <= accountsPeriodEnd.getTime() &&
        IMMUTABLE_CT600.has(f.status)
      );
    })
    .map((f) => ({
      startISO: iso(f.startDate ?? f.periodStart),
      endISO: iso(f.endDate ?? f.periodEnd),
      status: f.status,
    }));

  return {
    accountsPeriodStartISO: iso(accountsPeriodStart),
    accountsPeriodEndISO: iso(accountsPeriodEnd),
    suggested,
    immutable,
  };
}
```

> The helper reads the real `f.ctapUserEdited` per filing, so `spanHasProtectedCt600` protects spans that contain either a filed CT600 **or** an outstanding-but-user-edited CT600 (covered by the third test case). `page.tsx` (Step 5) must therefore pass `ctapUserEdited` through in the `filings` projection.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/ct600-editor-seed.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the helper into page.tsx and gate the tab on UTR**

In `src/app/(app)/company/[companyId]/page.tsx`:
- Add import: `import { deriveCt600EditorSeed } from "@/lib/ct600-editor-seed";`
- **Remove the now-unused import on line 18:** `import { generateCt600Ctaps } from "@/lib/ctap";` — after this task `generateCt600Ctaps` is referenced only inside the new helper, not in `page.tsx`. Leaving it will fail the Step 6 ESLint gate (`@typescript-eslint/no-unused-vars`). (Line 19 `import { isFilingLive, isTaxFilingLive } from "@/lib/launch-mode";` stays — still used by `showFirstFilingNote`.)
- Delete the `targetCt600`-based derivation block (lines 52-131: the leading comment + `IMMUTABLE_CT600` through the `corpTaxPeriodProps` assignment) and replace with:

```ts
  const hasUtr = (company.uniqueTaxReference ?? "").trim() !== "";

  const corpTaxPeriodProps = hasUtr
    ? (deriveCt600EditorSeed({
        filings: company.filings.map((f) => ({
          filingType: f.filingType,
          periodStart: f.periodStart,
          periodEnd: f.periodEnd,
          startDate: f.startDate,
          endDate: f.endDate,
          status: f.status,
          suppressedAt: f.suppressedAt,
          ctapUserEdited: f.ctapUserEdited,
        })),
        ctapStartDate: company.ctapStartDate ?? null,
      }) ?? undefined)
    : undefined;
```

- Tab list (lines 196-198): change the gate from `company.registeredForCorpTax` to `hasUtr`:

```tsx
          ...(hasUtr
            ? [{ key: "corp-tax", label: "Corporation Tax", href: `/company/${companyId}?tab=corp-tax` }]
            : []),
```

- Tab render (line 228): change `tab === "corp-tax" && company.registeredForCorpTax` to `tab === "corp-tax" && hasUtr`.
- Leave `activeCT600Count` (lines 47-50) and the `SettingsTab` props (lines 262-272) unchanged.

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint src/app/\(app\)/company/\[companyId\]/page.tsx src/lib/ct600-editor-seed.ts`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ct600-editor-seed.ts src/__tests__/lib/ct600-editor-seed.test.ts "src/app/(app)/company/[companyId]/page.tsx"
git commit -m "feat: seed CT600 editor from accounts period; gate Corp Tax tab on UTR"
```

---

## Task 5: Context-aware empty state in the Corporation Tax tab

When a UTR'd company has no confirmed CT600 yet, the outstanding list is empty. Guide the user to set up periods instead of showing a bare empty list.

**Files:**
- Modify: `src/components/corp-tax-tab.tsx` (the `activeTab === "outstanding"` section + the "Manage periods" button copy ~lines 84-95)
- Test: none. There is no existing `corp-tax-tab` component test and this is a purely presentational change — it is verified by the Task 8 manual smoke checklist (item 3). Do not create a new test file for this task.

- [ ] **Step 1: Add/adjust the empty-state UI**

In `src/components/corp-tax-tab.tsx`, when `activeTab === "outstanding"` and `outstanding.length === 0`:
- If `canManagePeriods` is true: render a short empty state — e.g. a card with copy "No Corporation Tax periods set up yet. Add the accounting period (or split periods) you need to file, then submit." and keep the existing "Manage periods" button (relabel to **"Set up CT600 periods"** when `outstanding.length === 0 && completed.length === 0 && filedElsewhere.length === 0`, else keep "Manage periods").
- Use only Tailwind utility classes per project styling rules (`bg-card`, `text-secondary`, etc. — match neighbouring components like `filings-tab.tsx`). No inline `style`.

Exact copy is the implementer's to write on the fly (project convention); keep it one sentence, plain English, no jargon.

- [ ] **Step 2: Verify build + lint**

Run: `npx eslint src/components/corp-tax-tab.tsx && npm run build`
Expected: build succeeds, lint clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/corp-tax-tab.tsx
git commit -m "feat: empty-state guidance for CT600 setup in Corp Tax tab"
```

---

## Task 6: Delete dead code and retire the CT600 backfill script

**Files:**
- Delete: `src/components/enable-corp-tax.tsx` (confirmed unused — only self-reference in grep)
- Delete: `scripts/backfill-ct600-ctaps.ts` and `src/__tests__/lib/backfill-ct600.test.ts` (the script regenerates auto CT600 rows — directly contradicts the manual-only model and would re-create cleared rows)

- [ ] **Step 1: Re-confirm `enable-corp-tax.tsx` is unused**

Run: `grep -rn "components/enable-corp-tax\|<EnableCorpTax" src --include="*.ts" --include="*.tsx" | grep -v __tests__`
Expected: **no output** (empty). This matches only a real *import of the component* or its *JSX usage* — it deliberately does NOT match the unrelated local function `handleEnableCorpTax` in `settings-tab.tsx` (which contains the substring `EnableCorpTax` but is not a reference to this component; that function is the in-use Settings UTR-entry path and is intentionally left alone). If this command prints any line, STOP and surface — do not delete.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/enable-corp-tax.tsx scripts/backfill-ct600-ctaps.ts src/__tests__/lib/backfill-ct600.test.ts
```

- [ ] **Step 3: Typecheck + full lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean (no dangling imports).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dead enable-corp-tax component and CT600 backfill script"
```

---

## Task 7: One-off migration — clear unconfirmed auto-generated CT600 rows

**Files:**
- Create: `prisma/migrations/<timestamp>_clear_auto_ct600_filings/migration.sql`

- [ ] **Step 1: Generate an empty migration**

Run: `npx prisma migrate dev --name clear_auto_ct600_filings --create-only`
Expected: a new `prisma/migrations/<timestamp>_clear_auto_ct600_filings/migration.sql` (empty / no schema diff since the schema is unchanged).

- [ ] **Step 2: Write the cleanup SQL**

Put exactly this in the generated `migration.sql`:

```sql
-- One-off: CT600 is now fully manual. Remove system-generated, unconfirmed
-- CT600 rows. Submitted/accepted/rejected/failed/filed_elsewhere (real filing
-- history) and ctapUserEdited=true (user edits) are intentionally preserved.
DELETE FROM "Filing"
WHERE "filingType" = 'ct600'
  AND "status" = 'outstanding'
  AND "ctapUserEdited" = false;
```

- [ ] **Step 3: Apply locally and verify counts**

Run: `npx prisma migrate dev`
Then verify no protected rows were touched (run against the local dev DB):

```bash
npx prisma db execute --stdin <<'SQL'
SELECT
  COUNT(*) FILTER (WHERE "filingType"='ct600' AND "status"='outstanding' AND "ctapUserEdited"=false) AS remaining_auto,
  COUNT(*) FILTER (WHERE "filingType"='ct600' AND "ctapUserEdited"=true) AS user_edited,
  COUNT(*) FILTER (WHERE "filingType"='ct600' AND "status" IN ('submitted','accepted','rejected','failed','filed_elsewhere')) AS history
FROM "Filing";
SQL
```

Expected: `remaining_auto = 0`; `user_edited` and `history` unchanged from before the migration (note their values before applying so this is a real check, not an assumption).

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations
git commit -m "feat: migration clears unconfirmed auto-generated CT600 filings"
```

> **Production note (surface to Ben at handoff, do not auto-run):** this migration deletes data. It runs automatically on the next `prisma migrate deploy` (Vercel deploy). It is safe by construction (only `outstanding` + `ctapUserEdited=false` ct600), but Ben should be told it will execute on deploy.

---

## Task 8: Full verification

- [ ] **Step 1: Full test suite**

Run: `npm test`
Expected: all green. Baseline before this work was 379/0 (per project memory `project_test_baseline.md`); the gate is **all green** — no new failures. Net test count will drop (backfill test removed) and several CT600 tests now assert the new behaviour.

- [ ] **Step 2: Lint + typecheck + build**

Run: `npm run lint && npx tsc --noEmit && npm run build`
Expected: all clean / build succeeds.

- [ ] **Step 3: Manual smoke checklist (dev server)**

Run `npm run dev`, then verify:
1. Company **without** UTR → no "Corporation Tax" tab in the tab bar; visiting `?tab=corp-tax` does not render the tab content.
2. Settings tab → "Enable CT600" → enter a valid 10-digit UTR + save → "Corporation Tax" tab now appears.
3. Corporation Tax tab with no CT600 yet → shows the empty-state guidance + "Set up CT600 periods" button.
4. Click it → editor opens pre-filled with the `generateCt600Ctaps` suggestion for the company's earliest accounts period; confirm → outstanding CT600 row(s) appear with `ctapUserEdited:true`.
5. A "File" button is shown for the confirmed outstanding CT600 (when `NEXT_PUBLIC_TAX_FILING_LIVE=true`) and `/api/file/submit` accepts it (it requires `status:"outstanding"` ct600 + `company.registeredForCorpTax`, which the invariant guarantees).
6. Re-run the daily cron locally (`curl` the `create-periods` route with the `CRON_SECRET` bearer) → no new ct600 rows created; accounts rows still created.

- [ ] **Step 4: Final commit (if any smoke fixes were needed)**

```bash
git add -A && git commit -m "fix: CT600 manual-only smoke-test follow-ups"
```

---

## Notes for the executor

- **TDD:** Tasks 1-4 are strict red→green. Task 7 (SQL migration) is verified by row-count assertion, not a unit test — that is acceptable for a one-off data migration.
- **Do not** change the `MaterialiseFilingsInput` interface or `api/company/route.ts` / `full-resync.ts` call sites — the unused fields are harmless and keeping them avoids unrelated churn (YAGNI).
- **Do not** drop the `Company.registeredForCorpTax` column — it is an intentional internal mirror that downstream consumers still read. The invariant (`registeredForCorpTax === (uniqueTaxReference != null)`) is already maintained by every write path; verify, don't rebuild.
- The shared `src/lib/ctap.ts` helpers (`generateCt600Ctaps`, `validateCtapChain`, `spanHasProtectedCt600`) and the editor + `POST /api/company/ct600-periods` endpoint are **unchanged** — they remain the single source of truth for splitting/validation and now the *only* CT600 creators.
- Follow `@superpowers:test-driven-development` and `@superpowers:verification-before-completion`.
