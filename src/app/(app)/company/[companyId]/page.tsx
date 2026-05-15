import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ArrowLeft, Building2 } from "lucide-react";
import { getOutstandingCount } from "@/lib/filing-views";
import FilingsTab from "@/components/filings-tab";
import CorpTaxTab from "@/components/corp-tax-tab";
import SettingsTab from "@/components/settings-tab";
import OverviewTab from "@/components/overview-tab";
import ActivityTab from "@/components/activity-tab";
import SyncButton from "@/components/sync-button";
import ArdMismatchBanner from "@/components/ard-mismatch-banner";
import { buildActivityTimeline } from "@/lib/activity-timeline";
import { generateCt600Ctaps } from "@/lib/ctap";
interface PageProps {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function CompanyPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { companyId } = await params;

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
    include: {
      filings: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!company) redirect("/dashboard");

  const outstandingAccountsCount = getOutstandingCount(company.filings as never[], "accounts");

  const activeCT600Count = company.filings.filter(
    (f) =>
      f.filingType === "ct600" && ["submitted", "pending"].includes(f.status),
  ).length;

  // Derive the period of accounts that the CT600 "Manage periods" modal manages.
  // Rule: take the earliest *outstanding* ct600 (or, if none outstanding, the
  // earliest ct600), then pick the accounts-type Filing whose [periodStart,
  // periodEnd] CONTAINS that ct600's period. That accounts period is the span;
  // `suggested` comes from generateCt600Ctaps so the modal and the server agree.
  const IMMUTABLE_CT600 = new Set(["submitted", "accepted", "filed_elsewhere"]);
  const ct600Filings = company.filings.filter((f) => f.filingType === "ct600");
  const accountsFilings = company.filings.filter((f) => f.filingType === "accounts");

  const sortedCt600 = [...ct600Filings].sort(
    (a, b) => a.periodStart.getTime() - b.periodStart.getTime(),
  );
  const targetCt600 =
    sortedCt600.find(
      (f) => !["accepted", "filed_elsewhere"].includes(f.status) && !f.suppressedAt,
    ) ?? sortedCt600[0];

  let corpTaxPeriodProps:
    | {
        accountsPeriodStartISO: string;
        accountsPeriodEndISO: string;
        suggested: { startISO: string; endISO: string }[];
        immutable: { startISO: string; endISO: string; status: string }[];
      }
    | undefined;

  if (targetCt600) {
    const tStart = (targetCt600.startDate ?? targetCt600.periodStart).getTime();
    const tEnd = (targetCt600.endDate ?? targetCt600.periodEnd).getTime();
    const accountsSpan = accountsFilings.find(
      (a) =>
        a.periodStart.getTime() <= tStart && a.periodEnd.getTime() >= tEnd,
    );
    if (accountsSpan) {
      const accountsPeriodStart = accountsSpan.periodStart;
      const accountsPeriodEnd = accountsSpan.periodEnd;
      const suggested = generateCt600Ctaps({
        accountsPeriodStart,
        accountsPeriodEnd,
        anchor: company.ctapStartDate ?? null,
      }).map((c) => ({
        startISO: c.start.toISOString().split("T")[0],
        endISO: c.end.toISOString().split("T")[0],
      }));
      const immutable = ct600Filings
        .filter((f) => {
          const fs = (f.startDate ?? f.periodStart).getTime();
          const fe = (f.endDate ?? f.periodEnd).getTime();
          return (
            fs >= accountsPeriodStart.getTime() &&
            fe <= accountsPeriodEnd.getTime() &&
            IMMUTABLE_CT600.has(f.status)
          );
        })
        .map((f) => ({
          startISO: (f.startDate ?? f.periodStart).toISOString().split("T")[0],
          endISO: (f.endDate ?? f.periodEnd).toISOString().split("T")[0],
          status: f.status,
        }));
      corpTaxPeriodProps = {
        accountsPeriodStartISO: accountsPeriodStart
          .toISOString()
          .split("T")[0],
        accountsPeriodEndISO: accountsPeriodEnd.toISOString().split("T")[0],
        suggested,
        immutable,
      };
    }
  }

  const { tab: tabParam } = await searchParams;
  const validTabs = ["filings", "corp-tax", "settings", "overview", "activity"];
  const tab = validTabs.includes(tabParam ?? "") ? tabParam! : "filings";
  // eslint-disable-next-line react-hooks/purity -- server component, runs once
  const now = Date.now();

  return (
    <div>
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-secondary no-underline font-medium mb-6"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Back to dashboard
      </Link>

      {/* Company header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-[10px] bg-primary-bg flex items-center justify-center shrink-0">
              <span className="text-primary">
                <Building2 size={20} color="currentColor" strokeWidth={2} />
              </span>
            </div>
            <div>
              <h1 className="text-[26px] font-bold text-foreground tracking-[-0.02em]">
                {company.companyName}
              </h1>
              <p className="text-sm text-secondary mt-0.5">
                {company.companyRegistrationNumber}
                {outstandingAccountsCount > 0 && (
                  <>
                    {" "}
                    &middot; {outstandingAccountsCount} outstanding{" "}
                    {outstandingAccountsCount === 1 ? "period" : "periods"}
                  </>
                )}
              </p>
            </div>
          </div>
          <SyncButton companyId={companyId} />
        </div>
      </div>

      {/* ARD change banner */}
      {company.ardChangeDetected && company.ardMonth != null && company.ardDay != null && company.newArdMonth != null && company.newArdDay != null && (
        <ArdMismatchBanner
          companyId={companyId}
          currentArdMonth={company.ardMonth}
          currentArdDay={company.ardDay}
          newArdMonth={company.newArdMonth}
          newArdDay={company.newArdDay}
        />
      )}

      {/* Tab bar */}
      <div className="flex border-b border-border mb-6">
        {[
          { key: "filings", label: "Account Filings", href: `/company/${companyId}` },
          ...(company.registeredForCorpTax
            ? [{ key: "corp-tax", label: "Corporation Tax", href: `/company/${companyId}?tab=corp-tax` }]
            : []),
          { key: "overview", label: "Overview", href: `/company/${companyId}?tab=overview` },
          { key: "settings", label: "Settings", href: `/company/${companyId}?tab=settings` },
          { key: "activity", label: "Activity", href: `/company/${companyId}?tab=activity` },
        ].map(({ key, label, href }) => (
          <Link
            key={key}
            href={href}
            className={cn(
              "py-2.5 px-5 text-sm font-semibold no-underline border-b-2 transition-colors duration-200",
              tab === key
                ? "text-primary border-primary"
                : "text-secondary border-transparent",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === "filings" && (
        <FilingsTab
          companyId={companyId}
          companyName={company.companyName}
          companyNumber={company.companyRegistrationNumber}
          filings={company.filings}
          now={now}
        />
      )}
      {tab === "corp-tax" && company.registeredForCorpTax && (
        <CorpTaxTab
          companyId={companyId}
          companyName={company.companyName}
          companyNumber={company.companyRegistrationNumber}
          filings={company.filings}
          now={now}
          accountsPeriodStartISO={corpTaxPeriodProps?.accountsPeriodStartISO}
          accountsPeriodEndISO={corpTaxPeriodProps?.accountsPeriodEndISO}
          suggested={corpTaxPeriodProps?.suggested}
          immutable={corpTaxPeriodProps?.immutable}
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
          accountsOverdue={company.accountsDueOn ? company.accountsDueOn.getTime() < now : false}
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
          firstPeriodStart={company.accountingPeriodStart.toISOString()}
        />
      )}
      {tab === "activity" && <ActivityTabSection companyId={companyId} companyCreatedAt={company.createdAt} filings={company.filings} />}
    </div>
  );
}

async function ActivityTabSection({
  companyId,
  companyCreatedAt,
  filings,
}: {
  companyId: string;
  companyCreatedAt: Date;
  filings: Array<{
    id: string;
    filingType: string;
    periodStart: Date;
    periodEnd: Date;
    startDate: Date | null;
    endDate: Date | null;
    status: string;
    submittedAt: Date | null;
    confirmedAt: Date | null;
    createdAt: Date;
  }>;
}) {
  const notifications = await prisma.notification.findMany({
    where: { companyId },
    orderBy: { sentAt: "desc" },
  });

  const events = buildActivityTimeline(
    companyCreatedAt,
    filings.map((f) => ({
      ...f,
      filingType: f.filingType as "accounts" | "ct600",
      startDate: f.startDate ?? null,
      endDate: f.endDate ?? null,
    })),
    notifications,
  );

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  const formattedEvents = events.map((e) => ({
    id: e.id,
    type: e.type,
    date: formatDate(e.date),
    title: e.title,
    detail: e.detail,
    filingType: e.filingType,
  }));

  return <ActivityTab events={formattedEvents} />;
}
