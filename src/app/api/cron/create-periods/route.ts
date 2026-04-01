import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateAccountsDeadline, calculateCT600Deadline } from "@/lib/utils";
import { getNextCtapStart, findParentPeriod } from "@/lib/ctap";

/**
 * Daily cron (07:30) — creates Period records and outstanding Filing records
 * when a company's next accounting period / CTAP has ended and needs filing.
 *
 * Loop 1 (Accounts): creates Period + accounts Filing for each annual period due.
 * Loop 2 (CT600 CTAPs): creates ct600 Filing for each 12-month CTAP due,
 *   linked to the parent Period via periodId.
 *
 * Dual-write phase: populates both old columns (periodStart/periodEnd/
 * accountsDeadline/ct600Deadline) and new columns (periodId/startDate/
 * endDate/deadline) on Filing records.
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
      periods: {
        select: { id: true, periodStart: true, periodEnd: true, accountsDeadline: true },
        orderBy: { periodEnd: "desc" },
      },
      filings: {
        select: { periodEnd: true, endDate: true, filingType: true },
        orderBy: { periodEnd: "desc" },
      },
    },
  });

  let created = 0;

  // ── Loop 1: Accounts periods ──────────────────────────────────────────
  for (const company of companies) {
    // Find latest period end: prefer Period records, fall back to Filing
    const latestPeriod = company.periods[0];
    const latestFiling = company.filings[0];
    let latestPeriodEnd = latestPeriod?.periodEnd ?? latestFiling?.periodEnd;

    if (!latestPeriodEnd) continue;

    while (true) {
      const nextStart = new Date(latestPeriodEnd);
      nextStart.setUTCDate(nextStart.getUTCDate() + 1);
      const nextEnd = new Date(latestPeriodEnd);
      nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);

      if (nextEnd.getTime() > now.getTime()) break;

      const accountsDeadline = calculateAccountsDeadline(nextEnd);
      const ct600Deadline = calculateCT600Deadline(nextEnd);

      // Create Period record
      const period = await prisma.period.upsert({
        where: {
          companyId_periodStart_periodEnd: {
            companyId: company.id,
            periodStart: nextStart,
            periodEnd: nextEnd,
          },
        },
        create: {
          companyId: company.id,
          periodStart: nextStart,
          periodEnd: nextEnd,
          accountsDeadline,
        },
        update: {},
      });

      // Keep the in-memory list current for Loop 2
      company.periods.push(period);

      // Create accounts Filing — dual-write old + new columns
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
          accountsDeadline,
          ct600Deadline,
          // New columns
          periodId: period.id,
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

    // Find latest CT600 filing's endDate (fall back to periodEnd)
    const latestCt600 = company.filings.find((f) => f.filingType === "ct600");
    const latestCt600EndDate = latestCt600?.endDate ?? latestCt600?.periodEnd ?? null;

    const ctapAnchor = getNextCtapStart(latestCt600EndDate, company.ctapStartDate);
    if (!ctapAnchor) continue;

    let ctapStart = new Date(ctapAnchor);

    while (true) {
      const ctapEnd = new Date(ctapStart);
      ctapEnd.setUTCFullYear(ctapEnd.getUTCFullYear() + 1);
      ctapEnd.setUTCDate(ctapEnd.getUTCDate() - 1);

      if (ctapEnd.getTime() > now.getTime()) break;

      const ct600Deadline = calculateCT600Deadline(ctapEnd);
      const accountsDeadline = calculateAccountsDeadline(ctapEnd);

      // Find the parent Period that contains this CTAP's start date
      const parentPeriod = findParentPeriod(ctapStart, company.periods);

      await prisma.filing.upsert({
        where: {
          companyId_periodStart_periodEnd_filingType: {
            companyId: company.id,
            periodStart: ctapStart,
            periodEnd: ctapEnd,
            filingType: "ct600",
          },
        },
        create: {
          companyId: company.id,
          filingType: "ct600",
          // Old columns (backward compat)
          periodStart: ctapStart,
          periodEnd: ctapEnd,
          accountsDeadline,
          ct600Deadline,
          status: "outstanding",
          // New columns
          periodId: parentPeriod?.id ?? null,
          startDate: ctapStart,
          endDate: ctapEnd,
          deadline: ct600Deadline,
        },
        update: {},
      });
      created++;

      // Next CTAP starts the day after this one ends
      const nextStart = new Date(ctapEnd);
      nextStart.setUTCDate(nextStart.getUTCDate() + 1);
      ctapStart = nextStart;
    }
  }

  return NextResponse.json({ created });
}
