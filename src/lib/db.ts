import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// The pg driver adapter speaks raw Postgres, so it needs a plain
// `postgres://` connection string. Prefer the pooled URL when it is a plain
// postgres string (high-concurrency pooler endpoint); fall back to
// POSTGRES_URL otherwise. Never hand a `prisma+postgres://` Accelerate URL to
// PrismaPg — it cannot speak that protocol.
function resolveConnectionString(): string {
  const pooled = process.env.PRISMA_DATABASE_URL;
  if (pooled && /^postgres(ql)?:\/\//.test(pooled)) {
    return pooled;
  }
  return process.env.POSTGRES_URL;
}

function createPrismaClient() {
  const url = new URL(resolveConnectionString());
  if (process.env.NODE_ENV === "production") {
    url.searchParams.set("sslmode", "verify-full");
  }
  // Cap the pg pool per serverless instance. Prisma Postgres' direct
  // connection has a low connection ceiling; with many concurrent Vercel
  // instances an uncapped pool is the second way to hit P2037. Small pool +
  // the globalThis cache below keeps total connections bounded.
  const adapter = new PrismaPg({ connectionString: url.toString(), max: 3 });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

// Cache the client on globalThis in every environment. On Vercel, warm
// serverless invocations re-evaluate this module; without this the client
// (and its pg pool) is recreated per invocation, leaking connections until
// the database refuses them (P2037 TooManyConnections).
globalForPrisma.prisma = prisma;
