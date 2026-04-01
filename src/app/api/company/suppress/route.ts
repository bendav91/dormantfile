import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyId, periodEnd, periodId } = body;

  if (!companyId || (!periodEnd && !periodId)) {
    return NextResponse.json({ error: "companyId and periodEnd (or periodId) are required" }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Build filter: prefer periodId when available, fall back to periodEnd
  const periodFilter = periodId
    ? { periodId: periodId as string }
    : { periodEnd: new Date(periodEnd) };

  // Set suppressedAt on all outstanding filings for this period
  await prisma.filing.updateMany({
    where: {
      companyId,
      ...periodFilter,
      status: "outstanding",
    },
    data: { suppressedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get("companyId");
  const periodEnd = searchParams.get("periodEnd");
  const periodId = searchParams.get("periodId");

  if (!companyId || (!periodEnd && !periodId)) {
    return NextResponse.json({ error: "companyId and periodEnd (or periodId) are required" }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Build filter: prefer periodId when available, fall back to periodEnd
  const periodFilter = periodId
    ? { periodId }
    : { periodEnd: new Date(periodEnd!) };

  // Clear suppressedAt on all outstanding filings for this period
  await prisma.filing.updateMany({
    where: {
      companyId,
      ...periodFilter,
      status: "outstanding",
    },
    data: { suppressedAt: null },
  });

  return NextResponse.json({ ok: true });
}
