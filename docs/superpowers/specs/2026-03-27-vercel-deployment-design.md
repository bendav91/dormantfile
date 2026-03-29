# Vercel Deployment Plan

## Overview

Deploy the DormantFile Next.js application to Vercel with automatic deployments from GitHub, Vercel Postgres for the database, and automatic Prisma migrations on each deploy.

## Environments

| Environment | Branch | Purpose                                      |
| ----------- | ------ | -------------------------------------------- |
| Production  | `main` | Live application                             |
| Preview     | `dev`  | Testing/staging, plus PR preview deployments |

## Vercel Project Setup

- Create a Vercel project linked to the GitHub repository
- Framework preset: Next.js (auto-detected)
- Root directory: `/` (default)
- Region: LHR1 (already configured in `vercel.json`)
- Branch deployments: `main` → production, `dev` → preview
- PR pushes also generate preview deployments automatically

## Build Command

Override the default build command with:

```
prisma generate && prisma migrate deploy && next build
```

- `prisma generate` — generates the Prisma client
- `prisma migrate deploy` — applies any pending migrations (no-op if none)
- `next build` — builds the Next.js application

A failed migration blocks deployment, preventing the app from starting with an out-of-sync schema.

## Database

### Vercel Postgres (Neon-backed)

Create two Vercel Postgres databases, both in LHR1:

1. **Production database** — linked to the production environment
2. **Preview database** — linked to the preview environment

Vercel auto-provisions `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, and related variables when a database is linked to an environment.

### Prisma Configuration Changes

The project currently uses `@prisma/adapter-pg` (a driver adapter) in `src/lib/db.ts`, which bypasses Prisma's built-in connection handling. This is incompatible with Vercel Postgres's PgBouncer pooling — the `pg` driver sends prepared statements that fail through PgBouncer in transaction mode.

**Solution:** Remove the driver adapter and let Prisma handle connections natively via the schema's `url`/`directUrl`. This is the recommended approach for Vercel Postgres.

**Update `prisma/schema.prisma`** datasource:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

- `url` — pooled connection used at runtime (via PgBouncer)
- `directUrl` — direct connection used by `prisma migrate deploy` during builds

**Update `src/lib/db.ts`** — remove `@prisma/adapter-pg` and use standard Prisma client:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

**Update `prisma.config.ts`** — remove the `datasource` override so the CLI uses the schema's `url`/`directUrl`:

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

**Remove dependencies** — uninstall `@prisma/adapter-pg`, `pg`, and `@types/pg` (the latter is in `dependencies`, not `devDependencies`) as they are no longer needed.

For local development, set both `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` to the existing local database URL in `.env`.

## Environment Variables

All variables scoped per environment in Vercel's dashboard.

### Production (live credentials)

| Variable                           | Value                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `NEXTAUTH_URL`                     | Vercel production URL (NextAuth auto-detects via `VERCEL_URL`, but set explicitly once custom domain is added) |
| `NEXTAUTH_SECRET`                  | Unique production secret                                                                                       |
| `STRIPE_SECRET_KEY`                | Live key                                                                                                       |
| `STRIPE_PUBLISHABLE_KEY`           | Live key                                                                                                       |
| `STRIPE_WEBHOOK_SECRET`            | Live webhook secret                                                                                            |
| `STRIPE_PRICE_ID_BASIC`            | Live price ID                                                                                                  |
| `STRIPE_PRICE_ID_MULTI`            | Live price ID                                                                                                  |
| `STRIPE_PRICE_ID_BULK`             | Live price ID                                                                                                  |
| `RESEND_API_KEY`                   | Production key                                                                                                 |
| `HMRC_VENDOR_ID`                   | Production                                                                                                     |
| `HMRC_SENDER_ID`                   | Production                                                                                                     |
| `HMRC_SENDER_PASSWORD`             | Production                                                                                                     |
| `HMRC_ENDPOINT`                    | Production endpoint                                                                                            |
| `COMPANIES_HOUSE_API_KEY`          | Production key                                                                                                 |
| `COMPANY_INFORMATION_API_ENDPOINT` | Production endpoint                                                                                            |
| `COMPANIES_HOUSE_PRESENTER_ID`     | Production                                                                                                     |
| `COMPANIES_HOUSE_PRESENTER_AUTH`   | Production                                                                                                     |
| `COMPANIES_HOUSE_FILING_ENDPOINT`  | Production endpoint                                                                                            |
| `CRON_SECRET`                      | Unique production token                                                                                        |
| `NEXT_PUBLIC_APP_URL`              | Production URL                                                                                                 |

### Preview (test/sandbox credentials)

Same variable names, scoped to Preview environment, using:

- Stripe test mode keys and price IDs
- HMRC sandbox endpoint and credentials
- Companies House sandbox endpoint and credentials
- Separate `NEXTAUTH_SECRET` and `CRON_SECRET`
- Database variables auto-injected by Vercel Postgres linkage

## Cron Jobs

Already configured in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/reminders", "schedule": "0 8 * * *" },
    { "path": "/api/cron/poll-filings", "schedule": "0 */4 * * *" }
  ]
}
```

Vercel cron jobs only execute on the production deployment — preview environments are unaffected. The cron endpoints check for `Authorization: Bearer <CRON_SECRET>`, which matches the header Vercel sends automatically when `CRON_SECRET` is set as an environment variable in the project.

## Stripe Webhooks

- **Live mode webhook** in Stripe dashboard → production URL `/api/stripe/webhook`
- **Test mode** → use Stripe CLI for local/dev testing
- Optionally assign a branch domain alias (e.g., `dev.dormantfile.com`) for a stable preview webhook URL later

## Domain

- Initial deployment uses Vercel's default `.vercel.app` URLs
- Custom domain to be added later via Vercel dashboard (DNS CNAME or nameserver delegation)

## Code Changes Required

1. **`prisma/schema.prisma`** — add `url` and `directUrl` fields to datasource block (currently has no `url` field)
2. **`src/lib/db.ts`** — remove `@prisma/adapter-pg` driver adapter, use standard `PrismaClient()`
3. **`prisma.config.ts`** — remove the `datasource` override (let the schema handle URL resolution)
4. **`package.json`** — uninstall `@prisma/adapter-pg` and `pg` (+ `@types/pg` if present)
5. **`.env.example`** — replace `DATABASE_URL` with `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`
6. **`.env` / `.env.local`** — set `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` to the local database URL for development

## Deployment Steps (Manual, One-Time)

1. Create Vercel project and link GitHub repo
2. Create two Vercel Postgres databases (production + preview) in LHR1
3. Link each database to its respective environment
4. Set all environment variables in Vercel dashboard (production and preview scoped)
5. Set build command override: `prisma generate && prisma migrate deploy && next build`
6. Push code changes (Prisma schema, db.ts, prisma.config.ts, dependency removal) to `main` — this first deploy should contain only the configuration changes (no new migrations) to validate the database connection works
7. Verify production deployment succeeds and migrations apply
8. Create `dev` branch (if not exists) and push to verify preview deployment
9. Configure Stripe live webhook to production URL
