# Vercel Deployment Plan

## Overview

Deploy the DormantFile Next.js application to Vercel with automatic deployments from GitHub, Vercel Postgres for the database, and automatic Prisma migrations on each deploy.

## Environments

| Environment | Branch | Purpose |
|---|---|---|
| Production | `main` | Live application |
| Preview | `dev` | Testing/staging, plus PR preview deployments |

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

Update `prisma/schema.prisma` datasource to support Vercel Postgres connection pooling:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLING")
}
```

- `url` — pooled connection used at runtime
- `directUrl` — direct connection used by `prisma migrate deploy` during builds

For local development, set both `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` to the existing local `DATABASE_URL` value in `.env`.

## Environment Variables

All variables scoped per environment in Vercel's dashboard.

### Production (live credentials)

| Variable | Value |
|---|---|
| `NEXTAUTH_URL` | Vercel production URL |
| `NEXTAUTH_SECRET` | Unique production secret |
| `STRIPE_SECRET_KEY` | Live key |
| `STRIPE_PUBLISHABLE_KEY` | Live key |
| `STRIPE_WEBHOOK_SECRET` | Live webhook secret |
| `STRIPE_PRICE_ID_BASIC` | Live price ID |
| `STRIPE_PRICE_ID_MULTI` | Live price ID |
| `STRIPE_PRICE_ID_BULK` | Live price ID |
| `RESEND_API_KEY` | Production key |
| `HMRC_VENDOR_ID` | Production |
| `HMRC_SENDER_ID` | Production |
| `HMRC_SENDER_PASSWORD` | Production |
| `HMRC_ENDPOINT` | Production endpoint |
| `COMPANIES_HOUSE_API_KEY` | Production key |
| `COMPANY_INFORMATION_API_ENDPOINT` | Production endpoint |
| `COMPANIES_HOUSE_PRESENTER_ID` | Production |
| `COMPANIES_HOUSE_PRESENTER_AUTH` | Production |
| `CRON_SECRET` | Unique production token |
| `NEXT_PUBLIC_APP_URL` | Production URL |

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

Vercel cron jobs only execute on the production deployment — preview environments are unaffected. The existing `CRON_SECRET` bearer token authentication works with Vercel's automatic cron authorization header.

## Stripe Webhooks

- **Live mode webhook** in Stripe dashboard → production URL `/api/stripe/webhook`
- **Test mode** → use Stripe CLI for local/dev testing
- Optionally assign a branch domain alias (e.g., `dev.dormantfile.com`) for a stable preview webhook URL later

## Domain

- Initial deployment uses Vercel's default `.vercel.app` URLs
- Custom domain to be added later via Vercel dashboard (DNS CNAME or nameserver delegation)

## Code Changes Required

1. **`prisma/schema.prisma`** — add `url` and `directUrl` to datasource block
2. **`.env.example`** — update to reflect `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING` replacing `DATABASE_URL`
3. **`src/lib/db.ts`** — update if it references `DATABASE_URL` directly; should use `POSTGRES_PRISMA_URL`
4. **Any other files** referencing `DATABASE_URL` — update to new variable name

## Deployment Steps (Manual, One-Time)

1. Create Vercel project and link GitHub repo
2. Create two Vercel Postgres databases (production + preview) in LHR1
3. Link each database to its respective environment
4. Set all environment variables in Vercel dashboard (production and preview scoped)
5. Set build command override: `prisma generate && prisma migrate deploy && next build`
6. Push code changes (Prisma schema, env var references) to `main`
7. Verify production deployment succeeds and migrations apply
8. Create `dev` branch (if not exists) and push to verify preview deployment
9. Configure Stripe live webhook to production URL
