# Accounts + CT600 Pivot Spec

**Date:** 2026-03-27
**Scope:** Pivot DormantFile from CT600-only to a dual filing service — annual accounts (Companies House) as the base, CT600 (HMRC) as an optional extra per company.

---

## Product Model

The app becomes a dormant company filing service handling two filing types:

1. **Annual accounts** (Companies House) — every company, every year. Nil balance sheet for companies that have traded but are now dormant with no assets/liabilities. Due **9 months** after accounting period end.
2. **CT600 Corporation Tax return** (HMRC) — optional, only for companies registered for Corporation Tax. Due **12 months** after accounting period end.

Pricing stays the same (£19/£39/£49 for 1/10/100 companies). Both filing types included. No existing users to migrate — app is not live.

---

## Schema Changes

### Company model

```prisma
model Company {
  ...existing fields...
  registeredForCorpTax      Boolean    @default(false)
  uniqueTaxReference        String?    // was required, now optional (only needed if registeredForCorpTax)
  ...
}
```

### Filing model

New enum and field:

```prisma
enum FilingType {
  accounts
  ct600
}

model Filing {
  ...existing fields...
  filingType            FilingType
  ...
  @@unique([companyId, periodStart, periodEnd, filingType])  // was [companyId, periodStart, periodEnd]
}
```

### Reminder model

```prisma
model Reminder {
  ...existing fields...
  filingType            FilingType
}
```

### Deadline calculation

- `calculateAccountsDeadline(periodEnd)`: `periodEnd + 9 months`
- `calculateFilingDeadline(periodEnd)`: `periodEnd + 12 months` (existing, renamed to `calculateCT600Deadline`)

Both functions go in `src/lib/utils.ts`.

---

## Company Onboarding Changes

### Form updates

The company form adds a toggle after the existing fields:

- **"Is this company registered for Corporation Tax?"** — checkbox/toggle, default unchecked
- If checked: UTR field appears (required, validated as 10 digits)
- If unchecked: UTR field hidden, not required

### API changes (`/api/company`)

- `registeredForCorpTax` accepted in request body (boolean, defaults to false)
- `uniqueTaxReference` only required if `registeredForCorpTax` is true
- On company creation:
  - Always create an accounts reminder (deadline = periodEnd + 9 months)
  - If `registeredForCorpTax`: also create a CT600 reminder (deadline = periodEnd + 12 months)

---

## Dashboard Changes

Each company card shows **two filing sections** (when registered for Corp Tax) or one (when not):

### Accounts filing row

- Deadline: "Accounts due: 31 Dec 2026"
- Status badge (if filed): Accepted / Awaiting CH / etc.
- Action button: "File accounts" (or status message if filed/in progress)

### CT600 filing row (only if `registeredForCorpTax`)

- Deadline: "CT600 due: 31 Mar 2027"
- Status badge (if filed): Accepted / Awaiting HMRC / etc.
- Action button: "File CT600" (or status message if filed/in progress)

The filing limit count (per billing period) counts each filing type independently — filing accounts for Company A and CT600 for Company A counts as 1 company used (not 2), since both are part of servicing that single company.

---

## Filing Flow Changes

### Accounts filing flow (NEW)

New multi-step flow at `/file/[companyId]/accounts`:

1. **Confirm** — show company details, accounting period, confirm the company is dormant with nil assets/liabilities
2. **Authenticate** — enter Companies House authentication credentials (Companies House uses a different auth mechanism — either a presenter ID/auth code or the company's registered email authentication)
3. **Submit** — build XML, submit to Companies House Software Filing API, poll for response
4. **Result** — accepted/rejected/timeout with appropriate messaging

Requires:

- `src/lib/companies-house/xml-builder.ts` — builds the accounts XML payload
- `src/lib/companies-house/submission-client.ts` — submits to CH and polls for response
- Companies House vendor registration (similar to HMRC SDST registration)

### CT600 filing flow (EXISTING)

Stays at `/file/[companyId]/ct600` (rename from `/file/[companyId]`).

The existing flow is unchanged except:

- Route moves from `/file/[companyId]` to `/file/[companyId]/ct600`
- Only accessible for companies with `registeredForCorpTax: true`

### Filing page (`/file/[companyId]`)

Becomes a landing page showing both filing options for the company:

- "File annual accounts" card — with CH deadline, status
- "File CT600" card (if registered) — with HMRC deadline, status

Each card links to its respective flow.

---

## Reminder Changes

Each company can have up to two reminder chains:

- **Accounts reminders** — same schedule (90, 30, 14, 7, 3, 1 days before) but against the 9-month deadline
- **CT600 reminders** — same schedule against the 12-month deadline (existing behavior)

The reminder email templates need updating to specify which filing type the reminder is for.

The cron job (`/api/cron/reminders`) queries reminders regardless of `filingType` — the email content differentiates.

---

## Period Roll-Forward Changes

Currently, when a CT600 is accepted, the app rolls the accounting period forward by 1 year and creates a new reminder.

With two filing types:

- Each filing type rolls forward independently when accepted
- Accounts acceptance: creates new accounts reminder for next period
- CT600 acceptance: creates new CT600 reminder for next period
- The accounting period on the Company model rolls forward when **either** filing is accepted (since both share the same period)

Edge case: if accounts are filed and accepted but CT600 hasn't been filed yet, the period shouldn't roll forward until both are done (for companies registered for Corp Tax). Otherwise the CT600 would reference a stale period.

**Resolution:** Don't roll the Company's accounting period forward until all required filings for that period are accepted. Check: if `registeredForCorpTax`, both must be accepted. If not, only accounts must be accepted.

---

## Messaging & Branding Changes

### Landing page

- Hero: "File your dormant company accounts in minutes" (not "CT600 in one click")
- Sub-hero: "Annual accounts with Companies House, plus Corporation Tax returns with HMRC — all from one dashboard."
- How it works: update step 3 to mention both filings
- Pricing features: update to list "Annual accounts filing", "CT600 filing (for Corp Tax registered companies)", etc.
- FAQ: add question about "What if my company isn't registered for Corporation Tax?" and update existing answers

### Throughout the app

- Replace "nil CT600" with "dormant company filings" or "annual accounts" where appropriate
- Filing confirmation emails: differentiate between accounts and CT600 confirmations
- Dashboard heading: "Manage your dormant company filings" (not "CT600 Corporation Tax filings")

---

## Companies House Integration

### Registration

Need to register as a software filer with Companies House (similar process to HMRC vendor registration). Contact: xml@companieshouse.gov.uk

### XML Builder (`src/lib/companies-house/xml-builder.ts`)

Builds the annual accounts submission in the format required by the CH Software Filing API. For dormant companies with nil balances, this is a simplified iXBRL document containing:

- Company information (name, registration number)
- Balance sheet date (accounting period end)
- Nil figures for all balance sheet lines
- Directors' statement that the company is dormant
- Period of accounts

### Submission Client (`src/lib/companies-house/submission-client.ts`)

Similar to the HMRC submission client:

- POST XML to Companies House endpoint
- Poll for acceptance/rejection
- Return structured response

### Environment variables

```
COMPANIES_HOUSE_PRESENTER_ID=...
COMPANIES_HOUSE_PRESENTER_AUTH=...
COMPANIES_HOUSE_FILING_ENDPOINT=...  (live vs test)
```

---

## Files Changed Summary

### New files

- `src/lib/companies-house/xml-builder.ts`
- `src/lib/companies-house/submission-client.ts`
- `src/app/(app)/file/[companyId]/page.tsx` (rewrite — becomes filing type selector)
- `src/app/(app)/file/[companyId]/accounts/page.tsx`
- `src/app/(app)/file/[companyId]/accounts/accounts-flow.tsx`
- `src/app/(app)/file/[companyId]/ct600/page.tsx` (moved from current location)
- `src/app/api/file/submit-accounts/route.ts`
- `prisma/migrations/xxx_accounts_pivot/migration.sql`

### Major modifications

- `prisma/schema.prisma` — FilingType enum, Company/Filing/Reminder changes
- `src/app/page.tsx` — landing page messaging overhaul
- `src/app/(app)/dashboard/page.tsx` — dual filing display per company
- `src/components/company-form.tsx` — Corp Tax toggle, optional UTR
- `src/app/api/company/route.ts` — handle registeredForCorpTax, dual reminders
- `src/lib/utils.ts` — add calculateAccountsDeadline
- `src/lib/email/templates.ts` — filing-type-aware templates
- `src/app/api/cron/reminders/route.ts` — filing-type-aware reminders
- `src/app/api/file/submit/route.ts` — rename/scope to CT600 only
- `src/app/(app)/file/[companyId]/filing-flow.tsx` — move to ct600 subfolder
- `src/app/(app)/onboarding/page.tsx` — update heading/description

### Minor text updates

- `src/app/privacy/page.tsx` — mention Companies House data sharing
- `src/app/terms/page.tsx` — mention accounts filing
- `src/components/subscription-banner.tsx` — update messaging
- `src/app/(app)/settings/page.tsx` — show Corp Tax status per company

---

## Out of Scope

- **Companies House company authentication flow** — details TBD once registered as software filer. The auth mechanism may differ from HMRC Gateway (likely presenter ID + company auth code). Will be refined during implementation.
- **iXBRL tagging specifics** — the exact iXBRL taxonomy for nil accounts will be determined from CH technical specifications during implementation.
- **Filing history export/PDF** — separate feature, not part of this pivot.
- **Editing a company's Corp Tax registration status after creation** — can be added later. For now, remove and re-add.
