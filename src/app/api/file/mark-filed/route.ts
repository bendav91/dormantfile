import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rollForwardPeriod } from "@/lib/roll-forward";

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
  const { companyId, periodEnd, filingType } = body as {
    companyId?: string;
    periodEnd?: string;
    filingType?: string;
  };

  if (!companyId || !periodEnd || !filingType) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (filingType !== "ct600" && filingType !== "accounts") {
    return NextResponse.json(
      { error: "Invalid filing type" },
      { status: 400 },
    );
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const periodEndDate = new Date(periodEnd);

  // Check no existing filing for this period
  const existing = await prisma.filing.findFirst({
    where: { companyId, filingType: filingType as "accounts" | "ct600", periodEnd: periodEndDate },
  });
  if (existing && existing.status !== "outstanding" && existing.status !== "failed" && existing.status !== "rejected") {
    return NextResponse.json({ error: "A filing already exists for this period" }, { status: 409 });
  }

  // Compute periodStart: periodEnd - 1 year + 1 day
  const periodStartDate = new Date(periodEndDate);
  periodStartDate.setUTCFullYear(periodStartDate.getUTCFullYear() - 1);
  periodStartDate.setUTCDate(periodStartDate.getUTCDate() + 1);

  if (existing) {
    await prisma.filing.update({
      where: { id: existing.id },
      data: { status: "filed_elsewhere", confirmedAt: new Date() },
    });
  } else {
    await prisma.filing.create({
      data: {
        companyId,
        filingType: filingType as "accounts" | "ct600",
        periodStart: periodStartDate,
        periodEnd: periodEndDate,
        status: "filed_elsewhere",
        confirmedAt: new Date(),
      },
    });
  }

  await rollForwardPeriod(
    companyId,
    periodEndDate,
    company.registeredForCorpTax,
    filingType as "accounts" | "ct600",
    user.email,
    company.companyName,
    { skipEmail: true },
  );

  return NextResponse.json({ success: true });
}
