# CT600 Manual-Only Implementation Plan (rev 2)

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CT600 (Corporation Tax) entirely user-driven — no auto-detection or auto-generation of CTAP periods; the user enters/confirms the period (or split periods) manually, can remove unfiled CT600s they added by mistake, and only confirmed periods are fileable.

**Architecture:** Remove all three CT600 auto-generators (the daily `create-periods` cron Loop 2, the `update/route.ts` enable-Corp-Tax flow, and `materialise-filings.ts`). Re-seed the existing manual period editor from the company's *accounts period* (instead of from a pre-existing CT600 chain) so it can create a chain from scratch. Gate the Corporation Tax tab on UTR presence (UTR becomes the single user-facing switch; `registeredForCorpTax` is kept as an internal mirror). Drop the now-pointless `Company.ctapStartDate` (DB column + all wiring + the orphaned `getNextCtapStart` helper). Add a remove action for unfiled CT600s. A one-off migration clears existing unconfirmed auto-generated CT600 rows.

**Tech Stack:** Next.js 16 App Router, React 19, Prisma 7 / PostgreSQL, Vitest (mocked Prisma via `vi.mock("@/lib/db")`), Tailwind v4.

---

## Background & Design Decisions (the "spec")

**Why:** The system cannot proactively or accurately detect missing CT600s — the reminders cron is `filingType:"accounts"`-only ([reminders/route.ts:83](../../../src/app/api/cron/reminders/route.ts#L83)), `create-periods` Loop 1 skips companies with no filing chain (`if (!latestPeriodEnd) continue`), and CT600 CTAPs were derived purely from local accounts spans with no HMRC reconciliation. Getting CT600 period boundaries wrong carries user penalties, so the user must be the source of truth.

**Confirmed requirements (Ben, 2026-05-16):**

1. **UTR is the single switch.** No UTR on the company ⇒ the Corporation Tax tab is not accessible at all. UTR can be added any time after company creation (existing path: Settings tab → "Enable CT600").
2. **CT600 is fully manual.** No auto-suggestion / auto-generation. The manual period editor becomes the *sole* path that creates CT600 `Filing` rows.
3. **`registeredForCorpTax` ceases to be the user-facing gate; UTR-on-`Company` is.** Decision: keep `registeredForCorpTax` in the DB as an internal mirror (`registeredForCorpTax === (uniqueTaxReference != null)` is maintained by every UTR write path). UI gates strictly on `uniqueTaxReference`. This avoids a wide refactor of downstream consumers ([`/api/file/submit:126-131`](../../../src/app/api/file/submit/route.ts#L126), [`dashboard-filters.matchesNeedsAttention`](../../../src/lib/dashboard-filters.ts#L31)).
4. **Clear existing unconfirmed auto-generated CT600 rows** — but never touch CT600s that are submitted/accepted/rejected/failed/filed_elsewhere or `ctapUserEdited:true`. Concretely: delete `Filing WHERE filingType='ct600' AND status='outstanding' AND ctapUserEdited=false`.
5. **(rev 2) Remove the "CT accounting period start date" (`Company.ctapStartDate`) entirely.** It is an extra onboarding step with no purpose now that CT600 periods are entered by hand. Decision (Ben): **drop the DB column** (destructive Prisma migration) and remove *all* backend wiring, including the now-orphaned `getNextCtapStart` helper. `generateCt600Ctaps` already defaults `anchor` to the accounts-period start when `anchor` is `null` ([ctap.ts:95](../../../src/lib/ctap.ts#L95)) — that is the correct dormant-company default, so callers simply pass `null`.
6. **(rev 2) A "remove" action for unfiled CT600s** so a user can correct a mistaken entry. Decision (Ben): removable statuses = **`outstanding`, `failed`, `rejected`**. Protected (not removable, 409) = `submitted`, `accepted`, `filed_elsewhere`, `pending` (real submissions / in-flight). Per-row trash button in the Corp Tax tab with a confirm step (match the existing `settings-tab.tsx` confirm-modal pattern).

**Invariant (already holds — verify, don't rebuild):** Every path that writes `uniqueTaxReference` also sets `registeredForCorpTax` consistently: Create ([api/company/route.ts:262-263](../../../src/app/api/company/route.ts#L262)), Enable ([update/route.ts Case 3](../../../src/app/api/company/update/route.ts#L64)), Disable ([Case 1](../../../src/app/api/company/update/route.ts#L37)), UTR update ([Case 2](../../../src/app/api/company/update/route.ts#L52)).

**Out of scope:** Accounts (Companies House) detection/reminders unchanged. Multi-accounts-period CT600 management (the editor manages one accounts span at a time, as today; user repeats per period). The `company-form.tsx` add-company UTR field is functionally unchanged. `mark-filed/route.ts`'s `ctapStartDate`/`ctapEndDate` are **per-filing body params, unrelated to `Company.ctapStartDate`** — leave them alone.

**Key architectural insight:** `Ct600PeriodEditor` is opened from `corp-tax-tab.tsx` only when `canManagePeriods` (props `accountsPeriodStartISO/EndISO/suggested/immutable` all present), computed in `page.tsx` from a pre-existing `targetCt600` filing. With auto-generation gone there is no `targetCt600` for a fresh company, so the derivation **must be re-based on the accounts-type `Filing`**. The editor + `POST /api/company/ct600-periods` endpoint already persist with `ctapUserEdited:true` and need no change to that POST path.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `src/app/api/cron/create-periods/route.ts` | Daily period creation | Remove Loop 2 (CT600) + ctap imports |
| `src/app/api/company/update/route.ts` | Company settings updates | Gut CT600 gen + drop all `ctapStartDate` |
| `src/lib/companies-house/materialise-filings.ts` | Resync materialisation | Delete `buildCt600FilingData`; drop `registeredForCorpTax`/`ctapStartDate` from interface |
| `src/app/api/company/route.ts` | Create / restore company | Drop `ctapStartDate` args to `materialiseFilings` |
| `src/lib/companies-house/full-resync.ts` | Full resync | Drop `ctapStartDate` select + arg |
| `src/lib/ct600-editor-seed.ts` (new) | Editor seed from accounts period | Create (no `ctapStartDate`) |
| `src/app/(app)/company/[companyId]/page.tsx` | Company detail page | Re-base editor seed; gate tab on UTR; drop `firstPeriodStart` |
| `src/lib/ctap.ts` | CTAP helpers | Delete dead `getNextCtapStart` |
| `prisma/schema.prisma` + migration | Schema | Drop `Company.ctapStartDate` column |
| `src/components/settings-tab.tsx` | Settings UI | Remove the CTAP-start date input + state |
| `src/app/api/company/ct600-periods/route.ts` | CT600 period editor API | Add `DELETE` (remove one unfiled CT600) |
| `src/components/corp-tax-tab.tsx` | CT600 tab UI | Per-row remove button + confirm; empty state |
| `src/components/enable-corp-tax.tsx` | (dead code) | Delete |
| `scripts/backfill-ct600-ctaps.ts` + test | Old CT600 backfill | Delete (regenerates auto rows) |
| `prisma/migrations/<ts>_clear_auto_ct600_filings/` | Data cleanup | Create |

---

## Task 1: Remove CT600 auto-generation from the `create-periods` cron (Loop 2)

**Files:**
- Modify: `src/app/api/cron/create-periods/route.ts` (delete Loop 2 lines 108-186; imports lines 4-8; trim `select`)
- Test: `src/__tests__/api/cron-create-periods-ct600.test.ts`

- [ ] **Step 1: Rewrite the failing test**

Replace the body of `src/__tests__/api/cron-create-periods-ct600.test.ts` so it asserts the cron creates **no** `ct600` rows. Mirror the existing mock setup (it already mocks `@/lib/db`). After invoking `GET` with a CT-registered company that has elapsed accounts spans and zero ct600 rows:

```ts
const upsertCalls = (prisma.filing.upsert as unknown as vi.Mock).mock.calls;
expect(upsertCalls.length).toBeGreaterThan(0); // accounts still created
for (const [arg] of upsertCalls) {
  expect(arg.create.filingType).toBe("accounts");
  expect(arg.where.companyId_periodStart_periodEnd_filingType.filingType).toBe("accounts");
}
```

Keep/adapt existing accounts-Loop-1 assertions.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api/cron-create-periods-ct600.test.ts`
Expected: FAIL — code still upserts `ct600` rows.

- [ ] **Step 3: Delete Loop 2 and unused imports**

In `src/app/api/cron/create-periods/route.ts`:
- Delete the entire `// ── Loop 2: CT600 CTAPs ──` block (lines 108-186, the second `for (const company of companies)` loop), leaving Loop 1 and `return NextResponse.json({ created });`.
- Delete lines 4-8 — the `import { getNextCtapStart, generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";` block. **Do not** re-add a `calculateAccountsDeadline` import — line 3 (`import { calculateAccountsDeadline } from "@/lib/utils";`) already covers Loop 1 and must stay.
- Trim the `prisma.company.findMany` `select` to what Loop 1 uses: `id` and `filings: { select: { periodEnd: true }, orderBy: { periodEnd: "desc" } }`. Remove `registeredForCorpTax`, `ctapStartDate`, and the extra per-filing fields. Keep the `where` (`deletedAt`, subscription) unchanged.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api/cron-create-periods-ct600.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/app/api/cron/create-periods/route.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cron/create-periods/route.ts src/__tests__/api/cron-create-periods-ct600.test.ts
git commit -m "feat: stop auto-generating CT600 CTAPs in create-periods cron"
```

---

## Task 2: Gut CT600 auto-generation + drop `ctapStartDate` in the enable-Corp-Tax flow

**Files:**
- Modify: `src/app/api/company/update/route.ts` (body destructure line 15; Case 1 line 41; Case 3 lines 63-151; imports line 6)
- Test: `src/__tests__/api/company-update-ct600.test.ts`

- [ ] **Step 1: Rewrite the failing test**

In `src/__tests__/api/company-update-ct600.test.ts`, change the "enable Corp Tax" expectations so enabling sets UTR + flag, creates **no** CT600 filings, and does **not** reference `ctapStartDate`:

```ts
expect(prisma.company.update).toHaveBeenCalledWith(
  expect.objectContaining({
    data: { registeredForCorpTax: true, uniqueTaxReference: "1234567890" },
  }),
);
expect(prisma.filing.createMany).not.toHaveBeenCalled();
```

Keep validation tests (missing UTR → 400, bad UTR → 400). Remove any test asserting `ctapStartDate` is parsed/stored.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api/company-update-ct600.test.ts`
Expected: FAIL.

- [ ] **Step 3: Simplify Case 3, strip `ctapStartDate` from the route**

In `src/app/api/company/update/route.ts`:
- Line 15 — remove `ctapStartDate: ctapStartDateStr` from the body destructure:

```ts
  const { companyId, registeredForCorpTax, uniqueTaxReference, shareCapital } = body;
```

- Case 1 (line 41) — remove `ctapStartDate: null` from the `data`:

```ts
        data: { registeredForCorpTax: false, uniqueTaxReference: null },
```

- Replace the Case 3 block (lines 63-151) with:

```ts
  // Case 3: Enable Corp Tax for the first time — set the UTR (the single
  // switch that unlocks the Corporation Tax tab). CT600 periods are created
  // only when the user manually confirms them via the period editor.
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

    await prisma.company.update({
      where: { id: companyId },
      data: { registeredForCorpTax: true, uniqueTaxReference },
    });

    return NextResponse.json({ success: true });
  }
```

- Line 6 — remove the unused ctap import (keep `validateUTR` from `@/lib/utils`):

```ts
import { validateUTR } from "@/lib/utils";
```

(Delete `import { generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";`.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api/company-update-ct600.test.ts`
Expected: PASS.

- [ ] **Step 5: Lint**

Run: `npx eslint src/app/api/company/update/route.ts`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/company/update/route.ts src/__tests__/api/company-update-ct600.test.ts
git commit -m "feat: enabling Corp Tax sets UTR only (no CT600 gen, no ctapStartDate)"
```

---

## Task 3: Remove CT600 generation + `ctapStartDate` from resync materialisation and its callers

**Files:**
- Modify: `src/lib/companies-house/materialise-filings.ts` (delete `buildCt600FilingData` lines 31-91; remove its use lines 182-202; drop `registeredForCorpTax`/`ctapStartDate` from `MaterialiseFilingsInput` lines 6-16 + destructure lines 106-116; imports line 2)
- Modify: `src/app/api/company/route.ts` (restore call lines 240-252, create call lines 279-291)
- Modify: `src/lib/companies-house/full-resync.ts` (select line 93, call ~line 165)
- Test: `src/__tests__/lib/materialise-filings.test.ts`

- [ ] **Step 1: Rewrite the failing test**

In `src/__tests__/lib/materialise-filings.test.ts`, delete all `buildCt600FilingData` test blocks. Assert `materialiseFilings` only ever creates `accounts` rows and that its input no longer needs CT fields:

```ts
const created = (prisma.filing.createMany as unknown as vi.Mock).mock.calls[0][0].data;
expect(created.length).toBeGreaterThan(0);
expect(created.every((r: { filingType: string }) => r.filingType === "accounts")).toBe(true);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/materialise-filings.test.ts`
Expected: FAIL.

- [ ] **Step 3: Remove CT600 + CT fields from materialise-filings**

In `src/lib/companies-house/materialise-filings.ts`:
- Delete the exported `buildCt600FilingData` function (lines 31-91, incl. its doc comment).
- In `MaterialiseFilingsInput` (lines 6-16), delete the `registeredForCorpTax: boolean;` and `ctapStartDate?: Date | null;` fields.
- In `materialiseFilings`'s destructure (lines 106-116), remove `registeredForCorpTax` and `ctapStartDate` (now unused).
- Delete the existing-CT600 query + CT600 push (~lines 184-202): the `const existingCt600s = await prisma.filing.findMany(...)` block, the `const ct600Rows = buildCt600FilingData(...)` call, and the `for (const row of ct600Rows) {...}` loop. **Keep** line 182 `const { prisma } = await import("@/lib/db");` and the final `if (filingData.length > 0) { await prisma.filing.createMany(...) }`.
- Line 2 — delete `import { generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";` (line 1 `calculateAccountsDeadline`, lines 3-4 stay).

- [ ] **Step 4: Update the two `company/route.ts` call sites**

In `src/app/api/company/route.ts`:
- Restore path (lines 240-252): remove the `registeredForCorpTax: !!registeredForCorpTax,` and the `ctapStartDate: softDeleted.ctapStartDate,` arguments (and the preceding `// Preserve the company's CT anchor ...` comment) from the `materialiseFilings({...})` call.
- Create path (lines 279-291): remove the `registeredForCorpTax: !!registeredForCorpTax,` and `ctapStartDate: company.ctapStartDate,` arguments (and the `// Newly created company ...` comment) from the `materialiseFilings({...})` call.

(Leave the `uniqueTaxReference`/`registeredForCorpTax` fields on `prisma.company.create` at lines 262-263 — the invariant still needs them.)

- [ ] **Step 5: Update `full-resync.ts` (both removed fields)**

In `src/lib/companies-house/full-resync.ts`, the `materialiseFilings({...})` call (~line 154-165) is a direct call with an inline object literal, so **every** removed `MaterialiseFilingsInput` field passed there is a TS2353 excess-property error after Step 3 — both must go, not just `ctapStartDate`:
- Remove the `registeredForCorpTax: company.registeredForCorpTax,` argument (~line 160) **and** the `ctapStartDate: company.ctapStartDate,` argument (~line 165) from the `materialiseFilings({...})` call. Delete the now-orphaned `// Thread the real CT anchor …` comment (~lines 163-164) too.
- In the company `select`, remove `registeredForCorpTax: true` (line ~92) and `ctapStartDate: true` (line 93). (`company` is still used for `companyRegistrationNumber` etc. — keep the rest.)
- The `deleteMany` NOT-clause for `ctapUserEdited` ct600s is unrelated — leave it.

- [ ] **Step 6: Fix the `full-resync.test.ts` ctapStartDate-threading test**

`src/__tests__/lib/full-resync.test.ts` has a test (~lines 96-109, labelled `(I1)`) `"threads the company's ctapStartDate into materialiseFilings"` that asserts `expect(arg?.ctapStartDate).toEqual(anchor)`. After Step 5 that arg is gone, so the assertion fails (the `as never` mock cast hides it from `tsc`, but `npm test` in Task 10 would go red). **Delete that `(I1)` test** (and any sibling assertion on `arg?.registeredForCorpTax`); keep the other full-resync tests (the `deleteMany` NOT-clause / `ctapUserEdited` protection tests) unchanged.

- [ ] **Step 7: Run tests + typecheck + lint**

Run: `npx vitest run src/__tests__/lib/materialise-filings.test.ts src/__tests__/lib/full-resync.test.ts && npx tsc --noEmit && npx eslint src/lib/companies-house/materialise-filings.ts src/app/api/company/route.ts src/lib/companies-house/full-resync.ts`
Expected: PASS; `tsc` clean (no caller still passes the removed fields); lint clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/companies-house/materialise-filings.ts src/app/api/company/route.ts src/lib/companies-house/full-resync.ts src/__tests__/lib/materialise-filings.test.ts src/__tests__/lib/full-resync.test.ts
git commit -m "feat: resync no longer materialises CT600 or threads ctapStartDate/registeredForCorpTax"
```

---

## Task 4: Re-base the CT600 editor seed on the accounts period (page.tsx)

Lets the manual editor create a CT600 chain from scratch (no pre-existing `targetCt600`, no `ctapStartDate`).

**Files:**
- Create: `src/lib/ct600-editor-seed.ts`
- Test: `src/__tests__/lib/ct600-editor-seed.test.ts` (new)
- Modify: `src/app/(app)/company/[companyId]/page.tsx` (derivation lines 47-131; imports line 18; tab gating lines 196-198 + 228-240; `SettingsTab` `firstPeriodStart` prop line 270 — see Task 6)

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
    });
    expect(seed).toBeTruthy();
    expect(seed!.accountsPeriodStartISO).toBe("2023-01-01");
    expect(seed!.accountsPeriodEndISO).toBe("2023-12-31");
    expect(seed!.suggested.length).toBe(1); // 12-month period → single CTAP, anchored at accounts start
    expect(seed!.immutable).toEqual([]);
  });

  it("skips an accounts span already protected by a filed CT600 and advances", () => {
    const seed = deriveCt600EditorSeed({
      filings: [
        { filingType: "accounts", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: false },
        { filingType: "accounts", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: false },
        { filingType: "ct600", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "accepted", suppressedAt: null, ctapUserEdited: false },
      ],
    });
    expect(seed!.accountsPeriodStartISO).toBe("2023-01-01");
  });

  it("skips an accounts span protected by an OUTSTANDING but user-edited CT600", () => {
    const seed = deriveCt600EditorSeed({
      filings: [
        { filingType: "accounts", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: false },
        { filingType: "accounts", periodStart: d("2023-01-01"), periodEnd: d("2023-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: false },
        { filingType: "ct600", periodStart: d("2022-01-01"), periodEnd: d("2022-12-31"),
          startDate: null, endDate: null, status: "outstanding", suppressedAt: null, ctapUserEdited: true },
      ],
    });
    expect(seed!.accountsPeriodStartISO).toBe("2023-01-01");
  });

  it("returns null when there are no accounts periods", () => {
    expect(deriveCt600EditorSeed({ filings: [] })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/ct600-editor-seed.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the pure helper (no `ctapStartDate`)**

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
 * Picks the accounts period the manual CT600 editor should manage: the
 * earliest accounts-type Filing whose span does NOT already contain a
 * protected CT600 (submitted/accepted/etc. or user-edited); falls back to the
 * earliest accounts period. The suggested split comes from the shared
 * `generateCt600Ctaps` anchored at the accounts-period start (no ctapStartDate).
 * Returns null when the company has no accounts periods yet.
 */
export function deriveCt600EditorSeed(input: {
  filings: SeedFiling[];
}): Ct600EditorSeed | null {
  const { filings } = input;
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
    anchor: null, // ctapStartDate removed — anchor on the accounts-period start
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

> `spanHasProtectedCt600` ([ctap.ts:146](../../../src/lib/ctap.ts#L146)) protects on filed status **or** `ctapUserEdited:true`; the helper passes the real `f.ctapUserEdited` so an outstanding-but-user-edited chain still protects its span (third test case).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/ct600-editor-seed.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire into page.tsx + gate tab on UTR**

In `src/app/(app)/company/[companyId]/page.tsx`:
- Add import: `import { deriveCt600EditorSeed } from "@/lib/ct600-editor-seed";`
- **Remove line 18** `import { generateCt600Ctaps } from "@/lib/ctap";` — after this task it is only referenced inside the new helper, not in `page.tsx`; leaving it fails the Step 6 ESLint gate. (Line 19 `import { isFilingLive, isTaxFilingLive } ...` stays — used by `showFirstFilingNote`.)
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
      }) ?? undefined)
    : undefined;
```

- Tab list (lines 196-198): change the gate from `company.registeredForCorpTax` to `hasUtr`:

```tsx
          ...(hasUtr
            ? [{ key: "corp-tax", label: "Corporation Tax", href: `/company/${companyId}?tab=corp-tax` }]
            : []),
```

- Tab render (line 228): change `tab === "corp-tax" && company.registeredForCorpTax` → `tab === "corp-tax" && hasUtr`.
- Leave `activeCT600Count` (lines 47-50) and other `SettingsTab` props as-is here; the `firstPeriodStart` prop is removed in Task 6 (do it there to keep this task's diff focused).

- [ ] **Step 6: Typecheck + lint**

Run: `npx tsc --noEmit && npx eslint "src/app/(app)/company/[companyId]/page.tsx" src/lib/ct600-editor-seed.ts`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add src/lib/ct600-editor-seed.ts src/__tests__/lib/ct600-editor-seed.test.ts "src/app/(app)/company/[companyId]/page.tsx"
git commit -m "feat: seed CT600 editor from accounts period; gate Corp Tax tab on UTR"
```

---

## Task 5: Drop `Company.ctapStartDate` (column + dead helper + Settings UI)

Depends on Tasks 1-4 having removed all column readers/writers and `getNextCtapStart`'s only caller.

**Files:**
- Modify: `prisma/schema.prisma` (line 83) + new migration
- Modify: `src/lib/ctap.ts` (delete `getNextCtapStart` lines 47-74)
- Modify: `src/__tests__/lib/ctap.test.ts` (delete `getNextCtapStart` cases)
- Modify: `src/components/settings-tab.tsx` (state line 28; date input + help text ~lines 155-163; payload line 70)
- Modify: `src/components/settings-tab.tsx` `SettingsTabProps` (remove `firstPeriodStart`) + `src/app/(app)/company/[companyId]/page.tsx` line 270 (stop passing `firstPeriodStart`)

- [ ] **Step 1: Delete the dead `getNextCtapStart` helper + its tests**

- In `src/lib/ctap.ts`, delete `getNextCtapStart` (the doc comment + function, lines 47-74). `computeCtaps`, `generateCt600Ctaps`, `validateCtapChain`, `spanHasProtectedCt600` stay.
- In `src/__tests__/lib/ctap.test.ts`, delete every `getNextCtapStart` describe/it block and remove it from the import.

Run: `npx vitest run src/__tests__/lib/ctap.test.ts`
Expected: PASS (remaining helper tests still green).

- [ ] **Step 2: Remove the Settings CTAP-start input**

In `src/components/settings-tab.tsx`:
- Remove `firstPeriodStart` from `SettingsTabProps` and the function params.
- Delete the `const [ctapStartInput, setCtapStartInput] = useState(...)` state (line 28).
- In `handleEnableCorpTax` (line 70), remove `ctapStartDate: ctapStartInput || undefined` from the PATCH body — leaving `{ companyId, registeredForCorpTax: true, uniqueTaxReference: utrInput.trim() }`.
- In the enable form JSX, delete the `<input type="date" value={ctapStartInput} ... />` and its sibling help-text `<p>` ("CT accounting period start date. Usually matches…") (~lines 155-163). Keep the UTR input, Save, Cancel.
- In `src/app/(app)/company/[companyId]/page.tsx`, delete the `firstPeriodStart={company.accountingPeriodStart.toISOString()}` prop on `<SettingsTab .../>` (line 270).

Run: `npx tsc --noEmit && npx eslint src/components/settings-tab.tsx "src/app/(app)/company/[companyId]/page.tsx"`
Expected: clean.

- [ ] **Step 3: Drop the schema column + migration**

- In `prisma/schema.prisma`, delete line 83 `ctapStartDate             DateTime?` from the `Company` model.
- Generate the migration:

Run: `npx prisma migrate dev --name drop_company_ctap_start_date`
Expected: a migration containing `ALTER TABLE "Company" DROP COLUMN "ctapStartDate";`, applied to the local DB; `npx prisma generate` runs as part of `migrate dev`.

- [ ] **Step 4: Full typecheck + lint + targeted tests**

Run: `npx tsc --noEmit && npm run lint && npx vitest run src/__tests__/lib/ctap.test.ts src/__tests__/lib/ct600-editor-seed.test.ts src/__tests__/lib/materialise-filings.test.ts src/__tests__/api/company-update-ct600.test.ts`
Expected: `tsc` clean (no remaining `ctapStartDate` references anywhere — Prisma client no longer has the field); lint clean; tests PASS. If `tsc` reports a stray `ctapStartDate`/`getNextCtapStart` reference, fix that file before continuing.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/ctap.ts src/__tests__/lib/ctap.test.ts src/components/settings-tab.tsx "src/app/(app)/company/[companyId]/page.tsx"
git commit -m "feat: drop Company.ctapStartDate (column, wiring, dead getNextCtapStart, Settings UI)"
```

---

## Task 6: Remove-unfiled-CT600 — `DELETE` endpoint + per-row button

**Files:**
- Modify: `src/app/api/company/ct600-periods/route.ts` (add `DELETE`)
- Test: `src/__tests__/api/ct600-periods-delete.test.ts` (new)
- Modify: `src/components/corp-tax-tab.tsx` (per-row remove button + confirm)

- [ ] **Step 1: Write the failing endpoint test**

Create `src/__tests__/api/ct600-periods-delete.test.ts`, mirroring the auth/Prisma mock pattern of the existing `src/__tests__/api/ct600-periods.test.ts`. Cases:

```ts
// 1. Unauthorised → 401 when no session
// 2. Company not owned by session user → 404
// 3. filingId not a ct600 of that company → 404
// 4. status in {submitted, accepted, filed_elsewhere, pending} → 409, no delete
// 5. status 'outstanding' → prisma.filing.delete called with { where: { id } }, 200 { ok: true }
// 6. status 'failed' → deleted (200)
// 7. status 'rejected' → deleted (200)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/api/ct600-periods-delete.test.ts`
Expected: FAIL — `DELETE` not exported.

- [ ] **Step 3: Add the `DELETE` handler**

Append to `src/app/api/company/ct600-periods/route.ts` (reuse the existing imports `getServerSession`, `authOptions`, `prisma`):

```ts
const REMOVABLE = new Set(["outstanding", "failed", "rejected"]);

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { companyId?: string; filingId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const { companyId, filingId } = body;
  if (!companyId || !filingId)
    return NextResponse.json({ error: "companyId and filingId are required" }, { status: 400 });

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const filing = await prisma.filing.findFirst({
    where: { id: filingId, companyId, filingType: "ct600" },
    select: { id: true, status: true },
  });
  if (!filing) return NextResponse.json({ error: "Filing not found" }, { status: 404 });

  if (!REMOVABLE.has(filing.status))
    return NextResponse.json(
      { error: "This CT600 has been submitted or filed and cannot be removed." },
      { status: 409 },
    );

  await prisma.filing.delete({ where: { id: filing.id } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/api/ct600-periods-delete.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the per-row remove button + confirm in the Corp Tax tab**

In `src/components/corp-tax-tab.tsx`, for each row in the **outstanding** list (and the failed/rejected rows if rendered there), add a small "Remove" control (e.g. `Trash2` from `lucide-react`, already used in `settings-tab.tsx`). Only render it when the row's `filing.status` is in `{outstanding, failed, rejected}`. Clicking opens a confirm modal (match the `settings-tab.tsx` confirm-modal markup/Tailwind classes — `fixed inset-0 bg-black/50 …`). Confirm calls:

```ts
await fetch("/api/company/ct600-periods", {
  method: "DELETE",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ companyId, filingId: f.id }),
});
// on ok → router.refresh()
```

Use a client component (`corp-tax-tab.tsx` is already `"use client"`), `useRouter` from `next/navigation` (already imported in sibling components), local `useState` for the pending-confirm filing id and a saving flag. Show the server error message on failure. Styling: Tailwind utilities only, match neighbouring rows; no inline `style`.

- [ ] **Step 6: Lint + build**

Run: `npx eslint src/components/corp-tax-tab.tsx src/app/api/company/ct600-periods/route.ts && npm run build`
Expected: clean; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/company/ct600-periods/route.ts src/__tests__/api/ct600-periods-delete.test.ts src/components/corp-tax-tab.tsx
git commit -m "feat: remove unfiled CT600s (DELETE endpoint + Corp Tax tab button)"
```

---

## Task 7: Context-aware empty state in the Corporation Tax tab

When a UTR'd company has no confirmed CT600 yet, guide the user to set up periods instead of a bare empty list.

**Files:**
- Modify: `src/components/corp-tax-tab.tsx` (`activeTab === "outstanding"` section + the "Manage periods" button copy ~lines 84-95)
- Test: none — purely presentational; verified by the Task 10 smoke checklist (item 4). Do not create a test file for this.

- [ ] **Step 1: Add the empty state**

When `activeTab === "outstanding"` and `outstanding.length === 0`:
- If `canManagePeriods`: render a short empty-state card (one plain-English sentence, no jargon — copy written on the fly per project convention) plus the action button; relabel that button **"Set up CT600 periods"** when `outstanding.length === 0 && completed.length === 0 && filedElsewhere.length === 0`, else keep "Manage periods".
- Tailwind utilities only, match `filings-tab.tsx` styling. No inline `style`.

- [ ] **Step 2: Lint + build**

Run: `npx eslint src/components/corp-tax-tab.tsx && npm run build`
Expected: clean; build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/corp-tax-tab.tsx
git commit -m "feat: empty-state guidance for CT600 setup in Corp Tax tab"
```

---

## Task 8: Delete dead code and retire the CT600 backfill script

**Files:**
- Delete: `src/components/enable-corp-tax.tsx`
- Delete: `scripts/backfill-ct600-ctaps.ts`, `src/__tests__/lib/backfill-ct600.test.ts`

- [ ] **Step 1: Re-confirm `enable-corp-tax.tsx` is unused**

Run: `grep -rn "components/enable-corp-tax\|<EnableCorpTax" src --include="*.ts" --include="*.tsx" | grep -v __tests__`
Expected: **no output**. This matches a real import / JSX usage only; it deliberately does NOT match the unrelated local function `handleEnableCorpTax` in `settings-tab.tsx` (the in-use Settings UTR-entry path, intentionally left alone). If this prints anything, STOP and surface — do not delete.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/enable-corp-tax.tsx scripts/backfill-ct600-ctaps.ts src/__tests__/lib/backfill-ct600.test.ts
```

- [ ] **Step 3: Typecheck + full lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dead enable-corp-tax component and CT600 backfill script"
```

---

## Task 9: One-off migration — clear unconfirmed auto-generated CT600 rows

**Files:**
- Create: `prisma/migrations/<timestamp>_clear_auto_ct600_filings/migration.sql`

- [ ] **Step 1: Generate an empty migration**

Run: `npx prisma migrate dev --name clear_auto_ct600_filings --create-only`
Expected: a new empty migration dir (no schema diff — schema unchanged by this task; the column drop already happened in Task 5).

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
Then (note the `user_edited`/`history` counts *before* trusting the result):

```bash
npx prisma db execute --stdin <<'SQL'
SELECT
  COUNT(*) FILTER (WHERE "filingType"='ct600' AND "status"='outstanding' AND "ctapUserEdited"=false) AS remaining_auto,
  COUNT(*) FILTER (WHERE "filingType"='ct600' AND "ctapUserEdited"=true) AS user_edited,
  COUNT(*) FILTER (WHERE "filingType"='ct600' AND "status" IN ('submitted','accepted','rejected','failed','filed_elsewhere')) AS history
FROM "Filing";
SQL
```

Expected: `remaining_auto = 0`; `user_edited` and `history` unchanged.

- [ ] **Step 4: Commit**

```bash
git add prisma/migrations
git commit -m "feat: migration clears unconfirmed auto-generated CT600 filings"
```

> **Production note (surface to Ben at handoff, do not auto-run):** Tasks 5 and 9 both add migrations that mutate production data on the next `prisma migrate deploy` (Vercel deploy) — Task 5 *drops the `ctapStartDate` column* and Task 9 *deletes unconfirmed auto CT600 rows*. Both are safe by construction but Ben should know they execute on deploy.

---

## Task 10: Full verification

- [ ] **Step 1: Full test suite** — Run: `npm test` — Expected: all green (baseline before this work: 403/0 across 39 files; net count shifts as CT600 tests change and `backfill-ct600`/`getNextCtapStart` tests are removed). The gate is **all green**, no new failures.

- [ ] **Step 2: Lint + typecheck + build** — Run: `npm run lint && npx tsc --noEmit && npm run build` — Expected: clean / build succeeds.

- [ ] **Step 3: Manual smoke checklist** (`npm run dev`):
1. Company **without** UTR → no "Corporation Tax" tab; `?tab=corp-tax` renders nothing.
2. Settings → "Enable CT600" → the form shows **only** a UTR field (no date input) → enter a valid 10-digit UTR + Save → "Corporation Tax" tab appears.
3. Corp Tax tab, no CT600 yet → empty-state guidance + "Set up CT600 periods" button.
4. Click it → editor opens pre-filled with the suggested split for the earliest accounts period (anchored at accounts-period start) → confirm → outstanding CT600 row(s) appear (`ctapUserEdited:true`).
5. Each unfiled row shows a **Remove** button → confirm modal → row deleted (verify a submitted/accepted row, if any, has no Remove button / returns 409).
6. A "File" button is shown for a confirmed outstanding CT600 (when `NEXT_PUBLIC_TAX_FILING_LIVE=true`); `/api/file/submit` accepts it (requires `status:"outstanding"` ct600 + `company.registeredForCorpTax`, guaranteed by the invariant).
7. Re-run the daily cron locally (`curl` `create-periods` with the `CRON_SECRET` bearer) → no ct600 rows created; accounts rows still created.

- [ ] **Step 4: Final commit (if smoke fixes were needed)**

```bash
git add -A && git commit -m "fix: CT600 manual-only smoke-test follow-ups"
```

---

## Notes for the executor

- **TDD:** Tasks 1-4 and 6 are strict red→green. Tasks 5, 7, 9 are verified by typecheck/lint/build/row-count rather than a new unit test — acceptable for schema/data/presentational changes.
- **Do not** drop the `Company.registeredForCorpTax` column — it is an intentional internal mirror still read by `/api/file/submit` and `dashboard-filters`. The invariant (`registeredForCorpTax === (uniqueTaxReference != null)`) is maintained by every write path; verify, don't rebuild.
- **`mark-filed/route.ts` `ctapStartDate`/`ctapEndDate` are unrelated per-filing body params** — do not touch them while removing `Company.ctapStartDate`.
- Task ordering matters: Task 5 (drop column / delete `getNextCtapStart`) must come after Tasks 1-4 remove every reader/writer; if `tsc` flags a stray reference in Task 5 Step 4, fix it there.
- The shared `src/lib/ctap.ts` helpers `generateCt600Ctaps`/`validateCtapChain`/`spanHasProtectedCt600` and the `POST /api/company/ct600-periods` endpoint stay the single source of truth for splitting/validation and remain the *only* CT600 creators (alongside no others).
- Follow `@superpowers:test-driven-development` and `@superpowers:verification-before-completion`.
