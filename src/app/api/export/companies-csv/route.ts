import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildPeriodViews } from "@/lib/filing-queries";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling") {
    return new Response("Forbidden — active subscription required", { status: 403 });
  }

  const companies = await prisma.company.findMany({
    where: { userId: session.user.id, deletedAt: null },
    include: {
      filings: {
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { companyName: "asc" },
  });

  const header = [
    "Company Name",
    "CRN",
    "Period Start",
    "Period End",
    "Accounts Status",
    "CT600 Status",
    "Accounts Deadline",
    "CT600 Deadline",
  ];

  const rows: string[][] = [header];

  for (const company of companies) {
    const periods = buildPeriodViews(company.filings);
    const currentPeriod = periods.find((p) => !p.isComplete && !p.isSuppressed);

    if (currentPeriod) {
      const accountsStatus = currentPeriod.accountsFiling?.status ?? "outstanding";
      const ct600Status = currentPeriod.ct600Filings[0]?.status ?? (company.registeredForCorpTax ? "outstanding" : "n/a");

      rows.push([
        escapeCSV(company.companyName),
        escapeCSV(company.companyRegistrationNumber),
        formatISODate(currentPeriod.periodStart),
        formatISODate(currentPeriod.periodEnd),
        accountsStatus,
        ct600Status,
        formatISODate(currentPeriod.accountsDeadline),
        formatISODate(currentPeriod.ct600Deadline),
      ]);
    } else {
      // All periods complete — show latest period
      const latest = periods[periods.length - 1];
      if (latest) {
        rows.push([
          escapeCSV(company.companyName),
          escapeCSV(company.companyRegistrationNumber),
          formatISODate(latest.periodStart),
          formatISODate(latest.periodEnd),
          "accepted",
          latest.ct600Filed ? "accepted" : (company.registeredForCorpTax ? "n/a" : "n/a"),
          formatISODate(latest.accountsDeadline),
          formatISODate(latest.ct600Deadline),
        ]);
      } else {
        // No filing data at all
        rows.push([
          escapeCSV(company.companyName),
          escapeCSV(company.companyRegistrationNumber),
          "",
          "",
          "",
          "",
          "",
          "",
        ]);
      }
    }
  }

  const csv = "\uFEFF" + rows.map((row) => row.join(",")).join("\n");
  const today = new Date().toISOString().split("T")[0];

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dormantfile-companies-${today}.csv"`,
    },
  });
}
