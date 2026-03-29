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
  const { companyId, periodEnd } = body;

  if (!companyId || !periodEnd) {
    return NextResponse.json({ error: "companyId and periodEnd are required" }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const periodEndDate = new Date(periodEnd);

  // Set suppressedAt on all outstanding filings for this period
  await prisma.filing.updateMany({
    where: {
      companyId,
      periodEnd: periodEndDate,
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

  if (!companyId || !periodEnd) {
    return NextResponse.json({ error: "companyId and periodEnd are required" }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const periodEndDate = new Date(periodEnd);

  // Clear suppressedAt on all outstanding filings for this period
  await prisma.filing.updateMany({
    where: {
      companyId,
      periodEnd: periodEndDate,
      status: "outstanding",
    },
    data: { suppressedAt: null },
  });

  return NextResponse.json({ ok: true });
}
