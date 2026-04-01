import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateAccountsDeadline, calculateCT600Deadline } from "@/lib/utils";

/**
 * Confirm or dismiss an ARD (Accounting Reference Date) change detected by resync.
 *
 * When confirmed: updates ardMonth/ardDay, recalculates outstanding Period dates
 * and Filing deadlines. When dismissed: clears the flag for 90 days.
 */
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyId, confirmed } = body as { companyId?: string; confirmed?: boolean };

  if (!companyId || typeof confirmed !== "boolean") {
    return NextResponse.json({ error: "companyId and confirmed are required" }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (!company.ardChangeDetected) {
    return NextResponse.json({ error: "No ARD change pending" }, { status: 400 });
  }

  if (!confirmed) {
    // Dismiss — clear the flag. Resync won't re-trigger for 90 days.
    await prisma.company.update({
      where: { id: companyId },
      data: {
        ardChangeDetected: false,
        ardChangeDetectedAt: null,
        newArdMonth: null,
        newArdDay: null,
      },
    });
    return NextResponse.json({ success: true });
  }

  // Confirmed — apply the new ARD
  const newMonth = company.newArdMonth;
  const newDay = company.newArdDay;

  if (newMonth == null || newDay == null) {
    return NextResponse.json({ error: "No new ARD values to apply" }, { status: 400 });
  }

  // Update company ARD and clear detection flag
  await prisma.company.update({
    where: { id: companyId },
    data: {
      ardMonth: newMonth,
      ardDay: newDay,
      ardChangeDetected: false,
      ardChangeDetectedAt: null,
      newArdMonth: null,
      newArdDay: null,
    },
  });

  // Recalculate outstanding Period dates and Filing deadlines
  const outstandingPeriods = await prisma.period.findMany({
    where: {
      companyId,
      filings: { some: { status: "outstanding" } },
    },
    include: {
      filings: { where: { status: "outstanding" } },
    },
  });

  for (const period of outstandingPeriods) {
    // Compute new period end based on new ARD
    const newPeriodEnd = new Date(period.periodStart);
    // Set to the new ARD month/day in the next year
    newPeriodEnd.setUTCFullYear(newPeriodEnd.getUTCFullYear() + 1);
    newPeriodEnd.setUTCMonth(newMonth - 1, newDay);
    // Adjust if the new end is before start (shouldn't happen for annual periods)
    if (newPeriodEnd.getTime() <= period.periodStart.getTime()) {
      newPeriodEnd.setUTCFullYear(newPeriodEnd.getUTCFullYear() + 1);
    }

    const newAccountsDeadline = calculateAccountsDeadline(newPeriodEnd, company.dateOfCreation ?? undefined);

    await prisma.period.update({
      where: { id: period.id },
      data: {
        periodEnd: newPeriodEnd,
        accountsDeadline: newAccountsDeadline,
      },
    });

    // Update associated outstanding filings
    for (const filing of period.filings) {
      const isAccounts = filing.filingType === "accounts";
      const filingEndDate = isAccounts ? newPeriodEnd : (filing.endDate ?? filing.periodEnd);
      const filingStartDate = isAccounts ? period.periodStart : (filing.startDate ?? filing.periodStart);
      const deadline = isAccounts
        ? newAccountsDeadline
        : calculateCT600Deadline(filingEndDate);

      await prisma.filing.update({
        where: { id: filing.id },
        data: {
          // Old columns (dual-write)
          periodEnd: isAccounts ? newPeriodEnd : filing.periodEnd,
          accountsDeadline: newAccountsDeadline,
          ct600Deadline: isAccounts ? null : deadline,
          // New columns
          startDate: filingStartDate,
          endDate: filingEndDate,
          deadline,
        },
      });
    }
  }

  return NextResponse.json({ success: true, periodsUpdated: outstandingPeriods.length });
}
