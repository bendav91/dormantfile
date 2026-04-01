/**
 * Backfill script: Create Period records from existing Filing data and link them.
 *
 * For each unique (companyId, periodStart, periodEnd) combination in the Filing table,
 * creates a Period record and links all matching filings to it. Also populates the
 * new startDate, endDate, and deadline fields on each Filing.
 *
 * Run after the add_period_model migration has been applied.
 *
 * Usage:
 *   npx tsx scripts/backfill-periods.ts
 *   npx tsx scripts/backfill-periods.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.POSTGRES_URL });
const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");

async function main() {
  if (dryRun) console.log("DRY RUN — no writes will be made\n");

  // Step 1: Create Period records from accounts filings (one per unique period)
  // Use accounts filings as the source of truth since they always have the correct
  // CH accounting period dates and accountsDeadline.
  const accountsFilings = await prisma.filing.findMany({
    where: { filingType: "accounts" },
    select: {
      companyId: true,
      periodStart: true,
      periodEnd: true,
      accountsDeadline: true,
    },
    orderBy: { periodEnd: "asc" },
  });

  // Deduplicate by (companyId, periodStart, periodEnd)
  const periodKey = (companyId: string, periodStart: Date, periodEnd: Date) =>
    `${companyId}|${periodStart.getTime()}|${periodEnd.getTime()}`;

  const seenPeriods = new Set<string>();
  const periodsToCreate: Array<{
    companyId: string;
    periodStart: Date;
    periodEnd: Date;
    accountsDeadline: Date;
  }> = [];

  for (const f of accountsFilings) {
    const key = periodKey(f.companyId, f.periodStart, f.periodEnd);
    if (seenPeriods.has(key)) continue;
    seenPeriods.add(key);
    periodsToCreate.push({
      companyId: f.companyId,
      periodStart: f.periodStart,
      periodEnd: f.periodEnd,
      accountsDeadline: f.accountsDeadline ?? f.periodEnd,
    });
  }

  console.log(`Found ${periodsToCreate.length} unique periods to create\n`);

  let periodsCreated = 0;

  if (!dryRun) {
    for (const p of periodsToCreate) {
      await prisma.period.upsert({
        where: {
          companyId_periodStart_periodEnd: {
            companyId: p.companyId,
            periodStart: p.periodStart,
            periodEnd: p.periodEnd,
          },
        },
        create: {
          companyId: p.companyId,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          accountsDeadline: p.accountsDeadline,
        },
        update: {},
      });
      periodsCreated++;
    }
  } else {
    periodsCreated = periodsToCreate.length;
  }

  console.log(`Periods created: ${periodsCreated}`);

  // Step 2: Link all filings to their Period and populate new columns
  const allFilings = await prisma.filing.findMany({
    where: { periodId: null },
    select: {
      id: true,
      companyId: true,
      filingType: true,
      periodStart: true,
      periodEnd: true,
      accountsDeadline: true,
      ct600Deadline: true,
    },
  });

  console.log(`Found ${allFilings.length} filings to link\n`);

  // Build a lookup for Periods
  const allPeriods = await prisma.period.findMany({
    select: { id: true, companyId: true, periodStart: true, periodEnd: true },
  });

  const periodLookup = new Map<string, string>();
  for (const p of allPeriods) {
    periodLookup.set(periodKey(p.companyId, p.periodStart, p.periodEnd), p.id);
  }

  let filingsLinked = 0;
  let orphanedFilings = 0;

  for (const f of allFilings) {
    const key = periodKey(f.companyId, f.periodStart, f.periodEnd);
    const periodId = periodLookup.get(key);

    if (!periodId) {
      // This filing has no matching Period — likely a CT600 filing whose company
      // had no accounts filing for that period. Create a Period for it.
      console.warn(
        `  Orphaned filing ${f.id} (${f.filingType}) — no Period for ${f.periodStart.toISOString()} to ${f.periodEnd.toISOString()}. Creating Period.`,
      );
      if (!dryRun) {
        const newPeriod = await prisma.period.upsert({
          where: {
            companyId_periodStart_periodEnd: {
              companyId: f.companyId,
              periodStart: f.periodStart,
              periodEnd: f.periodEnd,
            },
          },
          create: {
            companyId: f.companyId,
            periodStart: f.periodStart,
            periodEnd: f.periodEnd,
            accountsDeadline: f.accountsDeadline ?? f.periodEnd,
          },
          update: {},
        });
        periodLookup.set(key, newPeriod.id);
      }
      orphanedFilings++;
    }

    const resolvedPeriodId = periodLookup.get(key);
    if (!resolvedPeriodId && dryRun) {
      filingsLinked++;
      continue;
    }

    // Compute deadline: accounts uses accountsDeadline, ct600 uses ct600Deadline
    const deadline =
      f.filingType === "accounts"
        ? f.accountsDeadline
        : f.ct600Deadline ?? f.accountsDeadline;

    if (!dryRun) {
      await prisma.filing.update({
        where: { id: f.id },
        data: {
          periodId: resolvedPeriodId,
          startDate: f.periodStart,
          endDate: f.periodEnd,
          deadline,
        },
      });
    }
    filingsLinked++;
  }

  // Step 3: Verify
  const unlinked = await prisma.filing.count({ where: { periodId: null } });

  console.log(`\nDone${dryRun ? " (dry run)" : ""}:`);
  console.log(`  Periods created: ${periodsCreated}`);
  console.log(`  Filings linked: ${filingsLinked}`);
  console.log(`  Orphaned filings (Periods auto-created): ${orphanedFilings}`);
  console.log(`  Remaining unlinked filings: ${unlinked}`);

  if (unlinked > 0 && !dryRun) {
    console.error("\n⚠ WARNING: Some filings could not be linked to a Period!");
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
