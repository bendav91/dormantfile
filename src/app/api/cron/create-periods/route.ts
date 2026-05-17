import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateAccountsDeadline } from "@/lib/utils";

/**
 * Daily cron (07:30) — creates outstanding Filing records when a company's
 * next accounting period has ended and needs filing.
 *
 * Loop 1 (Accounts): for each company, walks forward from the latest filed
 *   period end and upserts an outstanding `accounts` Filing for every annual
 *   accounting period that has fully elapsed.
 *
 * Upserts are keyed on the `@@unique([companyId, periodStart, periodEnd,
 * filingType])` constraint with a no-op `update: {}`, so re-runs are
 * idempotent and never clobber existing rows.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Materialise statutory obligations for ALL non-deleted companies,
  // regardless of subscription status. Filing remains subscription-gated at
  // submit time (see /api/file/submit*), so lapsed users still see their
  // outstanding obligations and reactivation auto-heals via the idempotent
  // upsert below.
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      filings: {
        select: {
          periodEnd: true,
        },
        orderBy: { periodEnd: "desc" },
      },
    },
  });

  let created = 0;

  // ── Loop 1: Accounts periods ──────────────────────────────────────────
  for (const company of companies) {
    const latestFiling = company.filings[0];
    let latestPeriodEnd = latestFiling?.periodEnd;

    if (!latestPeriodEnd) continue;

    while (true) {
      const nextStart = new Date(latestPeriodEnd);
      nextStart.setUTCDate(nextStart.getUTCDate() + 1);
      const nextEnd = new Date(latestPeriodEnd);
      nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);

      if (nextEnd.getTime() > now.getTime()) break;

      const accountsDeadline = calculateAccountsDeadline(nextEnd);

      // Create accounts Filing
      await prisma.filing.upsert({
        where: {
          companyId_periodStart_periodEnd_filingType: {
            companyId: company.id,
            periodStart: nextStart,
            periodEnd: nextEnd,
            filingType: "accounts",
          },
        },
        create: {
          companyId: company.id,
          filingType: "accounts",
          periodStart: nextStart,
          periodEnd: nextEnd,
          status: "outstanding",
          startDate: nextStart,
          endDate: nextEnd,
          deadline: accountsDeadline,
        },
        update: {},
      });
      created++;

      latestPeriodEnd = nextEnd;
    }
  }

  return NextResponse.json({ created });
}
