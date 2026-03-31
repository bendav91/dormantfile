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
  if (!user || (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling"))
    redirect("/dashboard");

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) redirect("/dashboard");
  if (!company.registeredForCorpTax) redirect(`/company/${companyId}`);

  // Resolve target period from search param or fall back to company's current period
  let periodStart: Date;
  let periodEnd: Date;

  if (periodEndParam) {
    periodEnd = new Date(periodEndParam);
    if (isNaN(periodEnd.getTime())) redirect(`/company/${companyId}`);
    periodStart = new Date(periodEnd);
    periodStart.setUTCFullYear(periodStart.getUTCFullYear() - 1);
    periodStart.setUTCDate(periodStart.getUTCDate() + 1);
  } else {
    periodStart = company.accountingPeriodStart;
    periodEnd = company.accountingPeriodEnd;
  }

  return (
    <div className="max-w-[960px] mx-auto">
      <nav className="flex items-center gap-1.5 text-sm mb-6">
        <Link
          href="/dashboard"
          className="text-secondary no-underline font-medium"
        >
          Dashboard
        </Link>
        <span className="text-disabled">
          <ChevronRight size={14} color="currentColor" strokeWidth={2} />
        </span>
        <Link
          href={`/company/${companyId}`}
          className="text-secondary no-underline font-medium"
        >
          {company.companyName}
        </Link>
        <span className="text-disabled">
          <ChevronRight size={14} color="currentColor" strokeWidth={2} />
        </span>
        <span className="text-foreground font-semibold">CT600</span>
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
