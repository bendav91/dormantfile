import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import FilingFlow from "./filing-flow";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

interface PageProps {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ periodEnd?: string }>;
}

export default async function CT600FilingPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { companyId } = await params;
  const { periodEnd: periodEndParam } = await searchParams;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling")) redirect("/dashboard");

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) redirect("/dashboard");
  if (!company.registeredForCorpTax) redirect(`/file/${companyId}`);

  // Resolve target period from search param or fall back to company's current period
  let periodStart: Date;
  let periodEnd: Date;

  if (periodEndParam) {
    periodEnd = new Date(periodEndParam);
    if (isNaN(periodEnd.getTime())) redirect(`/file/${companyId}`);
    periodStart = new Date(periodEnd);
    periodStart.setUTCFullYear(periodStart.getUTCFullYear() - 1);
    periodStart.setUTCDate(periodStart.getUTCDate() + 1);
  } else {
    periodStart = company.accountingPeriodStart;
    periodEnd = company.accountingPeriodEnd;
  }

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
        <Link href={`/file/${companyId}`} style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontWeight: 500 }}>{company.companyName}</Link>
        <span style={{ color: "var(--color-bg-disabled)" }}>
          <ChevronRight size={14} color="currentColor" strokeWidth={2} />
        </span>
        <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>CT600</span>
      </nav>
      <FilingFlow
        companyId={company.id}
        companyName={company.companyName}
        uniqueTaxReference={company.uniqueTaxReference!}
        declarantName={user.name}
        periodStart={formatDate(periodStart)}
        periodEnd={formatDate(periodEnd)}
        periodStartISO={periodStart.toISOString()}
        periodEndISO={periodEnd.toISOString()}
      />
    </div>
  );
}
