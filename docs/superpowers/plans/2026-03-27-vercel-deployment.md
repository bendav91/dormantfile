# Vercel Deployment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the codebase for Vercel deployment with Vercel Postgres, automatic Prisma migrations on deploy, and proper environment variable configuration.

**Architecture:** Remove the `@prisma/adapter-pg` driver adapter in favour of Prisma's built-in connection handling, which works natively with Vercel Postgres's PgBouncer pooling. Update the Prisma schema to use `url`/`directUrl` for pooled/direct connections. Update environment variable references throughout.

**Tech Stack:** Next.js 16.2.1, Prisma 7.5.0, Vercel Postgres (Neon), Vitest

**Spec:** `docs/superpowers/specs/2026-03-27-vercel-deployment-design.md`

---

## File Map

| File                   | Action | Responsibility                                   |
| ---------------------- | ------ | ------------------------------------------------ |
| `.env.example`         | Modify | Replace `DATABASE_URL` with new variable names   |
| `.env`                 | Modify | Add new variable names pointing to local DB      |
| `prisma/schema.prisma` | Modify | Add `url` and `directUrl` to datasource block    |
| `src/lib/db.ts`        | Modify | Remove driver adapter, use standard PrismaClient |
| `prisma.config.ts`     | Modify | Remove `datasource` override                     |
| `package.json`         | Modify | Remove unused dependencies                       |

---

### Task 1: Update Environment Variable References

**Files:**

- Modify: `.env.example`
- Modify: `.env`

Setting up the new env vars first so that all subsequent tasks have valid database connection strings available.

- [ ] **Step 1: Update .env.example**

Replace the Database section:

```
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nil_ct600"
```

With:

```
# Database (Vercel Postgres)
# For local development, both can point to the same local database URL.
# On Vercel, these are auto-provisioned when a Postgres database is linked.
POSTGRES_PRISMA_URL="postgresql://user:password@localhost:5432/nil_ct600"
POSTGRES_URL_NON_POOLING="postgresql://user:password@localhost:5432/nil_ct600"
```

- [ ] **Step 2: Update .env**

In the local `.env` file, add the two new variables pointing to the existing local database URL (copy the value from the current `DATABASE_URL`). Keep `DATABASE_URL` for now in case any local tooling still references it — it can be removed later.

```
POSTGRES_PRISMA_URL="postgresql://..."  # same value as current DATABASE_URL
POSTGRES_URL_NON_POOLING="postgresql://..."  # same value as current DATABASE_URL
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: update env vars for Vercel Postgres (POSTGRES_PRISMA_URL, POSTGRES_URL_NON_POOLING)"
```

Note: `.env` is gitignored — only `.env.example` is committed.

---

### Task 2: Update Prisma Schema Datasource

**Files:**

- Modify: `prisma/schema.prisma:5-7`

- [ ] **Step 1: Update the datasource block**

Replace the current datasource block:

```prisma
datasource db {
  provider = "postgresql"
}
```

With:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

- [ ] **Step 2: Verify schema is valid**

Run: `npx prisma validate`
Expected: "The schema is valid."

- [ ] **Step 3: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: "Generated Prisma Client" success message.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(prisma): add url and directUrl to datasource for Vercel Postgres"
```

---

### Task 3: Remove Driver Adapter from db.ts

**Files:**

- Modify: `src/lib/db.ts`

- [ ] **Step 1: Replace db.ts contents**

Replace the entire file with:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

This removes the `@prisma/adapter-pg` import and the `PrismaPg` adapter. Prisma will now use the `url` from the schema datasource for runtime connections, which is compatible with Vercel Postgres's PgBouncer pooling.

- [ ] **Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat(db): remove driver adapter, use standard PrismaClient"
```

---

### Task 4: Remove datasource Override from prisma.config.ts

**Files:**

- Modify: `prisma.config.ts`

- [ ] **Step 1: Update prisma.config.ts**

Replace the entire file with:

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
```

This removes the `datasource.url` override. The Prisma CLI will now read `url` and `directUrl` from the schema, which means it uses `POSTGRES_URL_NON_POOLING` (the direct connection) for migrations.

- [ ] **Step 2: Verify Prisma can connect**

Run: `npx prisma db pull --force`
Expected: Schema introspection succeeds (confirms Prisma resolves the database URL correctly from the schema without the config override).

- [ ] **Step 3: Commit**

```bash
git add prisma.config.ts
git commit -m "refactor(prisma): remove datasource override from config"
```

---

### Task 5: Remove Unused Dependencies

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Uninstall packages**

Run: `npm uninstall @prisma/adapter-pg pg @types/pg`

This removes:

- `@prisma/adapter-pg` (driver adapter, no longer used)
- `pg` (PostgreSQL client, no longer needed — Prisma handles connections internally)
- `@types/pg` (type definitions for `pg`, currently in `dependencies` rather than `devDependencies`)

- [ ] **Step 2: Verify no remaining imports**

Run: `grep -rE "adapter-pg|from [\"']pg[\"']" src/`
Expected: No matches.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove @prisma/adapter-pg, pg, and @types/pg"
```

---

### Task 6: Verify Full Build and Tests

- [ ] **Step 1: Run the test suite**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 2: Run a full build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Run Prisma generate + migrate (simulates Vercel build command)**

Run: `npx prisma generate && npx prisma migrate deploy`
Expected: "prisma generate" succeeds, "prisma migrate deploy" reports all migrations already applied.

- [ ] **Step 4: Start the dev server and smoke test**

Run: `npm run dev`
Verify: App starts, login works, dashboard loads. This confirms the Prisma client initialises correctly without the driver adapter.

- [ ] **Step 5: Final commit if any fixes were needed**

If any adjustments were required during verification, commit them:

```bash
git add -A
git commit -m "fix: address issues found during deployment verification"
```
