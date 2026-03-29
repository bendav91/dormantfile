import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resyncFromCompaniesHouse } from "@/lib/companies-house/resync";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: {
      deletedAt: null,
      user: {
        subscriptionStatus: { in: ["active", "cancelling"] },
      },
    },
    select: { id: true },
  });

  let newFilingsDetected = 0;
  let errors = 0;

  for (const company of companies) {
    const result = await resyncFromCompaniesHouse(company.id);
    if (result.error) {
      console.error(`Resync failed for company ${company.id}: ${result.error}`);
      errors++;
    } else {
      newFilingsDetected += result.newFilingsCount;
    }
  }

  return NextResponse.json({
    companiesChecked: companies.length,
    newFilingsDetected,
    errors,
  });
}
