/**
 * Migration script: Materialise outstanding periods as Filing records.
 *
 * For each Company, computes the canonical period list (replicating the deleted
 * getOutstandingPeriods logic), then creates `outstanding` Filing records for
 * every incomplete period. Also backfills accountsDeadline/ct600Deadline on
 * existing accepted Filings, and migrates SuppressedPeriod records to
 * suppressedAt on the new Filings.
 *
 * Designed to run between the two migrations:
 *   1. materialise_filing_periods (adds outstanding status + deadline fields)
 *   2. remove_reminder_and_suppressed_period (drops old tables)
 *
 * Usage:
 *   npx tsx scripts/migrate-materialise-periods.ts
 *   npx tsx scripts/migrate-materialise-periods.ts --dry-run
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.POSTGRES_URL_NON_POOLING });
const prisma = new PrismaClient({ adapter });
const dryRun = process.argv.includes("--dry-run");

// --- Inlined deadline helpers (from src/lib/utils.ts) ---

function calculateCT600Deadline(accountingPeriodEnd: Date): Date {
  const deadline = new Date(accountingPeriodEnd);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + 1);
  return deadline;
}

function calculateAccountsDeadline(accountingPeriodEnd: Date, incorporationDate?: Date): Date {
  const deadline = new Date(accountingPeriodEnd);
  const targetMonth = deadline.getUTCMonth() + 9;
  const originalDate = deadline.getUTCDate();
  deadline.setUTCMonth(targetMonth, 1);
  const maxDay = new Date(
    Date.UTC(deadline.getUTCFullYear(), deadline.getUTCMonth() + 1, 0),
  ).getUTCDate();
  deadline.setUTCDate(Math.min(originalDate, maxDay));

  if (incorporationDate) {
    const twentyOneMonths = new Date(incorporationDate);
    twentyOneMonths.setUTCMonth(twentyOneMonths.getUTCMonth() + 21);
    if (twentyOneMonths.getTime() > deadline.getTime()) {
      return twentyOneMonths;
    }
  }

  return deadline;
}

// --- Inlined period generation (from deleted src/lib/periods.ts) ---

interface PeriodInfo {
  periodStart: Date;
  periodEnd: Date;
  accountsDeadline: Date;
  ct600Deadline: Date;
  isComplete: boolean;
}

function getOutstandingPeriods(
  currentPeriodStart: Date,
  currentPeriodEnd: Date,
  filings: Array<{
    periodStart: Date;
    periodEnd: Date;
    filingType: string;
    status: string;
  }>,
  options?: {
    dateOfCreation?: Date | null;
    accountsDueOn?: Date | null;
  },
): PeriodInfo[] {
  const now = new Date();
  const dateOfCreation = options?.dateOfCreation ?? undefined;
  const accountsDueOn = options?.accountsDueOn ?? undefined;

  const periods: PeriodInfo[] = [];
  let pStart = new Date(currentPeriodStart);
  let pEnd = new Date(currentPeriodEnd);

  // Collect all period ends to identify the last one
  const allPeriodEnds: Date[] = [];
  {
    let tempEnd = new Date(currentPeriodEnd);
    while (tempEnd.getTime() <= now.getTime()) {
      allPeriodEnds.push(new Date(tempEnd));
      tempEnd = new Date(tempEnd);
      tempEnd.setUTCFullYear(tempEnd.getUTCFullYear() + 1);
    }
  }
  const lastPeriodEnd = allPeriodEnds.length > 0 ? allPeriodEnds[allPeriodEnds.length - 1] : null;

  while (pEnd.getTime() <= now.getTime()) {
    const isFirstPeriod = dateOfCreation != null && pStart.getTime() === dateOfCreation.getTime();
    const isLastPeriod = lastPeriodEnd != null && pEnd.getTime() === lastPeriodEnd.getTime();

    let accountsDeadline: Date;
    if (isLastPeriod && accountsDueOn) {
      accountsDeadline = accountsDueOn;
    } else if (isFirstPeriod && dateOfCreation) {
      accountsDeadline = calculateAccountsDeadline(pEnd, dateOfCreation);
    } else {
      accountsDeadline = calculateAccountsDeadline(pEnd);
    }

    const ct600Deadline = calculateCT600Deadline(pEnd);

    const accountsFiled = filings.some(
      (f) =>
        f.filingType === "accounts" &&
        f.status === "accepted" &&
        f.periodEnd.getTime() === pEnd.getTime(),
    );

    const isComplete = accountsFiled;

    periods.push({
      periodStart: new Date(pStart),
      periodEnd: new Date(pEnd),
      accountsDeadline,
      ct600Deadline,
      isComplete,
    });

    // Advance to next annual period
    const nextStart = new Date(pEnd);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    const nextEnd = new Date(pEnd);
    nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);
    pStart = nextStart;
    pEnd = nextEnd;
  }

  return periods;
}

// --- Migration logic ---

interface SuppressedPeriodRow {
  companyId: string;
  periodEnd: Date;
}

async function main() {
  if (dryRun) console.log("DRY RUN — no writes will be made\n");

  // Fetch suppressed periods via raw SQL (model removed from Prisma schema)
  const suppressedRows = await prisma.$queryRaw<SuppressedPeriodRow[]>`
    SELECT "companyId", "periodEnd" FROM "SuppressedPeriod"
  `;
  const suppressedByCompany = new Map<string, Set<number>>();
  for (const row of suppressedRows) {
    if (!suppressedByCompany.has(row.companyId)) {
      suppressedByCompany.set(row.companyId, new Set());
    }
    suppressedByCompany.get(row.companyId)!.add(new Date(row.periodEnd).getTime());
  }

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    include: {
      filings: {
        select: {
          id: true,
          periodStart: true,
          periodEnd: true,
          filingType: true,
          status: true,
          accountsDeadline: true,
        },
      },
    },
  });

  console.log(`Found ${companies.length} active companies\n`);

  let totalOutstandingCreated = 0;
  let totalDeadlinesBackfilled = 0;
  let totalSuppressionsSet = 0;

  for (const company of companies) {
    const suppressedPeriodEnds = suppressedByCompany.get(company.id) ?? new Set<number>();

    const periods = getOutstandingPeriods(
      company.accountingPeriodStart,
      company.accountingPeriodEnd,
      company.filings,
      {
        dateOfCreation: company.dateOfCreation,
        accountsDueOn: company.accountsDueOn,
      },
    );

    let companyCreated = 0;
    let companyBackfilled = 0;

    for (const period of periods) {
      const accountsDeadline = period.accountsDeadline;
      const ct600Deadline = period.ct600Deadline;
      const isSuppressed = suppressedPeriodEnds.has(period.periodEnd.getTime());

      // Check for existing filings for this period
      const existingAccounts = company.filings.find(
        (f) => f.filingType === "accounts" && f.periodEnd.getTime() === period.periodEnd.getTime(),
      );
      const existingCt600 = company.filings.find(
        (f) => f.filingType === "ct600" && f.periodEnd.getTime() === period.periodEnd.getTime(),
      );

      // Skip periods with active submissions
      const activeStatuses = ["pending", "submitted", "polling_timeout"];

      if (!period.isComplete) {
        // Create outstanding accounts Filing if none exists
        if (!existingAccounts) {
          if (!dryRun) {
            await prisma.filing.create({
              data: {
                companyId: company.id,
                filingType: "accounts",
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                status: "outstanding",
                accountsDeadline,
                ct600Deadline,
                suppressedAt: isSuppressed ? new Date() : null,
              },
            });
          }
          companyCreated++;
        } else if (activeStatuses.includes(existingAccounts.status)) {
          // Skip — active submission in progress
        } else if (!existingAccounts.accountsDeadline) {
          // Backfill deadline on existing Filing
          if (!dryRun) {
            await prisma.filing.update({
              where: { id: existingAccounts.id },
              data: { accountsDeadline, ct600Deadline },
            });
          }
          companyBackfilled++;
        }

        // Create outstanding ct600 Filing if registered and none exists
        if (company.registeredForCorpTax && !existingCt600) {
          if (!dryRun) {
            await prisma.filing.create({
              data: {
                companyId: company.id,
                filingType: "ct600",
                periodStart: period.periodStart,
                periodEnd: period.periodEnd,
                status: "outstanding",
                accountsDeadline,
                ct600Deadline,
                suppressedAt: isSuppressed ? new Date() : null,
              },
            });
          }
          companyCreated++;
        }
      } else {
        // Complete period — backfill deadlines on existing accepted Filings
        if (existingAccounts && !existingAccounts.accountsDeadline) {
          if (!dryRun) {
            await prisma.filing.update({
              where: { id: existingAccounts.id },
              data: { accountsDeadline, ct600Deadline },
            });
          }
          companyBackfilled++;
        }
      }
    }

    if (companyCreated > 0 || companyBackfilled > 0) {
      console.log(
        `${company.companyName} (${company.companyRegistrationNumber}): ` +
          `${companyCreated} outstanding created, ${companyBackfilled} deadlines backfilled`,
      );
    }

    totalOutstandingCreated += companyCreated;
    totalDeadlinesBackfilled += companyBackfilled;
    totalSuppressionsSet += suppressedPeriodEnds.size;
  }

  console.log(`\nDone${dryRun ? " (dry run)" : ""}:`);
  console.log(`  Outstanding Filings created: ${totalOutstandingCreated}`);
  console.log(`  Deadlines backfilled: ${totalDeadlinesBackfilled}`);
  console.log(`  Suppressions migrated: ${totalSuppressionsSet}`);
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
