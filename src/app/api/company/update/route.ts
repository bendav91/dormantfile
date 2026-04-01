import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateCT600Deadline, validateUTR } from "@/lib/utils";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyId, registeredForCorpTax, uniqueTaxReference, shareCapital, ctapStartDate: ctapStartDateStr } = body;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Case 0: Share capital update (can combine with other cases)
  if (typeof shareCapital === "number" && shareCapital >= 0) {
    await prisma.company.update({
      where: { id: companyId },
      data: { shareCapital: Math.round(shareCapital) },
    });
  }

  // Case 1: Disable Corp Tax (strict equality — only when explicitly false)
  if (registeredForCorpTax === false && company.registeredForCorpTax) {
    await prisma.$transaction([
      prisma.company.update({
        where: { id: companyId },
        data: { registeredForCorpTax: false, uniqueTaxReference: null, ctapStartDate: null },
      }),
      // Delete outstanding ct600 Filings (keep accepted ones)
      prisma.filing.deleteMany({
        where: { companyId, filingType: "ct600", status: "outstanding" },
      }),
    ]);
    return NextResponse.json({ success: true });
  }

  // Case 2: Corp Tax already enabled — allow UTR update only
  if (company.registeredForCorpTax && uniqueTaxReference) {
    if (!validateUTR(uniqueTaxReference)) {
      return NextResponse.json({ error: "UTR must be exactly 10 digits" }, { status: 400 });
    }
    await prisma.company.update({
      where: { id: companyId },
      data: { uniqueTaxReference },
    });
    return NextResponse.json({ success: true });
  }

  // Case 3: Enable Corp Tax for the first time
  if (registeredForCorpTax === true && !company.registeredForCorpTax) {
    if (!uniqueTaxReference) {
      return NextResponse.json(
        { error: "UTR is required when enabling Corporation Tax" },
        { status: 400 },
      );
    }
    if (!validateUTR(uniqueTaxReference)) {
      return NextResponse.json({ error: "UTR must be exactly 10 digits" }, { status: 400 });
    }

    // Parse optional ctapStartDate
    const ctapStartDate = ctapStartDateStr ? new Date(ctapStartDateStr) : null;
    if (ctapStartDate && isNaN(ctapStartDate.getTime())) {
      return NextResponse.json({ error: "Invalid ctapStartDate" }, { status: 400 });
    }

    // Create outstanding ct600 Filings for all existing outstanding periods
    const outstandingAccounts = await prisma.filing.findMany({
      where: { companyId, filingType: "accounts", status: "outstanding" },
      select: {
        periodId: true,
        periodStart: true,
        periodEnd: true,
        accountsDeadline: true,
        ct600Deadline: true,
        suppressedAt: true,
      },
    });

    const ct600Filings = outstandingAccounts.map((f) => {
      // For first period, use ctapStartDate if provided; otherwise align with accounts
      const ctapStart = ctapStartDate && ctapStartDate.getTime() >= f.periodStart.getTime() && ctapStartDate.getTime() <= f.periodEnd.getTime()
        ? ctapStartDate
        : f.periodStart;
      const ctapEnd = f.periodEnd;
      const ct600Deadline = calculateCT600Deadline(ctapEnd);

      return {
        companyId,
        filingType: "ct600" as const,
        periodStart: ctapStart,
        periodEnd: ctapEnd,
        status: "outstanding" as const,
        accountsDeadline: f.accountsDeadline,
        ct600Deadline: f.ct600Deadline ?? ct600Deadline,
        suppressedAt: f.suppressedAt,
        // New columns (dual-write)
        periodId: f.periodId,
        startDate: ctapStart,
        endDate: ctapEnd,
        deadline: ct600Deadline,
      };
    });

    await prisma.$transaction([
      prisma.company.update({
        where: { id: companyId },
        data: {
          registeredForCorpTax: true,
          uniqueTaxReference,
          ctapStartDate: ctapStartDate,
        },
      }),
      prisma.filing.createMany({
        data: ct600Filings,
        skipDuplicates: true,
      }),
    ]);

    return NextResponse.json({ success: true });
  }

  // If only a share capital update was done, return success
  if (typeof shareCapital === "number") {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "No changes to apply" }, { status: 400 });
}
