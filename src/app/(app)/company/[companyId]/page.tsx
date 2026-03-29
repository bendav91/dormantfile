import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Building2 } from "lucide-react";
import { buildPeriodViews } from "@/lib/filing-queries";
import FilingsTab from "@/components/filings-tab";
import SettingsTab from "@/components/settings-tab";
import OverviewTab from "@/components/overview-tab";
import SyncButton from "@/components/sync-button";

interface PageProps {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CompanyPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { companyId } = await params;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling"))
    redirect("/dashboard");

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
    include: {
      filings: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!company) redirect("/dashboard");

  const periods = buildPeriodViews(company.filings);
  const incompletePeriods = periods.filter((p) => !p.isComplete && !p.isSuppressed);

  const activeCT600Count = company.filings.filter(
    (f) =>
      f.filingType === "ct600" && ["submitted", "pending", "polling_timeout"].includes(f.status),
  ).length;

  const { tab: tabParam } = await searchParams;
  const tab = ["filings", "settings", "overview"].includes(tabParam ?? "") ? tabParam! : "filings";
  // eslint-disable-next-line react-hooks/purity -- server component, runs once
  const now = Date.now();

  return (
    <div>
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

      {/* Company header */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "8px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-text-secondary)",
                  margin: 0,
                  marginTop: "2px",
                }}
              >
                {company.companyRegistrationNumber}
                {incompletePeriods.length > 0 && (
                  <>
                    {" "}
                    &middot; {incompletePeriods.length} outstanding{" "}
                    {incompletePeriods.length === 1 ? "period" : "periods"}
                  </>
                )}
              </p>
            </div>
          </div>
          <SyncButton companyId={companyId} />
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "24px",
        }}
      >
        {[
          { key: "filings", label: "Filings", href: `/company/${companyId}` },
          { key: "overview", label: "Overview", href: `/company/${companyId}?tab=overview` },
          { key: "settings", label: "Settings", href: `/company/${companyId}?tab=settings` },
        ].map(({ key, label, href }) => (
          <Link
            key={key}
            href={href}
            style={{
              padding: "10px 20px",
              fontSize: "14px",
              fontWeight: 600,
              color: tab === key ? "var(--color-primary)" : "var(--color-text-secondary)",
              textDecoration: "none",
              borderBottom:
                tab === key ? "2px solid var(--color-primary)" : "2px solid transparent",
              transition: "color 200ms, border-color 200ms",
            }}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === "filings" && (
        <FilingsTab
          companyId={companyId}
          registeredForCorpTax={company.registeredForCorpTax}
          periods={periods}
          filings={company.filings}
          now={now}
        />
      )}
      {tab === "overview" && (
        <OverviewTab
          companyName={company.companyName}
          companyNumber={company.companyRegistrationNumber}
          companyStatus={company.companyStatus}
          companyType={company.companyType}
          dateOfCreation={company.dateOfCreation}
          registeredAddress={company.registeredAddress}
          sicCodes={company.sicCodes}
          ardMonth={company.ardMonth}
          ardDay={company.ardDay}
          accountsDueOn={company.accountsDueOn}
          lastAccountsMadeUpTo={
            company.filings
              .filter((f) => f.filingType === "accounts" && f.status === "accepted")
              .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime())[0]?.periodEnd ?? null
          }
          accountsOverdue={
            company.accountsDueOn ? company.accountsDueOn.getTime() < now : false
          }
          filings={company.filings}
        />
      )}
      {tab === "settings" && (
        <SettingsTab
          companyId={companyId}
          companyName={company.companyName}
          registeredForCorpTax={company.registeredForCorpTax}
          uniqueTaxReference={company.uniqueTaxReference}
          shareCapital={company.shareCapital}
          activeCT600Count={activeCT600Count}
        />
      )}
    </div>
  );
}
