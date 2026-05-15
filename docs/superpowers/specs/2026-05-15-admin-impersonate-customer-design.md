# Admin "Impersonate customer" — Design

**Date:** 2026-05-15
**Status:** Approved (pending spec review)

## Problem

When troubleshooting a customer account, the admin currently only sees a
read-only summary on the customer-detail page. They cannot see the app *as the
customer sees it* — the dashboard state, filing flows, settings, and any
account-specific bugs. There is no way to reproduce a customer's issue from
inside their session.

## Goal

From the admin customer-detail screen, the admin can press a button to start
acting as that customer inside the app, with **full unrestricted access**
(everything the customer can do, including real HMRC and Companies House
submissions). A persistent banner is shown while impersonating, with a button
to stop and return to admin.

## Decisions (locked)

- **Access scope:** full, unrestricted. No read-only enforcement, no HMRC/CH
  blocking. The impersonated session is indistinguishable from the customer
  logging in themselves.
- **Audit/safety:** banner only. No audit-log table, no auto-expiry, no
  server-side audit log line. No schema change, no migration.
- **Implementation approach:** swap the user inside the NextAuth JWT (chosen
  over a separate impersonation cookie or a re-minted login token). Least code,
  idiomatic to this codebase, zero blast radius because the entire app already
  trusts `session.user.id`.

## Architecture

NextAuth v4, JWT session strategy, credentials provider. The session is derived
from `token.id` → `session.user.id` in `src/lib/auth.ts`. The `jwt` callback
already handles a `trigger === "update"` branch (used today to refresh
`emailVerified`). Impersonation extends that branch.

### 1. Auth core — `src/lib/auth.ts`

**`jwt` callback** — restructure the `trigger === "update"` branch into three
**mutually exclusive** cases with early `return token` (if / else-if / else).
This matters: today the branch ends with an unconditional
`prisma.user.findUnique({ where: { id: token.id } })` `emailVerified` re-fetch.
If that tail still runs after a **stop**, it re-queries and could clobber the
just-restored admin `emailVerified`. So Start and Stop must each set their
fields and `return token` *before* the existing tail; the tail becomes the
`else` (non-impersonation `update`) case only.

The three cases:

- **Start impersonation** — when `session.impersonate` (a target user id) is
  set AND the token is not already impersonating (`!token.impersonatorId`):
  1. Look up the current `token.id`'s user; proceed only if `isAdmin === true`.
  2. Look up the target user (`id`, `name`, `email`, `emailVerified`); proceed
     only if it exists.
  3. Set `token.impersonatorId = token.id`, then
     `token.id = target.id`, `token.email = target.email`,
     `token.name = target.name`, `token.emailVerified = target.emailVerified`,
     `token.impersonatedName = target.name`.

- **Stop impersonation** — when `session.stopImpersonating` is truthy AND
  `token.impersonatorId` is present:
  1. `token.id = token.impersonatorId`.
  2. Re-fetch the admin user (`name`, `email`, `emailVerified`) and restore
     `token.email`, `token.name`, `token.emailVerified`.
  3. Delete `token.impersonatorId` and `token.impersonatedName`.

- **Else** — the existing `emailVerified` refresh, unchanged.

**`session` callback** — after the existing `session.user.id` /
`emailVerified` assignment, when `token.impersonatorId` is present, expose:
`session.impersonating = true` and `session.impersonatedName =
token.impersonatedName`.

**TypeScript module augmentation** — add to the existing `declare module`
blocks: `Session` gains `impersonating?: boolean` and
`impersonatedName?: string | null`; `JWT` gains `impersonatorId?: string` and
`impersonatedName?: string`. `token.email`/`token.name` need no augmentation —
they are part of next-auth's default `JWT` type (`string | null | undefined`),
compatible with the target's `name` (`string | null`).

### 2. Start — `ImpersonateButton` (new client component)

`src/components/admin/ImpersonateButton.tsx`. Props: `userId: string`,
`name: string | null` (`getCustomerDetail` returns `user.name` which may be
null — coalesce for display, e.g. `name ?? user email/"this customer"`).
Rendered in the customer-detail header in
`src/app/(app)/admin/customers/[userId]/page.tsx` (that page already has
`user.id` and `user.name`).

Behaviour: on click, show a confirm dialog (full unrestricted access — make the
operator confirm). On confirm:

```ts
const { update } = useSession();
const next = await update({ impersonate: userId });
if (next?.impersonating) {
  window.location.href = "/dashboard";
} else {
  // swap did not take (not admin / invalid target) — surface an error,
  // do NOT navigate
}
```

A full navigation (not `router.push`) is used so every server component
re-renders under the new identity. The post-`update()` check is **required**
(not optional): if `impersonating` did not become true, show an inline error
and stay on the page rather than navigating into an unchanged session.

### 3. Stop — `ImpersonationBanner` (new client component)

`src/components/ImpersonationBanner.tsx`. Mounted in
`src/app/(app)/layout.tsx` so it is visible across the entire authenticated
customer app (dashboard, filing flows, settings).

Behaviour: reads `useSession()`. If `session.impersonating` is true, render a
fixed banner ("Impersonating {impersonatedName}") with a **Stop** button:

```ts
await update({ stopImpersonating: true });
window.location.href = "/admin";
```

If not impersonating, render nothing. Styling via Tailwind utility classes and
design tokens only (no inline styles), consistent with the codebase.

### 4. Verify-email bypass — `src/app/(app)/layout.tsx`

The layout currently does `if (!user?.emailVerified) redirect("/verify-email")`.
Troubleshooting frequently targets exactly the unverified/broken accounts, so
skip that redirect when `session.impersonating` is true. The admin nav stays
hidden while impersonating (`isAdmin` resolves to the customer, which is
correct); the banner is the only way back, by design.

## Data flow

1. Admin on `/admin/customers/[id]` clicks **Impersonate** → confirm →
   `update({ impersonate: id })`.
2. `jwt` callback verifies the *pre-swap* token belongs to an admin, then
   swaps the token identity to the target customer.
3. Full reload to `/dashboard`. The whole app now treats `session.user.id` as
   the customer. The banner is visible on every authenticated page.
4. Admin clicks **Stop** → `update({ stopImpersonating: true })` → identity
   restored to the original admin → reload to `/admin`.

## Security

- The `isAdmin` check runs against the **pre-swap** `token.id` (the real
  admin). The JWT is server-signed; the client only supplies the target id via
  the `update` payload — it cannot forge admin status.
- Nested impersonation is blocked by the `!token.impersonatorId` guard on
  start. The operator must Stop before impersonating someone else.
- Stop only works when `token.impersonatorId` is present and restores to that
  exact id. A non-admin never receives a swap, so never obtains
  `impersonatorId`; they cannot fabricate a "stop" into an admin identity.
- If the admin's `isAdmin` is revoked mid-session while impersonating, Stop
  still restores the original id (they simply no longer have admin powers
  afterwards — correct behaviour).

## Edge cases

- **Invalid / nonexistent target id** → `jwt` callback no-ops (no swap). The
  button checks `update()`'s returned session and, if `impersonating` is not
  true, surfaces an inline error and does not navigate (see §2 — this is a
  required check, not optional).
- **Non-admin calls `update({ impersonate })`** → callback no-ops (isAdmin
  false). Safe.
- **Already impersonating, tries to impersonate again** → blocked by the guard;
  must Stop first. The always-visible banner makes the current state obvious.
- **`emailVerified`** is swapped to the target's on start and restored to the
  admin's on stop, so verification-gated flows behave correctly per identity.

## Testing

Vitest, mirrors `src/lib/`. New file:
`src/__tests__/lib/auth-impersonation.test.ts`. Mock `prisma`. Cover:

- Admin start → `token.id` swaps to target, `impersonatorId` set to admin id,
  `email`/`name`/`emailVerified` swapped.
- Non-admin start → no swap, no `impersonatorId`.
- Start with nonexistent target → no swap.
- Stop with active impersonation → `token.id` restored to admin,
  `impersonatorId`/`impersonatedName` cleared, admin fields restored.
- Stop with no active impersonation → no-op.
- Nested start (already impersonating) → blocked, no change.
- `session` callback exposes `impersonating`/`impersonatedName` only when
  `impersonatorId` present.

## Files touched

| File | Change |
|---|---|
| `src/lib/auth.ts` | `jwt` + `session` callbacks, type augmentation (core) |
| `src/app/(app)/admin/customers/[userId]/page.tsx` | render `ImpersonateButton` in header |
| `src/app/(app)/layout.tsx` | mount `ImpersonationBanner`, verify-email bypass |
| `src/components/admin/ImpersonateButton.tsx` | new client component |
| `src/components/ImpersonationBanner.tsx` | new client component |
| `src/__tests__/lib/auth-impersonation.test.ts` | new tests |

No Prisma schema change. No migration. No audit log.

## Out of scope (YAGNI)

- Audit-log table / queryable impersonation history.
- Auto-expiry of impersonation sessions.
- Read-only or HMRC/CH-blocked modes.
- Impersonate button on the customers list rows (detail page only).
