import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const filing = await prisma.filing.findFirst({
    where: { filingType: "accounts" },
    orderBy: { createdAt: "desc" },
  });

  if (filing) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { submissionNumber: "000028" },
    });
    console.log("Seeded submissionNumber 000028 on filing", filing.id);
  } else {
    console.log("No accounts filings in DB to seed");
  }

  await prisma.$disconnect();
}

main();
