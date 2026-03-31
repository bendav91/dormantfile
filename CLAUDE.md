# DormantFile

Affordable dormant company filing for the UK — CT600 (HMRC) and annual accounts (Companies House).

## Tech stack

- **Framework**: Next.js 16 (App Router, React 19)
- **Database**: PostgreSQL via Prisma 7 (driver adapter: `@prisma/adapter-pg`)
- **Auth**: NextAuth v4 (credentials provider, bcrypt)
- **Payments**: Stripe (subscriptions, checkout, webhooks)
- **Email**: Resend
- **Styling**: Tailwind CSS v4 with `@theme` design tokens, `cn()` utility (`clsx` + `tailwind-merge`)
- **Testing**: Vitest
- **Hosting**: Vercel (lhr1 region)
- **Linting**: ESLint (next/core-web-vitals + next/typescript)

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm test             # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
```

## Project structure

```
src/
  app/
    (app)/         # Authenticated app: dashboard, filing flows, settings, onboarding
    (auth)/        # Login, register, password reset
    (marketing)/   # MDX-backed marketing and legal pages
    api/           # Route handlers: auth, file, stripe, cron, company, contact, account
  components/      # Shared React components
  lib/
    auth.ts        # NextAuth config
    cn.ts          # Tailwind class merge utility (clsx + tailwind-merge)
    db.ts          # Prisma client
    hmrc/          # GovTalk XML builder, IRmark, submission
    companies-house/ # CH XML Gateway, submission
    ixbrl/         # iXBRL accounts document generation
    stripe/        # Checkout, webhooks, portal helpers
    email/         # Resend templates and sending
    subscription.ts # Subscription tier logic and limits
    periods.ts     # Accounting period calculation
    roll-forward.ts # Period roll-forward after accepted filing
    rate-limit.ts  # Rate limiting
    content/       # MDX content loading
  __tests__/       # Vitest tests (mirrors src/lib structure)
prisma/
  schema.prisma    # Database schema
  migrations/      # Prisma migrations
content/
  pages/           # MDX content for marketing pages
```

## Key patterns

- **Route groups**: `(app)`, `(auth)`, `(marketing)` each have their own layout
- **Path alias**: `@/*` maps to `./src/*`
- **Styling**: All styling via Tailwind utility classes — never use inline `style={{}}` props. Use `cn()` from `@/lib/cn` for conditional classes. Design tokens are defined in `@theme` in `globals.css` with dark mode via `.dark` class overrides. Key token names: `bg-card`, `bg-page`, `bg-inset`, `text-foreground`, `text-body`, `text-secondary`, `text-muted`, `bg-primary`, `bg-cta`, `border-border`, `shadow-card`, etc.
- **Filing flow**: Build XML -> compute IRmark/signature -> submit -> poll for result -> update status
- **Soft deletes**: Companies use `deletedAt` field to preserve filing records
- **Crons**: Daily reminders (8am), filing poll every 4 hours — configured in `vercel.json`

## Database

Prisma with PostgreSQL. Key models: `User`, `Company`, `Filing`, `Reminder`, `PasswordResetToken`.

- Migrations: `npx prisma migrate dev` (dev) / `npx prisma migrate deploy` (prod)
- Generate client: `npx prisma generate`
- Env var: `POSTGRES_URL` for migrations, pooled URL for runtime

## Testing

Tests live in `src/__tests__/` and mirror `src/lib/`. Run `npm test` before committing.

## Environment

Env vars are in `.env` (local) — never commit secrets. Key vars:

- `POSTGRES_URL`,
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `RESEND_API_KEY`
- `HMRC_SENDER_ID`, `HMRC_PASSWORD`
- `CH_PRESENTER_ID`, `CH_PRESENTER_AUTH`
