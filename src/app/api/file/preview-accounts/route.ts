import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateDormantAccountsIxbrl } from "@/lib/ixbrl/dormant-accounts";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filingId = req.nextUrl.searchParams.get("filingId");
  const download = req.nextUrl.searchParams.get("download") === "1";
  if (!filingId) {
    return NextResponse.json(
      { error: "filingId query parameter is required" },
      { status: 400 },
    );
  }

  const filing = await prisma.filing.findFirst({
    where: { id: filingId },
    include: { company: { include: { user: true } } },
  });

  if (!filing) {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }

  const isOwner = filing.company.userId === session.user.id;
  let isAdmin = false;
  if (!isOwner) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true },
    });
    isAdmin = me?.isAdmin === true;
  }

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }

  const periodEnd = filing.endDate ?? filing.periodEnd;
  const html = generateDormantAccountsIxbrl({
    companyName: filing.company.companyName,
    companyRegistrationNumber: filing.company.companyRegistrationNumber,
    periodStart: filing.startDate ?? filing.periodStart,
    periodEnd,
    // Show the confirmed filing director so the preview matches what will be
    // filed; fall back to the account holder only if not yet confirmed.
    directorName: filing.company.filingDirectorName ?? filing.company.user.name,
    shareCapital: filing.company.shareCapital,
  });

  const headers: Record<string, string> = download
    ? {
        "Content-Type": "application/xhtml+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filing.company.companyRegistrationNumber}-accounts-${periodEnd.toISOString().slice(0, 10)}.html"`,
      }
    : { "Content-Type": "text/html; charset=utf-8" };

  return new NextResponse(html, { headers });
}
