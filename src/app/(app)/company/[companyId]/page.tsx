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
import FirstFilingNote from "@/components/FirstFilingNote";
import { buildActivityTimeline } from "@/lib/activity-timeline";
import { deriveCt600EditorSeed } from "@/lib/ct600-editor-seed";
import { isFilingLive, isTaxFilingLive } from "@/lib/launch-mode";
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

  const hasSubmittedFiling = company.filings.some(
    (f) => f.status === "submitted" || f.status === "accepted",
  );
  const showFirstFilingNote =
    !hasSubmittedFiling && (isFilingLive() || isTaxFilingLive());

  const outstandingAccountsCount = getOutstandingCount(company.filings as never[], "accounts");

  const activeCT600Count = company.filings.filter(
    (f) =>
      f.filingType === "ct600" && ["submitted", "pending"].includes(f.status),
  ).length;

  const hasUtr = (company.uniqueTaxReference ?? "").trim() !== "";

  const corpTaxPeriodProps = hasUtr
    ? (deriveCt600EditorSeed({
        filings: company.filings.map((f) => ({
          filingType: f.filingType,
          periodStart: f.periodStart,
          periodEnd: f.periodEnd,
          startDate: f.startDate,
          endDate: f.endDate,
          status: f.status,
          ctapUserEdited: f.ctapUserEdited,
        })),
      }) ?? undefined)
    : undefined;

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

      {/* Struck off / dissolved banner */}
      {company.companyGoneAt && (
        <div className="flex items-start gap-3 px-4 py-3.5 bg-danger-bg border border-danger-border rounded-lg mb-6">
          <span className="text-danger-deep shrink-0 mt-px">
            <Building2 size={18} color="currentColor" strokeWidth={2} />
          </span>
          <div>
            <p className="text-sm font-semibold text-danger-text m-0">
              This company has been struck off or dissolved at Companies House
            </p>
            <p className="text-[13px] text-danger-text m-0 mt-1 leading-relaxed">
              Filing is disabled and we&apos;ve paused reminders for it. A
              dissolved company has no further filing obligations. We keep
              checking Companies House — if it&apos;s restored to the register,
              filing will be re-enabled and we&apos;ll let you know.
            </p>
          </div>
        </div>
      )}

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

      {showFirstFilingNote && <FirstFilingNote />}

      {/* Tab bar */}
      <div className="flex border-b border-border mb-6">
        {[
          { key: "filings", label: "Account Filings", href: `/company/${companyId}` },
          ...(hasUtr
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
      {tab === "corp-tax" && hasUtr && (
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
    where: { companyId, type: { startsWith: "reminder_" } },
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
