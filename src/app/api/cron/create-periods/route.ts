import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateAccountsDeadline } from "@/lib/utils";
import {
  getNextCtapStart,
  generateCt600Ctaps,
  spanHasProtectedCt600,
} from "@/lib/ctap";

/**
 * Daily cron (07:30) — creates outstanding Filing records when a company's
 * next accounting period / CTAP has ended and needs filing.
 *
 * Loop 1 (Accounts): for each company, walks forward from the latest filed
 *   period end and upserts an outstanding `accounts` Filing for every annual
 *   accounting period that has fully elapsed.
 * Loop 2 (CT600 CTAPs): for each Corp-Tax-registered company, iterates that
 *   company's accounts-period spans and upserts an outstanding `ct600` Filing
 *   per CTAP via the shared `generateCt600Ctaps` helper (12-month chunks plus
 *   a short final remainder, all sharing the accounts-period filing deadline).
 *   Spans already protected by a submitted or user-edited CT600 are skipped
 *   so the cron never resurrects deleted/edited CTAP rows.
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

  // Get all active companies with latest Period, latest Filing, and CT600 filings
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      user: { subscriptionStatus: { in: ["active", "cancelling"] } },
    },
    select: {
      id: true,
      registeredForCorpTax: true,
      ctapStartDate: true,
      filings: {
        select: {
          periodStart: true,
          periodEnd: true,
          startDate: true,
          endDate: true,
          filingType: true,
          status: true,
          ctapUserEdited: true,
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

  // ── Loop 2: CT600 CTAPs ───────────────────────────────────────────────
  for (const company of companies) {
    if (!company.registeredForCorpTax) continue;

    // Existing CT600 filings — used for the protected-span guard so the cron
    // never resurrects a deleted/user-edited CTAP chain. Reuse the already-
    // loaded filings (no extra query).
    const existingCt600s = company.filings.filter(
      (f) => f.filingType === "ct600",
    );

    // Find latest CT600 filing's endDate (fall back to periodEnd) to anchor
    // the next CTAP chain.
    const latestCt600 = existingCt600s[0];
    const latestCt600EndDate =
      latestCt600?.endDate ?? latestCt600?.periodEnd ?? null;
    const anchor = getNextCtapStart(latestCt600EndDate, company.ctapStartDate);

    // Each elapsed accounts period is a span; CTAPs are generated per span
    // with the shared accounts-period filing deadline.
    const accountsSpans = company.filings.filter(
      (f) => f.filingType === "accounts" && f.periodEnd.getTime() <= now.getTime(),
    );

    for (const span of accountsSpans) {
      const accountsPeriodStart = span.periodStart;
      const accountsPeriodEnd = span.periodEnd;

      // Skip THIS span (continue to the next span/company) when it already
      // contains a submitted or user-edited CT600 — never break the loop.
      if (
        spanHasProtectedCt600(
          { accountsPeriodStart, accountsPeriodEnd },
          existingCt600s,
        )
      ) {
        continue;
      }

      for (const ctap of generateCt600Ctaps({
        accountsPeriodStart,
        accountsPeriodEnd,
        anchor,
      })) {
        await prisma.filing.upsert({
          where: {
            companyId_periodStart_periodEnd_filingType: {
              companyId: company.id,
              periodStart: ctap.start,
              periodEnd: ctap.end,
              filingType: "ct600",
            },
          },
          create: {
            companyId: company.id,
            filingType: "ct600",
            periodStart: ctap.start,
            periodEnd: ctap.end,
            status: "outstanding",
            startDate: ctap.start,
            endDate: ctap.end,
            deadline: ctap.deadline,
            ctapUserEdited: false,
          },
          update: {},
        });
        created++;
      }
    }
  }

  return NextResponse.json({ created });
}
