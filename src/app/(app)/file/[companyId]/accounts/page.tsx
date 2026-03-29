import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import AccountsFlow from "./accounts-flow";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function AccountsFilingPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { companyId } = await params;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling")) redirect("/dashboard");

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) redirect("/dashboard");

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          marginBottom: "24px",
        }}
      >
        <Link href="/dashboard" style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontWeight: 500 }}>
          Dashboard
        </Link>
        <span style={{ color: "var(--color-bg-disabled)" }}>
          <ChevronRight size={14} color="currentColor" strokeWidth={2} />
        </span>
        <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>{company.companyName}</span>
        <span style={{ color: "var(--color-bg-disabled)" }}>
          <ChevronRight size={14} color="currentColor" strokeWidth={2} />
        </span>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>Accounts</span>
      </nav>
      <AccountsFlow
        companyId={company.id}
        companyName={company.companyName}
        companyRegistrationNumber={company.companyRegistrationNumber}
        periodStart={formatDate(company.accountingPeriodStart)}
        periodEnd={formatDate(company.accountingPeriodEnd)}
        shareCapitalPence={company.shareCapital}
      />
    </div>
  );
}
