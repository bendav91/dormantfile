import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isFiled(status: string): boolean {
  return status === "accepted" || status === "filed_elsewhere";
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
    // Find current (earliest unfiled) accounts filing
    const currentAccounts = company.filings
      .filter((f) => f.filingType === "accounts" && !isFiled(f.status) && !f.suppressedAt)
      .sort((a, b) => a.periodEnd.getTime() - b.periodEnd.getTime())[0];

    // Find current (earliest unfiled) CT600 filing
    const currentCt600 = company.filings
      .filter((f) => f.filingType === "ct600" && !isFiled(f.status) && !f.suppressedAt)
      .sort((a, b) => (a.endDate ?? a.periodEnd).getTime() - (b.endDate ?? b.periodEnd).getTime())[0];

    if (currentAccounts || currentCt600) {
      const refFiling = currentAccounts ?? currentCt600!;
      const accountsStatus = currentAccounts?.status ?? (company.registeredForCorpTax ? "outstanding" : "n/a");
      const ct600Status = currentCt600?.status ?? (company.registeredForCorpTax ? "outstanding" : "n/a");
      const accountsDeadline = currentAccounts?.deadline;
      const ct600Deadline = currentCt600?.deadline;

      rows.push([
        escapeCSV(company.companyName),
        escapeCSV(company.companyRegistrationNumber),
        formatISODate(refFiling.periodStart),
        formatISODate(refFiling.endDate ?? refFiling.periodEnd),
        accountsStatus,
        ct600Status,
        accountsDeadline ? formatISODate(accountsDeadline) : "",
        ct600Deadline ? formatISODate(ct600Deadline) : "",
      ]);
    } else {
      // All filings complete — show latest
      const latest = company.filings
        .filter((f) => f.filingType === "accounts")
        .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime())[0];

      if (latest) {
        rows.push([
          escapeCSV(company.companyName),
          escapeCSV(company.companyRegistrationNumber),
          formatISODate(latest.periodStart),
          formatISODate(latest.periodEnd),
          "accepted",
          company.registeredForCorpTax ? "accepted" : "n/a",
          latest.deadline ? formatISODate(latest.deadline) : "",
          "",
        ]);
      } else {
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
