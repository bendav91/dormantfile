import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { ArrowLeft, Building2 } from "lucide-react";
import { buildPeriodViews } from "@/lib/filing-queries";
import FilingsTab from "@/components/filings-tab";
import SettingsTab from "@/components/settings-tab";
import OverviewTab from "@/components/overview-tab";
import ActivityTab from "@/components/activity-tab";
import SyncButton from "@/components/sync-button";
import { buildActivityTimeline } from "@/lib/activity-timeline";
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

  const periods = buildPeriodViews(company.filings);
  const incompletePeriods = periods.filter((p) => !p.isComplete && !p.isSuppressed);

  const activeCT600Count = company.filings.filter(
    (f) =>
      f.filingType === "ct600" && ["submitted", "pending", "polling_timeout"].includes(f.status),
  ).length;

  const { tab: tabParam } = await searchParams;
  const tab = ["filings", "settings", "overview", "activity"].includes(tabParam ?? "")
    ? tabParam!
    : "filings";
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
      <div className="flex border-b border-border mb-6">
        {[
          { key: "filings", label: "Filings", href: `/company/${companyId}` },
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
