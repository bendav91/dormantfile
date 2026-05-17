import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchActiveDirectors } from "@/lib/companies-house/officers";

/**
 * Active directors for the pre-file confirmation gate.
 *
 * Returns the company's active directors from Companies House plus any
 * previously confirmed director name. If the CH lookup fails the route
 * still responds 200 with an empty list and `chError: true` so the UI
 * degrades to manual entry rather than blocking the filing.
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
    select: { companyRegistrationNumber: true, filingDirectorName: true },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  try {
    const directors = await fetchActiveDirectors(company.companyRegistrationNumber);
    return NextResponse.json({
      directors,
      saved: company.filingDirectorName,
      chError: false,
    });
  } catch {
    // Non-blocking: the gate falls back to manual entry.
    return NextResponse.json({
      directors: [],
      saved: company.filingDirectorName,
      chError: true,
    });
  }
}
