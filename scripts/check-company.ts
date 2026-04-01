import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { prisma } from "../src/lib/db";

async function main() {
  const company = await prisma.company.findUnique({
    where: { id: "cmnfzd6ev002tgfwe6hf1d5v6" },
    select: { id: true, companyName: true },
  });
  console.log("Company:", company ? company.companyName : "NOT FOUND");

  if (company) {
    const filings = await prisma.filing.findMany({
      where: { companyId: company.id, filingType: "accounts" },
      select: { id: true, status: true, periodStart: true, periodEnd: true },
      orderBy: { periodEnd: "desc" },
    });
    filings.forEach(f =>
      console.log(f.status, f.periodStart.toISOString().slice(0, 10), "-", f.periodEnd.toISOString().slice(0, 10), f.id),
    );
  }
  await prisma.$disconnect();
}
main();
