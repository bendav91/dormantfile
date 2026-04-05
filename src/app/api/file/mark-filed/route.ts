import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rollForwardPeriod } from "@/lib/roll-forward";
import { calculateAccountsDeadline, calculateCT600Deadline } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling")) {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  const body = await req.json();
  const { companyId, periodEnd, filingType, filingId, ctapStartDate, ctapEndDate } = body as {
    companyId?: string;
    periodEnd?: string;
    filingType?: string;
    filingId?: string;
    ctapStartDate?: string;
    ctapEndDate?: string;
  };

  // filingId is preferred lookup path; fall back to companyId + periodEnd + filingType
  if (!filingId && (!companyId || !periodEnd || !filingType)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (filingType && filingType !== "ct600" && filingType !== "accounts") {
    return NextResponse.json(
      { error: "Invalid filing type" },
      { status: 400 },
    );
  }

  // --- Lookup by filingId ---
  if (filingId) {
    const filing = await prisma.filing.findFirst({
      where: { id: filingId },
      include: { company: { select: { id: true, userId: true, deletedAt: true, registeredForCorpTax: true, companyName: true } } },
    });

    if (!filing || filing.company.userId !== session.user.id || filing.company.deletedAt) {
      return NextResponse.json({ error: "Filing not found" }, { status: 404 });
    }

    if (filing.status !== "outstanding" && filing.status !== "failed" && filing.status !== "rejected") {
      return NextResponse.json({ error: "A filing already exists for this period" }, { status: 409 });
    }

    // Compute new-model columns if not already set
    const filingStartDate = filing.startDate ?? filing.periodStart;
    const filingEndDate = filing.endDate ?? filing.periodEnd;
    const filingDeadline = filing.deadline ?? (
      filing.filingType === "ct600"
        ? calculateCT600Deadline(filingEndDate)
        : calculateAccountsDeadline(filingEndDate)
    );

    await prisma.filing.update({
      where: { id: filingId },
      data: {
        status: "filed_elsewhere",
        confirmedAt: new Date(),
        startDate: filingStartDate,
        endDate: filingEndDate,
        deadline: filingDeadline,
      },
    });

    await rollForwardPeriod(
      filing.companyId,
      filing.periodEnd,
      filing.company.registeredForCorpTax,
      filing.filingType as "accounts" | "ct600",
      user.email,
      filing.company.companyName,
      { skipEmail: true, startDate: filingStartDate, endDate: filingEndDate },
    );

    return NextResponse.json({ success: true });
  }

  // --- Legacy lookup by companyId + periodEnd + filingType ---
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const periodEndDate = new Date(periodEnd!);
  const typedFilingType = filingType as "accounts" | "ct600";

  // Check no existing filing for this period
  const existing = await prisma.filing.findFirst({
    where: { companyId, filingType: typedFilingType, periodEnd: periodEndDate },
  });
  if (existing && existing.status !== "outstanding" && existing.status !== "failed" && existing.status !== "rejected") {
    return NextResponse.json({ error: "A filing already exists for this period" }, { status: 409 });
  }

  // Compute periodStart: periodEnd - 1 year + 1 day
  const periodStartDate = new Date(periodEndDate);
  periodStartDate.setUTCFullYear(periodStartDate.getUTCFullYear() - 1);
  periodStartDate.setUTCDate(periodStartDate.getUTCDate() + 1);

  // For CT600: use explicit CTAP dates if provided, otherwise fall back to period dates
  const filingStartDate = typedFilingType === "ct600" && ctapStartDate
    ? new Date(ctapStartDate)
    : periodStartDate;
  const filingEndDate = typedFilingType === "ct600" && ctapEndDate
    ? new Date(ctapEndDate)
    : periodEndDate;
  const filingDeadline = typedFilingType === "ct600"
    ? calculateCT600Deadline(filingEndDate)
    : calculateAccountsDeadline(filingEndDate);

  if (existing) {
    await prisma.filing.update({
      where: { id: existing.id },
      data: {
        status: "filed_elsewhere",
        confirmedAt: new Date(),
        startDate: existing.startDate ?? filingStartDate,
        endDate: existing.endDate ?? filingEndDate,
        deadline: existing.deadline ?? filingDeadline,
      },
    });
  } else {
    await prisma.filing.create({
      data: {
        companyId: companyId!,
        filingType: typedFilingType,
        periodStart: periodStartDate,
        periodEnd: periodEndDate,
        status: "filed_elsewhere",
        confirmedAt: new Date(),
        startDate: filingStartDate,
        endDate: filingEndDate,
        deadline: filingDeadline,
      },
    });
  }

  await rollForwardPeriod(
    companyId!,
    periodEndDate,
    company.registeredForCorpTax,
    typedFilingType,
    user.email,
    company.companyName,
    { skipEmail: true, startDate: filingStartDate, endDate: filingEndDate },
  );

  return NextResponse.json({ success: true });
}
