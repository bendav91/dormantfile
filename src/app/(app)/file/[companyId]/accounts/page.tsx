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
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          marginBottom: "24px",
        }}
      >
        <Link href="/dashboard" style={{ color: "#64748B", textDecoration: "none", fontWeight: 500 }}>
          Dashboard
        </Link>
        <ChevronRight size={14} color="#CBD5E1" strokeWidth={2} />
        <span style={{ color: "#64748B", fontWeight: 500 }}>{company.companyName}</span>
        <ChevronRight size={14} color="#CBD5E1" strokeWidth={2} />
        <span style={{ color: "#1E293B", fontWeight: 600 }}>Accounts</span>
      </nav>
      <AccountsFlow
        companyId={company.id}
        companyName={company.companyName}
        companyRegistrationNumber={company.companyRegistrationNumber}
        periodStart={formatDate(company.accountingPeriodStart)}
        periodEnd={formatDate(company.accountingPeriodEnd)}
      />
    </div>
  );
}
