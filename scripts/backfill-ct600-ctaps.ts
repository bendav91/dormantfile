/**
 * One-off backfill: regenerate system-generated CT600 CTAPs for every
 * CT-registered company, per accounts period, using the canonical
 * `generateCt600Ctaps` splitter.
 *
 * For each company with `registeredForCorpTax`, for each accounts period
 * ([periodStart, periodEnd] of a `filingType:"accounts"` Filing):
 *   - If the span contains a protected CT600 (submitted/accepted/rejected/
 *     failed/filed_elsewhere OR ctapUserEdited) → leave the span alone.
 *   - Otherwise: delete the in-span system-generated outstanding CT600s
 *     (`status:"outstanding" && ctapUserEdited:false`) and recreate the
 *     `generateCt600Ctaps` output as fresh `outstanding`/`ctapUserEdited:false`
 *     CT600 rows.
 *
 * Deterministic and safe to re-run (re-running yields the same DB state).
 *
 * Usage:
 *   npx tsx scripts/backfill-ct600-ctaps.ts
 *   npx tsx scripts/backfill-ct600-ctaps.ts --dry-run
 *
 * NOTE: `planBackfill` is a pure function with no Prisma/env imports so it can
 * be unit-tested without loading the DB client. All dotenv + dynamic db import
 * + the runner live below it and only execute when this file is the CLI
 * entrypoint (guarded so importing the module for tests has no side-effects).
 */

import { generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";

export interface BackfillCompany {
  id: string;
  ctapStartDate: Date | null;
}

export interface AccountsPeriod {
  start: Date;
  end: Date;
}

export interface ExistingCt600 {
  id: string;
  status: string;
  ctapUserEdited: boolean;
  periodStart: Date;
  periodEnd: Date;
}

export interface BackfillCreateRow {
  companyId: string;
  filingType: "ct600";
  periodStart: Date;
  periodEnd: Date;
  startDate: Date;
  endDate: Date;
  status: "outstanding";
  deadline: Date;
  ctapUserEdited: false;
}

export interface BackfillPlan {
  deleteIds: string[];
  create: BackfillCreateRow[];
}

/**
 * Pure, per-company planner. Given a company, its accounts periods and its
 * existing CT600 filings, returns the set of system-generated CT600 ids to
 * delete and the fresh CT600 rows to create. Protected spans contribute
 * nothing (no deletes, no creates). Deterministic for a given input.
 */
export function planBackfill(
  company: BackfillCompany,
  accountsPeriods: AccountsPeriod[],
  existingCt600s: ExistingCt600[],
): BackfillPlan {
  const deleteIds: string[] = [];
  const create: BackfillCreateRow[] = [];

  for (const span of accountsPeriods) {
    if (
      spanHasProtectedCt600(
        { accountsPeriodStart: span.start, accountsPeriodEnd: span.end },
        existingCt600s,
      )
    ) {
      // Span is protected (submitted/edited) — never touch it.
      continue;
    }

    // Delete in-span system-generated outstanding rows for this span.
    for (const f of existingCt600s) {
      const inSpan =
        f.periodStart.getTime() >= span.start.getTime() &&
        f.periodEnd.getTime() <= span.end.getTime();
      if (inSpan && f.status === "outstanding" && f.ctapUserEdited === false) {
        deleteIds.push(f.id);
      }
    }

    // Recreate fresh CTAPs from the canonical splitter.
    const ctaps = generateCt600Ctaps({
      accountsPeriodStart: span.start,
      accountsPeriodEnd: span.end,
      anchor: company.ctapStartDate ?? null,
    });
    for (const c of ctaps) {
      create.push({
        companyId: company.id,
        filingType: "ct600",
        periodStart: c.start,
        periodEnd: c.end,
        startDate: c.start,
        endDate: c.end,
        status: "outstanding",
        deadline: c.deadline,
        ctapUserEdited: false,
      });
    }
  }

  return { deleteIds, create };
}

// ---------------------------------------------------------------------------
// CLI runner. Everything below pulls in dotenv + the Prisma client and must
// NOT execute when this module is imported (e.g. by the vitest unit test).
// ---------------------------------------------------------------------------

const isEntrypoint = Boolean(
  process.argv[1] && process.argv[1].includes("backfill-ct600-ctaps"),
);

async function main() {
  const { config } = await import("dotenv");
  config({ path: ".env.local", override: true });
  config({ path: ".env" });

  const dryRun = process.argv.includes("--dry-run");

  // Import the Prisma client *after* dotenv has populated process.env — db.ts
  // reads POSTGRES_URL at module-eval time.
  const { prisma } = await import("../src/lib/db");

  if (dryRun) console.log("DRY RUN — no writes will be made\n");

  const companies = await prisma.company.findMany({
    where: { registeredForCorpTax: true, deletedAt: null },
    include: {
      filings: {
        select: {
          id: true,
          filingType: true,
          status: true,
          ctapUserEdited: true,
          periodStart: true,
          periodEnd: true,
        },
      },
    },
  });

  console.log(`Found ${companies.length} CT-registered companies\n`);

  let totalDeleted = 0;
  let totalCreated = 0;
  let companiesChanged = 0;

  for (const company of companies) {
    const accountsPeriods: AccountsPeriod[] = company.filings
      .filter((f) => f.filingType === "accounts")
      .map((f) => ({ start: f.periodStart, end: f.periodEnd }));

    const existingCt600s: ExistingCt600[] = company.filings
      .filter((f) => f.filingType === "ct600")
      .map((f) => ({
        id: f.id,
        status: f.status,
        ctapUserEdited: f.ctapUserEdited,
        periodStart: f.periodStart,
        periodEnd: f.periodEnd,
      }));

    const plan = planBackfill(
      { id: company.id, ctapStartDate: company.ctapStartDate },
      accountsPeriods,
      existingCt600s,
    );

    if (plan.deleteIds.length === 0 && plan.create.length === 0) continue;

    companiesChanged++;
    totalDeleted += plan.deleteIds.length;
    totalCreated += plan.create.length;

    console.log(
      `${company.companyName} (${company.companyRegistrationNumber}): ` +
        `${plan.deleteIds.length} system CT600s deleted, ` +
        `${plan.create.length} CTAPs recreated` +
        (dryRun ? " [dry run]" : ""),
    );

    if (!dryRun) {
      await prisma.$transaction([
        prisma.filing.deleteMany({ where: { id: { in: plan.deleteIds } } }),
        prisma.filing.createMany({ data: plan.create }),
      ]);
    }
  }

  console.log(`\nDone${dryRun ? " (dry run)" : ""}:`);
  console.log(`  Companies changed: ${companiesChanged}`);
  console.log(`  System CT600s deleted: ${totalDeleted}`);
  console.log(`  CTAPs recreated: ${totalCreated}`);

  await prisma.$disconnect();
}

if (isEntrypoint) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
