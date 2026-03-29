import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { getOutstandingPeriods } from "@/lib/periods";
import FilingsTab from "@/components/filings-tab";

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function FilingSelector({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { companyId } = await params;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling")) redirect("/dashboard");

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
    include: {
      filings: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!company) redirect("/dashboard");

  const periods = getOutstandingPeriods(
    company.accountingPeriodStart,
    company.accountingPeriodEnd,
    company.registeredForCorpTax,
    company.filings,
  );

  const incompletePeriods = periods.filter((p) => !p.isComplete);

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      {/* Back link */}
      <Link
        href="/dashboard"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          textDecoration: "none",
          fontWeight: 500,
          marginBottom: "24px",
        }}
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Back to dashboard
      </Link>

      {/* Heading */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "var(--color-primary-bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ color: "var(--color-primary)" }}>
              <Building2 size={20} color="currentColor" strokeWidth={2} />
            </span>
          </div>
          <div>
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              {company.companyName}
            </h1>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0, marginTop: "2px" }}>
              {company.companyRegistrationNumber}
              {incompletePeriods.length > 0 && (
                <> &middot; {incompletePeriods.length} outstanding {incompletePeriods.length === 1 ? "period" : "periods"}</>
              )}
            </p>
          </div>
        </div>
      </div>

      <FilingsTab
        companyId={companyId}
        registeredForCorpTax={company.registeredForCorpTax}
        periods={periods}
        filings={company.filings}
      />
    </div>
  );
}
