# Accounts + CT600 Pivot Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot DormantFile from CT600-only to a dual filing service — annual accounts (Companies House) as the base, CT600 (HMRC) as an optional extra per company.

**Architecture:** Schema adds a `FilingType` enum (`accounts` / `ct600`) threaded through Filing, Reminder, and all downstream logic. Company gains `registeredForCorpTax` boolean to control whether CT600 is shown/required. Filing routes restructure from `/file/[companyId]` to `/file/[companyId]/accounts` and `/file/[companyId]/ct600` with a selector landing page. Roll-forward logic (extracted to `src/lib/roll-forward.ts`) gates on all required filings being accepted before advancing the Company's accounting period.

**Tech Stack:** Next.js 15 (App Router, async params), Prisma (PostgreSQL), Resend email, Stripe billing, Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-accounts-ct600-pivot-design.md`

---

## File Map

### New files
| File | Responsibility |
|------|---------------|
| `prisma/migrations/xxx_accounts_pivot/migration.sql` | Schema migration (auto-generated) |
| `src/lib/roll-forward.ts` | Shared roll-forward logic (extracted from 3 duplicated copies) |
| `src/lib/companies-house/xml-builder.ts` | Builds CH accounts XML payload (stub — real iXBRL TBD after CH registration) |
| `src/lib/companies-house/submission-client.ts` | Submits to CH Software Filing API + polls (stub — endpoint TBD) |
| `src/app/(app)/file/[companyId]/accounts/page.tsx` | Server page wrapper for accounts filing flow |
| `src/app/(app)/file/[companyId]/accounts/accounts-flow.tsx` | Client-side multi-step accounts filing flow |
| `src/app/(app)/file/[companyId]/ct600/page.tsx` | Server page wrapper for CT600 flow (moved from current location) |
| `src/app/(app)/file/[companyId]/ct600/filing-flow.tsx` | CT600 filing flow (moved from current `filing-flow.tsx`) |
| `src/app/api/file/submit-accounts/route.ts` | POST endpoint for accounts submission |

### Major modifications
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | Add `FilingType` enum; add `registeredForCorpTax`, make `uniqueTaxReference` optional on Company; add `filingType` to Filing + Reminder; update unique constraints |
| `src/lib/utils.ts` | Add `calculateAccountsDeadline`, rename `calculateFilingDeadline` → `calculateCT600Deadline` |
| `src/lib/email/templates.ts` | Filing-type-aware reminder + confirmation emails |
| `src/components/company-form.tsx` | Add Corp Tax toggle, conditional UTR field |
| `src/app/api/company/route.ts` | Accept `registeredForCorpTax`, optional UTR, create dual reminders |
| `src/components/filing-status-badge.tsx` | Accept optional `filingType` prop, show "Awaiting CH" for accounts `polling_timeout` |
| `src/app/(app)/dashboard/page.tsx` | Dual filing rows per company (accounts + CT600) |
| `src/app/(app)/file/[companyId]/page.tsx` | Rewrite as filing type selector landing page |
| `src/app/api/file/submit/route.ts` | Scope to CT600 only, add `filingType: "ct600"`, use shared roll-forward |
| `src/app/api/cron/poll-filings/route.ts` | Use shared roll-forward, scope to CT600 filings only |
| `src/app/api/file/check-status/route.ts` | Use shared roll-forward |
| `src/app/api/cron/reminders/route.ts` | Filing-type-aware email content and file URLs |
| `src/app/page.tsx` | Landing page messaging overhaul |
| `src/app/(app)/onboarding/page.tsx` | Update heading/description text |
| `src/__tests__/lib/utils.test.ts` | Tests for new deadline functions |
| `.env.example` | Add CH env vars |

### Minor text updates
| File | Changes |
|------|---------|
| `src/components/subscription-banner.tsx` | Update messaging |
| `src/app/(app)/settings/page.tsx` | Show Corp Tax status per company |

---

## Task 1: Schema Migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/xxx_accounts_pivot/migration.sql` (auto-generated)

- [ ] **Step 1: Add FilingType enum to schema**

In `prisma/schema.prisma`, add after `FilingStatus` enum:

```prisma
enum FilingType {
  accounts
  ct600
}
```

- [ ] **Step 2: Update Company model**

Change `uniqueTaxReference` from `String` to `String?` and add `registeredForCorpTax`:

```prisma
model Company {
  id                        String     @id @default(cuid())
  userId                    String
  companyName               String
  companyRegistrationNumber String
  uniqueTaxReference        String?
  registeredForCorpTax      Boolean    @default(false)
  accountingPeriodStart     DateTime
  accountingPeriodEnd       DateTime
  deletedAt                 DateTime?
  createdAt                 DateTime   @default(now())
  updatedAt                 DateTime   @updatedAt
  user                      User       @relation(fields: [userId], references: [id])
  filings                   Filing[]
  reminders                 Reminder[]

  @@unique([userId, companyRegistrationNumber])
}
```

- [ ] **Step 3: Update Filing model**

Add `filingType` field and update unique constraint:

```prisma
model Filing {
  id                  String       @id @default(cuid())
  companyId           String
  filingType          FilingType
  periodStart         DateTime
  periodEnd           DateTime
  status              FilingStatus @default(pending)
  hmrcCorrelationId   String?
  hmrcResponsePayload String?
  submittedAt         DateTime?
  confirmedAt         DateTime?
  createdAt           DateTime     @default(now())
  company             Company      @relation(fields: [companyId], references: [id])

  @@unique([companyId, periodStart, periodEnd, filingType])
}
```

- [ ] **Step 4: Update Reminder model**

Add `filingType` field:

```prisma
model Reminder {
  id                 String     @id @default(cuid())
  companyId          String
  filingType         FilingType
  filingDeadline     DateTime
  remindersSent      Int        @default(0)
  lastReminderSentAt DateTime?
  nextReminderAt     DateTime?
  createdAt          DateTime   @default(now())
  company            Company    @relation(fields: [companyId], references: [id])
}
```

- [ ] **Step 5: Generate and apply migration**

Run: `npx prisma migrate dev --name accounts_pivot`

If the auto-generated migration doesn't handle defaults for existing rows, manually edit the migration SQL to add before the NOT NULL constraint:
```sql
UPDATE "Company" SET "registeredForCorpTax" = true WHERE "uniqueTaxReference" IS NOT NULL;
UPDATE "Filing" SET "filingType" = 'ct600';
UPDATE "Reminder" SET "filingType" = 'ct600';
```

- [ ] **Step 6: Verify migration applied**

Run: `npx prisma migrate status`
Expected: All migrations applied, no pending.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add FilingType enum and accounts pivot schema changes"
```

---

## Task 2: Deadline Utils + Tests

**Files:**
- Modify: `src/lib/utils.ts`
- Modify: `src/__tests__/lib/utils.test.ts`

- [ ] **Step 1: Write failing tests for calculateAccountsDeadline and calculateCT600Deadline**

In `src/__tests__/lib/utils.test.ts`, update the import and replace the `calculateFilingDeadline` tests:

```typescript
import {
  calculateCT600Deadline,
  calculateAccountsDeadline,
  validateUTR,
  calculateNextReminderDate,
  validatePassword,
  validateEmail,
} from "@/lib/utils";

describe("calculateCT600Deadline", () => {
  it("returns 12 months after accounting period end", () => {
    expect(calculateCT600Deadline(new Date("2026-03-31"))).toEqual(new Date("2027-03-31"));
  });
  it("handles leap year edge case", () => {
    expect(calculateCT600Deadline(new Date("2027-02-28"))).toEqual(new Date("2028-02-28"));
  });
});

describe("calculateAccountsDeadline", () => {
  it("returns 9 months after accounting period end", () => {
    expect(calculateAccountsDeadline(new Date("2026-03-31"))).toEqual(new Date("2026-12-31"));
  });
  it("handles month overflow correctly", () => {
    expect(calculateAccountsDeadline(new Date("2026-06-30"))).toEqual(new Date("2027-03-30"));
  });
  it("clamps end-of-month correctly (May 31 + 9 months = Feb 28)", () => {
    const result = calculateAccountsDeadline(new Date("2026-05-31"));
    expect(result.getUTCFullYear()).toBe(2027);
    expect(result.getUTCMonth()).toBe(1); // February
    expect(result.getUTCDate()).toBe(28);
  });
});
```

Keep all existing `validateUTR`, `calculateNextReminderDate`, `validatePassword`, `validateEmail` tests unchanged.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/utils.test.ts`
Expected: FAIL — `calculateAccountsDeadline` and `calculateCT600Deadline` not defined.

- [ ] **Step 3: Implement deadline functions**

Update `src/lib/utils.ts`:

```typescript
export function calculateCT600Deadline(accountingPeriodEnd: Date): Date {
  const deadline = new Date(accountingPeriodEnd);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + 1);
  return deadline;
}

// Alias for backwards compat — remove once all call sites updated (Task 15)
export const calculateFilingDeadline = calculateCT600Deadline;

export function calculateAccountsDeadline(accountingPeriodEnd: Date): Date {
  const deadline = new Date(accountingPeriodEnd);
  const targetMonth = deadline.getUTCMonth() + 9;
  const originalDate = deadline.getUTCDate();
  deadline.setUTCMonth(targetMonth, 1);
  const maxDay = new Date(Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth() + 1, 0)).getUTCDate();
  deadline.setUTCDate(Math.min(originalDate, maxDay));
  return deadline;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/utils.test.ts`
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils.ts src/__tests__/lib/utils.test.ts
git commit -m "feat: add calculateAccountsDeadline and rename to calculateCT600Deadline"
```

---

## Task 3: Email Templates — Filing-Type-Aware

Move this before the API changes so downstream tasks can use the updated signatures.

**Files:**
- Modify: `src/lib/email/templates.ts`

- [ ] **Step 1: Update ReminderEmailData and buildReminderEmail**

Add `filingType: "accounts" | "ct600"` to `ReminderEmailData`. Update the function body to use filing-type-specific labels, body text, and penalty notes:

- `filingType === "accounts"`: label "Annual accounts", body "Companies House", penalty "Companies House imposes a £150 penalty..."
- `filingType === "ct600"`: label "CT600", body "HMRC", penalty "HMRC imposes an initial penalty of £100..."

- [ ] **Step 2: Update FilingConfirmationEmailData and buildFilingConfirmationEmail**

Add `filingType: "accounts" | "ct600"` to `FilingConfirmationEmailData`. Use filing-type-specific labels:

- Subject: `${filingLabel} filed successfully: ${companyName}`
- Body: references Companies House or HMRC as appropriate

- [ ] **Step 3: Commit**

```bash
git add src/lib/email/templates.ts
git commit -m "feat: filing-type-aware email templates for accounts and CT600"
```

---

## Task 4: Extract Shared Roll-Forward Logic

The current codebase has `rollForwardPeriod` duplicated in 3 files: `submit/route.ts`, `poll-filings/route.ts`, `check-status/route.ts`. Extract to a shared utility.

**Files:**
- Create: `src/lib/roll-forward.ts`

- [ ] **Step 1: Create roll-forward.ts**

```typescript
import { prisma } from "@/lib/db";
import { calculateAccountsDeadline, calculateCT600Deadline, calculateNextReminderDate } from "@/lib/utils";
import { resend } from "@/lib/email/client";
import { buildFilingConfirmationEmail } from "@/lib/email/templates";

export async function rollForwardPeriod(
  companyId: string,
  oldPeriodEnd: Date,
  registeredForCorpTax: boolean,
  filingType: "accounts" | "ct600",
  userEmail: string,
  companyName: string
): Promise<void> {
  // Check if all required filings for this period are accepted
  const acceptedFilings = await prisma.filing.findMany({
    where: { companyId, periodEnd: oldPeriodEnd, status: "accepted" },
    select: { filingType: true },
  });
  const acceptedTypes = new Set(acceptedFilings.map((f) => f.filingType));

  if (!acceptedTypes.has("accounts")) return;
  if (registeredForCorpTax && !acceptedTypes.has("ct600")) return;

  // All required filings accepted — roll forward
  const newPeriodStart = new Date(oldPeriodEnd);
  newPeriodStart.setUTCDate(newPeriodStart.getUTCDate() + 1);
  const newPeriodEnd = new Date(oldPeriodEnd);
  newPeriodEnd.setUTCFullYear(newPeriodEnd.getUTCFullYear() + 1);

  const newAccountsDeadline = calculateAccountsDeadline(newPeriodEnd);
  const reminders: Array<{
    companyId: string;
    filingType: "accounts" | "ct600";
    filingDeadline: Date;
    remindersSent: number;
    nextReminderAt: Date | null;
  }> = [{
    companyId,
    filingType: "accounts",
    filingDeadline: newAccountsDeadline,
    remindersSent: 0,
    nextReminderAt: calculateNextReminderDate(newAccountsDeadline, 0),
  }];

  if (registeredForCorpTax) {
    const newCT600Deadline = calculateCT600Deadline(newPeriodEnd);
    reminders.push({
      companyId,
      filingType: "ct600",
      filingDeadline: newCT600Deadline,
      remindersSent: 0,
      nextReminderAt: calculateNextReminderDate(newCT600Deadline, 0),
    });
  }

  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: { accountingPeriodStart: newPeriodStart, accountingPeriodEnd: newPeriodEnd },
    }),
    prisma.reminder.deleteMany({ where: { companyId } }),
    ...reminders.map((r) => prisma.reminder.create({ data: r })),
  ]);

  // Confirmation email — non-fatal
  try {
    const { subject, html } = buildFilingConfirmationEmail({
      companyName,
      periodStart: new Date(newPeriodStart.getTime() - 365 * 24 * 60 * 60 * 1000),
      periodEnd: oldPeriodEnd,
      filingType,
    });
    await resend.emails.send({
      from: "DormantFile <noreply@dormantfile.com>",
      to: userEmail,
      subject,
      html,
    });
  } catch {
    // Must not block
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/roll-forward.ts
git commit -m "feat: extract shared rollForwardPeriod with dual-filing gating logic"
```

---

## Task 5: Company Form — Corp Tax Toggle

**Files:**
- Modify: `src/components/company-form.tsx`

- [ ] **Step 1: Add registeredForCorpTax state**

```typescript
const [registeredForCorpTax, setRegisteredForCorpTax] = useState(false);
```

- [ ] **Step 2: Add toggle UI after accountingPeriodEnd field**

Checkbox with label "Is this company registered for Corporation Tax?" and help text explaining most newly incorporated dormant companies are not registered.

- [ ] **Step 3: Make UTR field conditional**

Wrap the UTR `FormField` in `{registeredForCorpTax && (...)}`. When unchecked, clear UTR state.

- [ ] **Step 4: Update validation**

Only validate UTR when `registeredForCorpTax` is true.

- [ ] **Step 5: Include registeredForCorpTax in form submission**

```typescript
body: JSON.stringify({
  companyName,
  companyRegistrationNumber,
  uniqueTaxReference: registeredForCorpTax ? uniqueTaxReference : undefined,
  accountingPeriodEnd,
  registeredForCorpTax,
}),
```

- [ ] **Step 6: Commit**

```bash
git add src/components/company-form.tsx
git commit -m "feat: add Corp Tax toggle and conditional UTR field to company form"
```

---

## Task 6: Company API — Dual Reminders

**Files:**
- Modify: `src/app/api/company/route.ts`

- [ ] **Step 1: Accept registeredForCorpTax and make UTR optional**

Update validation: require `companyName`, `companyRegistrationNumber`, `accountingPeriodEnd`. Only require `uniqueTaxReference` if `registeredForCorpTax` is true.

- [ ] **Step 2: Create company with dual reminders**

Import `calculateAccountsDeadline` and `calculateCT600Deadline`. Always create an accounts reminder. If `registeredForCorpTax`, also create a CT600 reminder. Store `uniqueTaxReference` as null when not registered.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/company/route.ts
git commit -m "feat: company creation with dual reminders for accounts and CT600"
```

---

## Task 7: Filing Status Badge — FilingType-Aware

**Files:**
- Modify: `src/components/filing-status-badge.tsx`

- [ ] **Step 1: Add optional filingType prop**

```typescript
interface FilingStatusBadgeProps {
  status: FilingStatus;
  filingType?: "accounts" | "ct600";
}
```

- [ ] **Step 2: Show "Awaiting CH" for accounts polling_timeout**

In the component, override the label for `polling_timeout` when `filingType === "accounts"`:

```typescript
export default function FilingStatusBadge({ status, filingType }: FilingStatusBadgeProps) {
  const config = statusConfig[status];
  const label = status === "polling_timeout" && filingType === "accounts"
    ? "Awaiting CH"
    : config.label;
  // ... render with label instead of config.label
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/filing-status-badge.tsx
git commit -m "feat: filing status badge shows Awaiting CH for accounts filings"
```

---

## Task 8: Filing Route Restructure

Move CT600 flow to `/file/[companyId]/ct600/`, rewrite `/file/[companyId]/page.tsx` as selector.

**Important:** All new pages use async params pattern: `params: Promise<{ companyId: string }>` and `const { companyId } = await params;` — matching the existing codebase.

**Files:**
- Create: `src/app/(app)/file/[companyId]/ct600/page.tsx`
- Create: `src/app/(app)/file/[companyId]/ct600/filing-flow.tsx`
- Modify: `src/app/(app)/file/[companyId]/page.tsx`
- Delete: `src/app/(app)/file/[companyId]/filing-flow.tsx`

- [ ] **Step 1: Copy filing-flow.tsx to ct600 subfolder**

Copy `src/app/(app)/file/[companyId]/filing-flow.tsx` → `src/app/(app)/file/[companyId]/ct600/filing-flow.tsx`. No code changes needed.

- [ ] **Step 2: Create CT600 page wrapper**

Create `src/app/(app)/file/[companyId]/ct600/page.tsx`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import FilingFlow from "./filing-flow";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function CT600FilingPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { companyId } = await params;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.subscriptionStatus !== "active") redirect("/dashboard");

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) redirect("/dashboard");
  if (!company.registeredForCorpTax) redirect(`/file/${companyId}`);

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <FilingFlow
        companyId={company.id}
        companyName={company.companyName}
        uniqueTaxReference={company.uniqueTaxReference!}
        declarantName={user.name}
        periodStart={formatDate(company.accountingPeriodStart)}
        periodEnd={formatDate(company.accountingPeriodEnd)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Rewrite file/[companyId]/page.tsx as filing selector**

Replace with a selector page showing filing options per company. Uses async params pattern. Includes company filings query (no broken `where` placeholder — just include all filings ordered by `createdAt desc`). Filter by `filingType` and current `periodEnd` client-side via `.find()`.

Shows:
- Accounts card (always): deadline from `calculateAccountsDeadline`, status badge with `filingType="accounts"`, "File accounts" link
- CT600 card (if `registeredForCorpTax`): deadline from `calculateCT600Deadline`, status badge with `filingType="ct600"`, "File CT600" link

- [ ] **Step 4: Delete old filing-flow.tsx**

```bash
rm src/app/\(app\)/file/\[companyId\]/filing-flow.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/file/
git commit -m "feat: restructure filing routes with selector page and ct600 subfolder"
```

---

## Task 9: CT600 Submit API — Use Shared Roll-Forward

**Files:**
- Modify: `src/app/api/file/submit/route.ts`

- [ ] **Step 1: Replace local rollForwardPeriod with import**

Remove the local `rollForwardPeriod` function. Import from shared:

```typescript
import { rollForwardPeriod } from "@/lib/roll-forward";
```

- [ ] **Step 2: Add filingType to Filing creation, idempotency check, and stale cleanup**

Add `filingType: "ct600"` to the `prisma.filing.create`, `prisma.filing.findFirst` (idempotency), and `prisma.filing.deleteMany` (stale cleanup) calls.

- [ ] **Step 3: Guard — only allow CT600 for Corp Tax companies**

After finding the company:
```typescript
if (!company.registeredForCorpTax) {
  return NextResponse.json({ error: "This company is not registered for Corporation Tax" }, { status: 400 });
}
```

- [ ] **Step 4: Update rollForwardPeriod call**

```typescript
await rollForwardPeriod(
  companyId,
  company.accountingPeriodEnd,
  company.registeredForCorpTax,
  "ct600",
  user.email,
  company.companyName
);
```

- [ ] **Step 5: Update imports**

Replace `calculateFilingDeadline` with `calculateCT600Deadline`. Remove unused `calculateNextReminderDate`, `buildFilingConfirmationEmail`, `resend` imports (now in roll-forward.ts).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/file/submit/route.ts
git commit -m "feat: scope CT600 submit to filingType, use shared roll-forward"
```

---

## Task 10: Update poll-filings and check-status Routes

**Files:**
- Modify: `src/app/api/cron/poll-filings/route.ts`
- Modify: `src/app/api/file/check-status/route.ts`

- [ ] **Step 1: Update poll-filings/route.ts**

Remove the local `rollForwardPeriod` function. Import shared:
```typescript
import { rollForwardPeriod } from "@/lib/roll-forward";
```

Remove unused imports: `calculateFilingDeadline`, `calculateNextReminderDate`, `buildFilingConfirmationEmail`, `resend`.

Update the `rollForwardPeriod` call (line 133-138):
```typescript
await rollForwardPeriod(
  filing.companyId,
  filing.company.accountingPeriodEnd,
  filing.company.registeredForCorpTax,
  filing.filingType as "accounts" | "ct600",
  filing.company.user.email,
  filing.company.companyName
);
```

The query at line 81-91 currently only finds `polling_timeout` filings. This is correct — it will pick up both accounts and CT600 filings with that status. The shared `rollForwardPeriod` handles the gating logic.

- [ ] **Step 2: Update check-status/route.ts**

Same pattern: remove local `rollForwardPeriod`, import shared, update the call (line 163-168):

```typescript
await rollForwardPeriod(
  filing.companyId,
  filing.company.accountingPeriodEnd,
  filing.company.registeredForCorpTax,
  filing.filingType as "accounts" | "ct600",
  filing.company.user.email,
  filing.company.companyName
);
```

Remove unused imports: `calculateFilingDeadline`, `calculateNextReminderDate`, `buildFilingConfirmationEmail`, `resend`.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/poll-filings/route.ts src/app/api/file/check-status/route.ts
git commit -m "feat: poll-filings and check-status use shared roll-forward with dual-filing gating"
```

---

## Task 11: Cron Reminders — Filing-Type-Aware

**Files:**
- Modify: `src/app/api/cron/reminders/route.ts`

- [ ] **Step 1: Pass filingType to reminder email and build correct URL**

```typescript
const filingType = reminder.filingType as "accounts" | "ct600";
const filePath = filingType === "accounts" ? "accounts" : "ct600";
const fileUrl = `${appUrl}/file/${reminder.companyId}/${filePath}`;

const { subject, html } = buildReminderEmail({
  companyName: reminder.company.companyName,
  daysUntilDeadline,
  filingDeadline: reminder.filingDeadline,
  fileUrl,
  filingType,
});
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/cron/reminders/route.ts
git commit -m "feat: filing-type-aware reminder emails with correct filing URLs"
```

---

## Task 12: Dashboard — Dual Filing Display

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Update imports**

Replace `calculateFilingDeadline` with `calculateAccountsDeadline, calculateCT600Deadline`.

- [ ] **Step 2: Replace single filing section with dual filing rows**

For each company card, replace the single deadline display and "File nil CT600" action with two rows:

**Accounts row** (always shown):
- Label: "Annual Accounts"
- Deadline from `calculateAccountsDeadline(company.accountingPeriodEnd)`
- Status badge (with `filingType="accounts"`) if filing exists for current period
- "File" button linking to `/file/${company.id}/accounts` if no blocking filing

**CT600 row** (only if `company.registeredForCorpTax`):
- Label: "CT600 Corporation Tax"
- Deadline from `calculateCT600Deadline(company.accountingPeriodEnd)`
- Status badge (with `filingType="ct600"`) if filing exists for current period
- "File" button linking to `/file/${company.id}/ct600` if no blocking filing

- [ ] **Step 3: Update company card subtitle**

Show UTR only for Corp Tax companies:
```tsx
{company.registeredForCorpTax && company.uniqueTaxReference
  ? `UTR: ${company.uniqueTaxReference} · ` : ""}
{company.companyRegistrationNumber}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: dashboard shows dual filing rows per company"
```

---

## Task 13: Companies House Stubs

**Files:**
- Create: `src/lib/companies-house/xml-builder.ts`
- Create: `src/lib/companies-house/submission-client.ts`

- [ ] **Step 1: Create CH XML builder stub**

Exports `buildAccountsXml(data, credentials)` — returns placeholder XML. Marked with TODO for real iXBRL after CH registration.

- [ ] **Step 2: Create CH submission client stub**

Exports `submitToCompaniesHouse(xml, endpoint, credentials)` and `pollCompaniesHouse(submissionId, pollEndpoint, credentials)` — both throw with clear "not yet implemented" errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/companies-house/
git commit -m "feat: stub Companies House XML builder and submission client"
```

---

## Task 14: Accounts Filing Flow (UI)

**Files:**
- Create: `src/app/(app)/file/[companyId]/accounts/accounts-flow.tsx`
- Create: `src/app/(app)/file/[companyId]/accounts/page.tsx`

- [ ] **Step 1: Create accounts-flow.tsx**

Client component mirroring CT600 filing-flow structure but for accounts:
- Steps: `confirm → authenticate → submitting → result` (4 steps matching spec)
- Step "confirm": company details, period, dormant statement, Companies House context
- Step "authenticate": placeholder — "Companies House authentication will be available once software filer registration is complete. This feature is coming soon." (disabled submit button)
- Step "submitting": loading screen, "Submitting to Companies House"
- Step "result": accepted/rejected/timeout/failed with CH-specific messaging

Props: `companyId`, `companyName`, `companyRegistrationNumber`, `periodStart`, `periodEnd`

Calls `/api/file/submit-accounts`.

- [ ] **Step 2: Create accounts page.tsx**

Server component with async params:

```typescript
interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function AccountsFilingPage({ params }: PageProps) {
  const { companyId } = await params;
  // ... auth, subscription, company lookup, render AccountsFlow
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(app\)/file/\[companyId\]/accounts/
git commit -m "feat: accounts filing flow UI with confirm, auth placeholder, submit, and result steps"
```

---

## Task 15: Accounts Submit API

**Files:**
- Create: `src/app/api/file/submit-accounts/route.ts`

- [ ] **Step 1: Create the submit-accounts API route**

Mirrors `submit/route.ts` structure:
1. Auth + subscription check
2. Filing limit check (by distinct companyId)
3. Clean stale pending filings (scoped to `filingType: "accounts"`)
4. Idempotency check (scoped to `filingType: "accounts"`)
5. Create filing with `filingType: "accounts"`
6. Build XML via `buildAccountsXml`
7. Submit via `submitToCompaniesHouse` (will throw — stub)
8. Poll via `pollCompaniesHouse`
9. On acceptance: call shared `rollForwardPeriod`

Uses `import { rollForwardPeriod } from "@/lib/roll-forward"` — no local duplication.

Note: `hmrcCorrelationId`/`hmrcResponsePayload` field names are reused for CH data (naming debt, acceptable for now).

- [ ] **Step 2: Commit**

```bash
git add src/app/api/file/submit-accounts/route.ts
git commit -m "feat: accounts submission API endpoint with CH integration stubs"
```

---

## Task 16: Landing Page Messaging Overhaul

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update hero**

- Heading: "File your dormant company **accounts** in minutes" (accounts in blue)
- Sub: "Annual accounts with Companies House, plus Corporation Tax returns with HMRC — all from one dashboard."

- [ ] **Step 2: Update trust indicators**

Third indicator: "Direct submission" / "Filed directly with Companies House and HMRC via official APIs."

- [ ] **Step 3: Update How It Works step 3**

"File in minutes / We submit your accounts to Companies House and your CT600 to HMRC."

- [ ] **Step 4: Update problem statement**

Mention annual accounts alongside CT600: "Every year, Companies House requires annual accounts and HMRC requires a Corporation Tax return..."

- [ ] **Step 5: Update pricing features**

Basic: "Annual accounts + CT600 filing for one company". Update other plan features similarly.

- [ ] **Step 6: Update FAQ**

Add "What if my company isn't registered for Corporation Tax?" question. Update existing Q&A for dual filing context.

- [ ] **Step 7: Update final CTA**

"Ready to stop worrying about your dormant company filings?"

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: update landing page messaging for dual filing service"
```

---

## Task 17: Onboarding, Env, and Minor Text Updates

**Files:**
- Modify: `src/app/(app)/onboarding/page.tsx`
- Modify: `.env.example`
- Modify: `src/components/subscription-banner.tsx`
- Modify: `src/app/(app)/settings/page.tsx`

- [ ] **Step 1: Update onboarding text**

Description: "Enter your company details below. We use this information to prepare and file your annual accounts and Corporation Tax returns on time, every year."

Security notice: "Your data is protected with industry-standard encryption. We only use these details to file your accounts and tax returns."

- [ ] **Step 2: Update .env.example**

Add:
```
# Companies House (Software Filing)
COMPANIES_HOUSE_PRESENTER_ID=...
COMPANIES_HOUSE_PRESENTER_AUTH=...
COMPANIES_HOUSE_FILING_ENDPOINT=https://xmlgw.companieshouse.gov.uk/v1-0/xmlgw/Gateway
```

- [ ] **Step 3: Update subscription banner**

Replace any "CT600" references with "filing" or "dormant company filings".

- [ ] **Step 4: Update settings page**

Show Corp Tax registration status per company if a settings page company list exists.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/onboarding/page.tsx .env.example src/components/subscription-banner.tsx src/app/\(app\)/settings/page.tsx
git commit -m "feat: update onboarding, env vars, and minor text for dual filing"
```

---

## Task 18: Update All Import References + Remove Alias

**Files:**
- All files still importing `calculateFilingDeadline`

- [ ] **Step 1: Find and update all references**

Run: `grep -r "calculateFilingDeadline" src/ --include="*.ts" --include="*.tsx" -l`

For each file, replace with `calculateCT600Deadline` or `calculateAccountsDeadline` as appropriate.

- [ ] **Step 2: Remove alias from utils.ts**

Delete: `export const calculateFilingDeadline = calculateCT600Deadline;`

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: replace all calculateFilingDeadline references with explicit deadline functions"
```

---

## Task 19: Final Verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Clean build, no TypeScript errors.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`
Verify:
1. Landing page shows dual filing messaging
2. Onboarding form has Corp Tax toggle, UTR conditional
3. Adding company without Corp Tax → 1 accounts reminder created
4. Adding company with Corp Tax → 2 reminders created
5. Dashboard shows dual filing rows (accounts + CT600) for Corp Tax companies, single row for accounts-only
6. `/file/[companyId]` shows filing selector with correct deadlines
7. `/file/[companyId]/ct600` loads CT600 flow (Corp Tax companies only; non-Corp-Tax redirected)
8. `/file/[companyId]/accounts` loads accounts flow with placeholder auth step
9. Accounts submission fails gracefully (stub not implemented)
10. Filing status badges show "Awaiting CH" for accounts polling_timeout

- [ ] **Step 4: Final commit if any cleanup needed**
