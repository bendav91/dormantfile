import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchAccountsFilingDocuments } from "@/lib/companies-house/filing-history";
import { fetchOfficialAccountsPdf } from "@/lib/companies-house/document";
import { resolvePostFilingDocument } from "@/lib/post-filing-resolution";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const filingId = req.nextUrl.searchParams.get("filingId");
  if (!filingId) {
    return NextResponse.json({ error: "filingId required" }, { status: 400 });
  }
  const filing = await prisma.filing.findFirst({
    where: { id: filingId },
    include: { company: true },
  });
  if (!filing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isOwner = filing.company.userId === session.user.id;
  let isAdmin = false;
  if (!isOwner) {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id }, select: { isAdmin: true },
    });
    isAdmin = me?.isAdmin === true;
  }
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const chFilings = await fetchAccountsFilingDocuments(
    filing.company.companyRegistrationNumber,
  );
  const resolution = resolvePostFilingDocument({
    periodEnd: filing.endDate ?? filing.periodEnd,
    filingType: filing.filingType,
    hasSnapshot: !!filing.filedAccountsIxbrl,
    chFilings,
  });
  if (resolution.kind !== "official") {
    return NextResponse.json({ status: "pending" }, { status: 409 });
  }
  const pdf = await fetchOfficialAccountsPdf(resolution.documentMetadataUrl);
  if (!pdf) {
    return NextResponse.json({ status: "unavailable" }, { status: 502 });
  }
  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filing.company.companyRegistrationNumber}-accounts.pdf"`,
    },
  });
}
