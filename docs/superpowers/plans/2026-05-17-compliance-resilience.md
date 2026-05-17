# Compliance Resilience Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking. Follow @superpowers:test-driven-development for every task.

**Goal:** Close two silent statutory-compliance gaps — customers losing deadline tracking when their subscription lapses, and filing-confirmation emails failing invisibly.

**Architecture:** Decouple *tracking the obligation* (must happen for every known company) from *performing the paid filing* (gated at submit, already enforced). Make the confirmation notification a durable, idempotent, auditable record using the existing `Notification` model rather than fire-and-forget email.

**Tech Stack:** Next.js 16 App Router route handlers + Vercel cron, Prisma 7 / PostgreSQL, Resend, Vitest. No new infrastructure or dependencies.

---

## Grounding facts (verified against current code)

- `SubscriptionStatus` enum: `none | active | cancelling | cancelled | past_due` (`prisma/schema.prisma:9`).
- `FilingStatus` enum: `outstanding | pending | submitted | accepted | rejected | failed | filed_elsewhere` (`prisma/schema.prisma:24`).
- `Notification` model: `{ id, companyId, filingId, type: String, sentAt }` (`prisma/schema.prisma:161`). Already written in bulk by the reminders cron (`src/app/api/cron/reminders/route.ts:211`) and humanised for the UI by `src/lib/activity-timeline.ts:49`.
- **Submit gate already exists, server-side:** `src/app/api/file/submit/route.ts:56` and `src/app/api/file/submit-accounts/route.ts:46` both return 403 unless `subscriptionStatus` is `active` or `cancelling`. Risk 1 does **not** need a new gate — only removal of the *wrong* gate in `create-periods`.
- `create-periods` wrong gate: `src/app/api/cron/create-periods/route.ts:29` filters companies by `user: { subscriptionStatus: { in: ["active","cancelling"] } }`.
- Confirmation email is swallowed: `src/lib/roll-forward.ts:39` `catch {}` ("Must not block").
- **`rollForwardPeriod` has THREE callers, not two:**
  - `src/app/api/file/check-status/route.ts` (manual accept) — genuine CH/HMRC acceptance.
  - `src/app/api/cron/poll-filings/route.ts` (cron accept) — genuine CH/HMRC acceptance. Together with check-status this is the latent double-send.
  - `src/app/api/file/mark-filed/route.ts:76` and `:151` — the **`filed_elsewhere`** path (user filed it themselves elsewhere). **Both calls already pass `{ skipEmail: true }`**, and `rollForwardPeriod` short-circuits on it (`src/lib/roll-forward.ts:20` `if (options?.skipEmail) return;`), so this path is **already email-silent today**. The two genuine-acceptance callers (`check-status`, `poll-filings`) do **not** pass `skipEmail` — that flag is precisely what distinguishes them. A "we filed this and CH accepted it" confirmation is **wrong** for the filed-elsewhere path, and `filed_elsewhere` is a Stop signal in the taxonomy. Unit A must preserve this `skipEmail` boundary, not regress it.

**Taxonomy (locked):**

| Bucket | `subscriptionStatus` | Behaviour |
|---|---|---|
| Covered (we file) | `active`, `cancelling` | Materialise period; normal reminders; submit allowed |
| Lapsed (track + warn) | `past_due`, `cancelled`, `none` (with a company + upcoming obligation) | Materialise period; submit blocked (existing 403); escalating compliance/win-back track |
| Stop | company `deletedAt` set; period Filing `accepted`/`filed_elsewhere`; deadline+grace passed after final message | No further messaging |

---

## File Structure

- `src/app/api/cron/create-periods/route.ts` — remove subscription filter (Unit B).
- `src/lib/filing-confirmation.ts` — **new**: idempotent, observable confirmation send keyed on a `filing_confirmation` Notification row (Units A, D).
- `src/lib/roll-forward.ts` — delegate the email concern to the new module (Unit A).
- `src/lib/lapsed-compliance.ts` — **new**: classify a user/company into Covered/Lapsed/Stop; select the lapsed reminder cohort (Unit C).
- `src/app/api/cron/reminders/route.ts` — branch Covered vs Lapsed reminder copy/track; respect caps & stop conditions (Unit C).
- `src/lib/email/templates.ts` — add lapsed compliance/win-back template (Unit C).
- `src/lib/admin.ts` — add "at-risk: upcoming/overdue obligation + not Covered" metric (Unit C).
- `src/app/api/cron/poll-filings/route.ts` — drain unsent confirmations + 24h give-up + ops digest (Unit D).
- Tests mirror under `src/__tests__/` per existing convention.

The four units are independently shippable and testable, in this order.

---

## Unit A — Confirmation: stop swallowing, make it idempotent & auditable (Risk 2 quick win)

**Outcome:** A `filing_confirmation` `Notification` row is the single source of truth for "the customer was told filing X was accepted." Send failures are logged, never silent. The manual-check and cron accept paths can no longer double-send.

**Files:**
- Create: `src/lib/filing-confirmation.ts`
- Modify: `src/lib/roll-forward.ts:11-42`
- Modify (call sites — thread filing identity): `src/app/api/file/check-status/route.ts` (accepted branch, `filing.id`/`filing.companyId` in scope), `src/app/api/cron/poll-filings/route.ts` (accepted branch, same), `src/app/api/file/mark-filed/route.ts:76,151`
- Test: `src/__tests__/lib/filing-confirmation.test.ts`

**Load-bearing interface (must be explicit):** `sendFilingConfirmation` MUST receive `filingId` **and** `companyId` (the `Notification` model requires `companyId` non-null — `schema.prisma:163`), plus recipient + the content fields `rollForwardPeriod` already builds. The dedupe + audit key is exactly a `Notification{ filingId, type: "filing_confirmation" }` row. `rollForwardPeriod`'s current signature does not carry `filingId`; the implementer must thread `filing.id` and `filing.companyId` from each accept call site through `rollForwardPeriod` into the new module. Do not key the dedupe on anything other than `(filingId, "filing_confirmation")`.

**Third-caller rule (`mark-filed` / `filed_elsewhere`):** `sendFilingConfirmation` represents "we filed this and CH/HMRC accepted it." The existing `skipEmail` flag is the seam: `mark-filed` already passes `{ skipEmail: true }`; the two genuine-acceptance callers do not. The rewire MUST keep that boundary — `sendFilingConfirmation` (and its `filing_confirmation` Notification) is invoked **only on the non-`skipEmail` path**. The `mark-filed` / `skipEmail: true` path must continue to emit **nothing** (no email, no `filing_confirmation` row), exactly as today. Do not relocate or remove the `roll-forward.ts:20` short-circuit while threading `filingId` in a way that lets the filed-elsewhere path reach `sendFilingConfirmation`. Whether a *separate* "noted as filed elsewhere" acknowledgement is desirable is an explicit out-of-scope product decision — do not invent one here.

- [ ] **Step 1: Write failing tests (behavioural spec)** in `src/__tests__/lib/filing-confirmation.test.ts`:
  - *Given* no prior `Notification{ filingId, type:"filing_confirmation" }`, *when* `sendFilingConfirmation(filing…)` runs and the email send succeeds, *then* exactly one such Notification row is created and email sent once.
  - *Given* a `filing_confirmation` Notification already exists for that filing, *when* called again, *then* no email is sent and no duplicate row is created (idempotent — covers the check-status vs poll-filings double path).
  - *Given* the email transport throws, *then* the function does not throw, **no** `filing_confirmation` Notification row is written (so a retry can still occur), and a structured error is logged with `{filingId, companyId, recipient}`.
  - *Given* the `mark-filed` (`filed_elsewhere`) path runs `rollForwardPeriod`, *then* **no** `filing_confirmation` Notification is created and **no** "filed/accepted" email is sent (the genuine-acceptance confirmation must not fire on the filed-elsewhere path).
  - Mock Resend transport and Prisma per existing test patterns (`src/__tests__/lib/hmrc/submission-client.test.ts`, `src/__tests__/api/cron/resync-filings.test.ts`).

- [ ] **Step 2: Run tests — expect RED** (`module not found` / function undefined). Command: `npx vitest run src/__tests__/lib/filing-confirmation.test.ts`.

- [ ] **Step 3: Implement `src/lib/filing-confirmation.ts`** — `sendFilingConfirmation({ filingId, companyId, recipient, …content })` (explicit args per the load-bearing interface above) that: checks for an existing `Notification{ filingId, type:"filing_confirmation" }` (return early if present — idempotent); sends via the existing email client/template; on success creates that Notification row (`companyId` non-null); on failure logs `console.error("[filing-confirmation] send failed", { filingId, companyId, recipient, error })` and returns without throwing or writing the row. Minimal, no retry yet (Unit D adds durability).

- [ ] **Step 4: Run tests — expect GREEN.** Command as Step 2.

- [ ] **Step 5: Rewire so only genuine-acceptance callers confirm.** Recommended seam: keep the `roll-forward.ts:20` `skipEmail` short-circuit intact; replace only the inline `try/catch {}` send (the non-`skipEmail` branch) with a call to `sendFilingConfirmation`, threading `filing.id`/`filing.companyId` from the `check-status` and `poll-filings` accept call sites through `rollForwardPeriod`'s signature. Because `mark-filed` passes `{ skipEmail: true }`, it returns before reaching `sendFilingConfirmation` and remains silent with no special-casing. Keep `rollForwardPeriod`'s "must not block acceptance" contract — the swallow is now *observed and recorded* inside the new module. Tests: (a) `rollForwardPeriod` still never throws on email failure; (b) the `mark-filed` / `skipEmail: true` path emits no `filing_confirmation` and no email; (c) check-status and poll-filings each emit exactly one, and a second pass by the other path emits none (double-send fixed).

- [ ] **Step 6: Full suite + tsc + lint.** `npx vitest run && npx tsc --noEmit && npx eslint <changed files>`. Expect all green.

- [ ] **Step 7: Commit.** `git add` the new module + test + roll-forward; commit `fix: idempotent, observable filing-confirmation (Risk 2 quick win)` with the standard co-author trailer. (Push is user-driven per session norms.)

**Independently shippable:** yes — removes the silent failure and the double-send with zero schema/infra change.

---

## Unit B — Track obligations for every company (Risk 1 core)

**Outcome:** `create-periods` materialises statutory periods for **all** non-deleted companies regardless of subscription. Filing remains blocked at submit for lapsed users (existing 403). Reactivation auto-heals via the existing idempotent upsert.

**Files:**
- Modify: `src/app/api/cron/create-periods/route.ts:26-40` (remove the `user.subscriptionStatus` filter; keep `deletedAt: null`)
- Test: `src/__tests__/api/cron/create-periods.test.ts` (extend or create)
- Test: `src/__tests__/api/file/submit-accounts-gate.test.ts` (new, if not already covered)

- [ ] **Step 1: Failing test — obligations materialise for lapsed users.** *Given* a non-deleted company whose user is `past_due` (and one `cancelled`, one `none`) with a fully-elapsed accounting period and no Filing, *when* the `create-periods` GET runs, *then* an `outstanding` accounts Filing is upserted for that period. (Currently fails: the subscription filter excludes them.) Also assert **cross-run idempotency**: running the cron twice for the same lapsed company produces exactly one `outstanding` Filing for the period (no duplicate), since ungating widens the set hitting the upsert path.

- [ ] **Step 2: Failing/É regression test — submit still blocked for lapsed.** *Given* a `past_due` user, *when* POST `submit-accounts`, *then* 403 "Active subscription required" and no submission attempt. (Likely already passes via `submit-accounts/route.ts:46` — if so, this is a guard test that must stay green after Step 4; assert it explicitly so the gate can never silently regress.)

- [ ] **Step 3: Run — expect Step 1 RED, Step 2 GREEN.** `npx vitest run src/__tests__/api/cron/create-periods.test.ts src/__tests__/api/file/submit-accounts-gate.test.ts`.

- [ ] **Step 4: Remove the subscription filter** in `create-periods/route.ts` (keep `deletedAt: null`; keep the `nextEnd > now` elapsed-period break; idempotent upsert unchanged).

- [ ] **Step 5: Run — expect all GREEN** (Step 1 now passes; Step 2 still passes — proves obligations are tracked for everyone while filing stays gated).

- [ ] **Step 6: Full suite + tsc + lint.** Expect green.

- [ ] **Step 7: Commit.** `feat: track statutory obligations for all companies; filing stays subscription-gated (Risk 1 core)`.

**Independently shippable:** yes — closes the silent missed-deadline hole. Lapsed users now have visible obligations they cannot file until they reactivate. Comms come in Unit C; until then they at least see the obligation in-app.

---

## Unit C — Tiered lapsed comms, ops visibility, end-of-life (Risk 1 wrap)

**Outcome:** Lapsed users with an upcoming/overdue obligation get a capped, escalating, honestly-worded compliance + win-back sequence; Covered users keep the normal track; ops can see aggregate exposure; messaging stops on defined signals.

**Files:**
- Create: `src/lib/lapsed-compliance.ts` (classify Covered/Lapsed/Stop; select cohort; cap logic)
- Modify: `src/app/api/cron/reminders/route.ts` (branch on classification; write distinct `Notification.type`s; enforce caps/stop)
- Modify: `src/lib/email/templates.ts` (lapsed compliance/win-back template — honest framing + reactivate CTA + free-WebFiling fallback line)
- Modify: `src/lib/admin.ts` (at-risk metric)
- Tests: mirror each under `src/__tests__/`

- [ ] **Step 1: Failing tests for `lapsed-compliance.ts` classifier** — exhaustive over the enum: `active`/`cancelling` → Covered; `past_due`/`cancelled`/`none`(+obligation) → Lapsed; `deletedAt`/period `accepted`/`filed_elsewhere`/past deadline+grace after final message → Stop. Cohort selector returns only Lapsed companies with an obligation inside the reminder window and **under** the message cap.

- [ ] **Step 2: RED.** Run the new test file.

- [ ] **Step 3: Implement classifier + cohort selector** (pure functions, no I/O — easy to test, mirrors `review-policy.ts` style).

- [ ] **Step 4: GREEN.** Re-run.

- [ ] **Step 5: Failing tests for reminders-cron branching** — *Given* a Lapsed cohort member at the −60/−30/−7 windows, *then* the lapsed template is sent and a distinct `Notification.type` (e.g. `lapsed_compliance_60`) recorded; *Given* the cap reached or a Stop signal, *then* nothing sent; *Given* a Covered user, *then* unchanged existing behaviour.

- [ ] **Step 6: RED → implement branching in `reminders/route.ts` + template → GREEN.** Reuse the existing `prisma.notification.createMany` pattern and the `(filingId, type)` idempotency already used there.

- [ ] **Step 7: Failing test + implement `admin.ts` at-risk metric** — count/list of companies with an upcoming or overdue obligation whose classification ≠ Covered.

- [ ] **Step 8: Full suite + tsc + lint; commit** `feat: tiered lapsed compliance/win-back track + ops exposure metric (Risk 1 wrap)`.

**Decisions to confirm before Step 5** (product/copy, not eng): exact reminder windows (default −60/−30/−7, aligned to existing reminders cron); final wording of the "your plan ended, we are not filing this" + free-WebFiling line; cap (default 3 then silence); grace period after deadline before Stop (default 30 days).

**Independently shippable:** yes — builds on Unit B.

---

## Unit D — Durable confirmation delivery (Risk 2 follow-up)

**Outcome:** A failed confirmation is retried via the existing cron, gives up after a defined attempt count (≈24h at the daily `poll-filings` cadence), and surfaces in a daily ops digest. In-app Notification/receipt remain authoritative so a dead email is degraded, not broken.

**Files:**
- Modify: `src/lib/filing-confirmation.ts` (outbox/pending state + drain function)
- Modify: `src/app/api/cron/poll-filings/route.ts` (call the drain each run; emit digest)
- Tests: extend `src/__tests__/lib/filing-confirmation.test.ts`; add cron drain test

- [ ] **Step 1: Failing tests** — a confirmation that failed in Unit A is retried on the next drain; give-up is expressed in **attempt count, not only wall-clock** (the drain rides `poll-filings`, which is daily per `vercel.json`, so ~24h ≈ a small number of attempts — define e.g. "give up after N=3 drain attempts" and note the wall-clock that implies at daily cadence); on give-up it is marked failed and included in a returned "stuck" digest list; a succeeded one is never retried (idempotent via the `filing_confirmation` Notification from Unit A).

- [ ] **Step 2: RED.**

- [ ] **Step 3: Implement** a lightweight pending/outbox representation (reuse Notification with a pending marker/type, or a minimal table — decide in brainstorming if a new table is warranted; prefer reusing Notification to avoid a migration if it fits). Drain function: attempt sends for unsent-and-not-given-up, backoff by attempt count, give up past window.

- [ ] **Step 4: GREEN.**

- [ ] **Step 5: Wire drain into `poll-filings` cron** (runs daily 12:00 UTC per `vercel.json`); accumulate stuck list into the cron's JSON response and a structured `console.error` digest line for the log drain. **No synchronous email-on-email-failure.**

- [ ] **Step 6: Full suite + tsc + lint; commit** `feat: durable retried filing-confirmation with give-up + ops digest (Risk 2 durability)`.

**Independently shippable:** yes — pure enhancement of Unit A.

---

## Build order & rationale

1. **Unit A** — hours; removes a live silent-failure + latent double-send; no schema/infra.
2. **Unit B** — closes the only live, silent, statutory-deadline-missing path; mechanically low-risk (submit gate already enforced; idempotent upsert).
3. **Unit C** — mostly product/copy; turns the now-tracked exposure into action + win-back.
4. **Unit D** — durability hardening for Unit A.

## Open product decisions (carry into execution, do not block Unit A/B)

- Unit C reminder windows, copy, cap, grace.
- Unit D: reuse `Notification` for the pending/outbox state vs. a small dedicated table (prefer no migration if Notification fits; confirm during Unit D brainstorming).

## Verification gate (per @superpowers:verification-before-completion)

Each unit: `npx vitest run` (full suite green), `npx tsc --noEmit` (clean), `npx eslint` on changed files (clean) — evidence pasted before any "done" claim. No unit is complete until its tests failed first, then passed.
