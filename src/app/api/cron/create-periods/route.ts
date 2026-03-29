import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { calculateAccountsDeadline, calculateCT600Deadline } from "@/lib/utils";

/**
 * Daily cron (07:30) — creates new `outstanding` Filing records when
 * a company's next accounting period has ended and needs filing.
 *
 * For each active company:
 * 1. Find the latest Filing periodEnd
 * 2. If (periodEnd + 1 year) <= today, create outstanding Filing(s)
 * 3. Loop to catch up if multiple periods are due
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Get all active companies with their latest filing period end
  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      user: { subscriptionStatus: { in: ["active", "cancelling"] } },
    },
    select: {
      id: true,
      registeredForCorpTax: true,
      filings: {
        select: { periodEnd: true },
        orderBy: { periodEnd: "desc" },
        take: 1,
      },
    },
  });

  let created = 0;

  for (const company of companies) {
    if (company.filings.length === 0) continue;

    let latestPeriodEnd = company.filings[0].periodEnd;

    // Create outstanding Filings for each period that has ended
    while (true) {
      const nextStart = new Date(latestPeriodEnd);
      nextStart.setUTCDate(nextStart.getUTCDate() + 1);
      const nextEnd = new Date(latestPeriodEnd);
      nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);

      if (nextEnd.getTime() > now.getTime()) break;

      const accountsDeadline = calculateAccountsDeadline(nextEnd);
      const ct600Deadline = calculateCT600Deadline(nextEnd);

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
          accountsDeadline,
          ct600Deadline,
        },
        update: {},
      });
      created++;

      // Create ct600 Filing if registered
      if (company.registeredForCorpTax) {
        await prisma.filing.upsert({
          where: {
            companyId_periodStart_periodEnd_filingType: {
              companyId: company.id,
              periodStart: nextStart,
              periodEnd: nextEnd,
              filingType: "ct600",
            },
          },
          create: {
            companyId: company.id,
            filingType: "ct600",
            periodStart: nextStart,
            periodEnd: nextEnd,
            status: "outstanding",
            accountsDeadline,
            ct600Deadline,
          },
          update: {},
        });
        created++;
      }

      latestPeriodEnd = nextEnd;
    }
  }

  return NextResponse.json({ created });
}
