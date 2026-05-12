import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { fullResyncCompany } from "@/lib/companies-house/full-resync";

// Long-running: iterating every company can take several seconds per CRN.
export const maxDuration = 300;

export async function POST() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, companyRegistrationNumber: true, companyName: true },
  });

  let processed = 0;
  let deletedOutstanding = 0;
  let recreated = 0;
  const failures: { companyId: string; crn: string; error: string }[] = [];

  for (const company of companies) {
    const result = await fullResyncCompany(company.id);
    if (result.error) {
      failures.push({
        companyId: company.id,
        crn: company.companyRegistrationNumber,
        error: result.error,
      });
      continue;
    }
    processed++;
    deletedOutstanding += result.deletedOutstanding;
    recreated += result.recreated;
  }

  return NextResponse.json({
    total: companies.length,
    processed,
    deletedOutstanding,
    recreated,
    failures,
  });
}
