import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Building2, Plus, AlertTriangle, ArrowUpDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import SubscriptionBanner from "@/components/subscription-banner";
import FilingStatusBadge from "@/components/filing-status-badge";
import EnableCorpTax from "@/components/enable-corp-tax";
import EditUTR from "@/components/edit-utr";
import CompanySearch from "@/components/company-search";
import { calculateAccountsDeadline, calculateCT600Deadline } from "@/lib/utils";
import { canAddCompany, getCompanyLimit, TIER_LABELS } from "@/lib/subscription";
import { syncSubscriptionIfStale } from "@/lib/stripe/sync";
import { getOutstandingPeriods, getIncompletePeriodsCount } from "@/lib/periods";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PAGE_SIZE = 10;

type FilterType = "overdue" | "due-soon" | "recently-filed" | "accepted" | "rejected" | "failed" | "";
type SortType = "most-overdue" | "most-outstanding" | "name-asc" | "date-added-newest" | "date-added-oldest";

const SORT_OPTIONS: { key: SortType; label: string }[] = [
  { key: "most-overdue", label: "Most Overdue" },
  { key: "most-outstanding", label: "Most Outstanding" },
  { key: "name-asc", label: "A\u2013Z" },
  { key: "date-added-newest", label: "Newest first" },
  { key: "date-added-oldest", label: "Oldest first" },
];

interface DashboardProps {
  searchParams: Promise<{ page?: string; q?: string; filter?: string; sort?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/login");
  }

  // Sync subscription state from Stripe if it looks stale (safety net for missed webhooks)
  await syncSubscriptionIfStale(user.id);
  // Re-read user after potential sync
  const freshUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (freshUser) Object.assign(user, freshUser);

  const allCompanyCount = await prisma.company.count({
    where: { userId: user.id, deletedAt: null },
  });

  if (allCompanyCount === 0) {
    redirect("/onboarding");
  }

  const { page: pageParam, q: searchQuery, filter: filterParam, sort: sortParam } = await searchParams;
  const search = searchQuery?.trim() || "";
  const validFilters = ["overdue", "due-soon", "recently-filed", "accepted", "rejected", "failed"];
  const filter = (validFilters.includes(filterParam ?? "") ? filterParam : "") as FilterType;
  const validSorts: SortType[] = ["most-overdue", "most-outstanding", "name-asc", "date-added-newest", "date-added-oldest"];
  const sort: SortType = validSorts.includes(sortParam as SortType) ? (sortParam as SortType) : "most-overdue";

  // For overdue/due-soon filters, compute deadlines across ALL outstanding periods.
  let filterIds: string[] | null = null;
  if (filter === "overdue" || filter === "due-soon") {
    const allCompanies = await prisma.company.findMany({
      where: { userId: user.id, deletedAt: null },
      include: { filings: { select: { periodStart: true, periodEnd: true, filingType: true, status: true } } },
    });
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    filterIds = allCompanies
      .filter((c) => {
        const periods = getOutstandingPeriods(c.accountingPeriodStart, c.accountingPeriodEnd, c.registeredForCorpTax, c.filings);
        return periods.some((p) => {
          if (p.isComplete) return false;
          if (filter === "overdue") return p.isOverdue;
          // due-soon: any deadline within 30 days
          const accountsDueSoon = !p.accountsFiled && p.accountsDeadline.getTime() >= now && p.accountsDeadline.getTime() <= now + thirtyDaysMs;
          const ct600DueSoon = c.registeredForCorpTax && !p.ct600Filed && p.ct600Deadline.getTime() >= now && p.ct600Deadline.getTime() <= now + thirtyDaysMs;
          return accountsDueSoon || ct600DueSoon;
        });
      })
      .map((c) => c.id);
  } else if (filter === "recently-filed") {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentFilings = await prisma.filing.findMany({
      where: {
        company: { userId: user.id, deletedAt: null },
        status: "accepted",
        confirmedAt: { gte: thirtyDaysAgo },
      },
      select: { companyId: true },
      distinct: ["companyId"],
    });
    filterIds = recentFilings.map((f) => f.companyId);
  } else if (filter === "accepted" || filter === "rejected" || filter === "failed") {
    const matchingFilings = await prisma.filing.findMany({
      where: {
        company: { userId: user.id, deletedAt: null },
        status: filter,
      },
      select: { companyId: true },
      distinct: ["companyId"],
    });
    filterIds = matchingFilings.map((f) => f.companyId);
  }

  const baseWhere = {
    userId: user.id,
    deletedAt: null,
    ...(filterIds !== null ? { id: { in: filterIds } } : {}),
    ...(search
      ? {
          OR: [
            { companyName: { contains: search, mode: "insensitive" as const } },
            { companyRegistrationNumber: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Fetch all matching companies (sorting requires computed data, so we sort in JS then paginate)
  const allMatchingCompanies = await prisma.company.findMany({
    where: baseWhere,
    include: {
      filings: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // Pre-compute sort keys for each company
  const companiesWithSortData = allMatchingCompanies.map((c) => {
    const periods = getOutstandingPeriods(c.accountingPeriodStart, c.accountingPeriodEnd, c.registeredForCorpTax, c.filings);
    const incompletePeriods = periods.filter((p) => !p.isComplete);
    const outstandingCount = incompletePeriods.length;

    // Earliest deadline across all outstanding periods (for "most overdue" sort)
    let earliestDeadline = Infinity;
    for (const p of incompletePeriods) {
      if (!p.accountsFiled) earliestDeadline = Math.min(earliestDeadline, p.accountsDeadline.getTime());
      if (c.registeredForCorpTax && !p.ct600Filed) earliestDeadline = Math.min(earliestDeadline, p.ct600Deadline.getTime());
    }

    return { company: c, periods, outstandingCount, earliestDeadline };
  });

  // Sort
  companiesWithSortData.sort((a, b) => {
    switch (sort) {
      case "most-overdue":
        return a.earliestDeadline - b.earliestDeadline;
      case "most-outstanding":
        return b.outstandingCount - a.outstandingCount || a.earliestDeadline - b.earliestDeadline;
      case "name-asc":
        return a.company.companyName.localeCompare(b.company.companyName);
      case "date-added-newest":
        return b.company.createdAt.getTime() - a.company.createdAt.getTime();
      case "date-added-oldest":
        return a.company.createdAt.getTime() - b.company.createdAt.getTime();
    }
  });

  const totalCompanies = companiesWithSortData.length;
  const totalPages = Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));
  const currentPage = Math.max(1, Math.min(totalPages, parseInt(pageParam ?? "1", 10) || 1));
  const paginatedCompanies = companiesWithSortData.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const canFile = user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling";
  const showAddCompany = canAddCompany(user.subscriptionTier, allCompanyCount);
  const companyLimit = getCompanyLimit(user.subscriptionTier);


  return (
    <div style={{ maxWidth: "960px", margin: "0 auto" }}>
      <SubscriptionBanner status={user.subscriptionStatus} />

      {canFile && companyLimit > 0 && allCompanyCount > companyLimit && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "14px 20px",
            backgroundColor: "var(--color-warning-bg)",
            border: "1px solid var(--color-warning-border)",
            borderRadius: "12px",
            marginBottom: "24px",
          }}
        >
          <span style={{ color: "var(--color-warning)", flexShrink: 0, marginTop: "1px", display: "flex" }}>
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p style={{ fontSize: "14px", color: "var(--color-warning-text)", margin: 0, fontWeight: 500 }}>
            You have {allCompanyCount} {allCompanyCount === 1 ? "company" : "companies"} but your {TIER_LABELS[user.subscriptionTier]} plan supports {companyLimit}. You can file for up to {companyLimit} {companyLimit === 1 ? "company" : "companies"} this billing period. Remove companies or upgrade your plan from{" "}
            <a href="/choose-plan" style={{ color: "var(--color-warning-link)", fontWeight: 600 }}>Change plan</a>.
          </p>
        </div>
      )}

      {/* Page heading */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "32px" }}>
        <div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: "0 0 6px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Dashboard
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
            <p style={{ fontSize: "15px", color: "var(--color-text-secondary)", margin: 0 }}>
              {allCompanyCount} {allCompanyCount === 1 ? "company" : "companies"}
              {companyLimit > 0 && ` / ${companyLimit}`}
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "3px 10px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: user.subscriptionTier === "none" ? "var(--color-danger-bg)" : (user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling") ? "var(--color-primary-bg)" : "var(--color-bg-inset)",
                color: user.subscriptionTier === "none" ? "var(--color-danger)" : (user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling") ? "var(--color-primary)" : "var(--color-text-secondary)",
                border: `1px solid ${user.subscriptionTier === "none" ? "var(--color-danger-border)" : (user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling") ? "var(--color-primary-border)" : "var(--color-border)"}`,
              }}
            >
              {user.subscriptionTier === "none" ? "No plan" : `${TIER_LABELS[user.subscriptionTier]} plan`}
            </span>
          </div>
        </div>
        {showAddCompany && (
          <Link
            href="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "var(--color-primary)",
              color: "var(--color-bg-card)",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              textDecoration: "none",
              transition: "opacity 200ms, background-color 200ms",
              flexShrink: 0,
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add company
          </Link>
        )}
      </div>

      {/* Search, filters, and sort — show when there are 2+ companies, or when a search/filter is active */}
      {(allCompanyCount > 1 || search || filter) && (
        <>
          <CompanySearch />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {([
                { key: "", label: "All" },
                { key: "overdue", label: "Overdue" },
                { key: "due-soon", label: "Due Soon" },
                { key: "recently-filed", label: "Recently Filed" },
                { key: "accepted", label: "Accepted" },
                { key: "rejected", label: "Rejected" },
                { key: "failed", label: "Failed" },
              ] as const).map((f) => {
                const isActive = filter === f.key;
                const params = new URLSearchParams();
                if (f.key) params.set("filter", f.key);
                if (search) params.set("q", search);
                if (sort !== "most-overdue") params.set("sort", sort);
                const href = `/dashboard${params.toString() ? `?${params}` : ""}`;
                return (
                  <Link
                    key={f.key}
                    href={href}
                    className={`focus-ring ${isActive ? "filter-pill active" : "hoverable-subtle filter-pill"}`}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      fontWeight: 600,
                      textDecoration: "none",
                      transition: "opacity 200ms, background-color 200ms",
                      backgroundColor: isActive ? "var(--color-primary)" : "var(--color-bg-card)",
                      color: isActive ? "var(--color-bg-card)" : "var(--color-text-body)",
                      border: `1px solid ${isActive ? "var(--color-primary)" : "var(--color-border)"}`,
                    }}
                  >
                    {f.label}
                  </Link>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "var(--color-text-muted)", display: "flex" }}>
                <ArrowUpDown size={14} color="currentColor" strokeWidth={2} aria-hidden="true" />
              </span>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {SORT_OPTIONS.map((s) => {
                  const isActive = sort === s.key;
                  const params = new URLSearchParams();
                  if (filter) params.set("filter", filter);
                  if (search) params.set("q", search);
                  if (s.key !== "most-overdue") params.set("sort", s.key);
                  const href = `/dashboard${params.toString() ? `?${params}` : ""}`;
                  return (
                    <Link
                      key={s.key}
                      href={href}
                      className={`focus-ring ${isActive ? "sort-pill active" : "hoverable-subtle sort-pill"}`}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "5px",
                        fontSize: "12px",
                        fontWeight: 500,
                        textDecoration: "none",
                        backgroundColor: isActive ? "var(--color-text-secondary)" : "transparent",
                        color: isActive ? "var(--color-bg-card)" : "var(--color-text-muted)",
                        transition: "opacity 200ms, background-color 200ms",
                      }}
                    >
                      {s.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* No results */}
      {totalCompanies === 0 && (search || filter) && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "var(--color-text-secondary)",
          }}
        >
          <p style={{ fontSize: "15px", margin: "0 0 4px 0", fontWeight: 500 }}>
            {search ? <>No companies matching &ldquo;{search}&rdquo;</> : "No companies match this filter"}
          </p>
          <p style={{ fontSize: "13px", margin: 0 }}>
            {search ? "Try a different name or registration number." : "Try a different filter or check back later."}
          </p>
        </div>
      )}

      {/* Company cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))", gap: "16px" }}>
        {paginatedCompanies.map(({ company, periods, outstandingCount }) => {

          // Show the current (oldest unfiled) period's deadlines and filings
          const currentPeriod = periods.find((p) => !p.isComplete) ?? periods[0];
          const accountsDeadline = currentPeriod?.accountsDeadline ?? calculateAccountsDeadline(company.accountingPeriodEnd);
          const ct600Deadline = currentPeriod?.ct600Deadline ?? calculateCT600Deadline(company.accountingPeriodEnd);

          const accountsFiling = company.filings.find(
            (f) => f.filingType === "accounts" && f.periodEnd.getTime() === company.accountingPeriodEnd.getTime()
          );
          const ct600Filing = company.filings.find(
            (f) => f.filingType === "ct600" && f.periodEnd.getTime() === company.accountingPeriodEnd.getTime()
          );

          const accountsDaysLeft = Math.ceil(
            (accountsDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const ct600DaysLeft = Math.ceil(
            (ct600Deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          // For companies with multiple outstanding periods, link to the period selection page
          const hasMultiplePeriods = outstandingCount > 1;
          const fileHref = `/file/${company.id}`;

          const filingBtnStyle: React.CSSProperties = {
            display: "inline-flex", alignItems: "center",
            backgroundColor: "var(--color-cta)", color: "var(--color-bg-card)",
            padding: "4px 10px", borderRadius: "5px",
            fontWeight: 600, fontSize: "12px", textDecoration: "none",
          };

          return (
            <div
              key={company.id}
              style={{
                backgroundColor: "var(--color-bg-card)",
                borderRadius: "10px",
                padding: "18px",
                border: "1px solid var(--color-border)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    backgroundColor: "var(--color-primary-bg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span style={{ color: "var(--color-primary)", display: "flex" }}>
                    <Building2 size={16} color="currentColor" strokeWidth={2} />
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "var(--color-text-primary)",
                      margin: 0,
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {company.companyName}
                  </h2>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0, marginTop: "1px" }}>
                    {company.registeredForCorpTax && company.uniqueTaxReference
                      ? <><EditUTR companyId={company.id} currentUTR={company.uniqueTaxReference} /> &middot; </> : ""}
                    {company.companyRegistrationNumber}
                  </p>
                </div>
              </div>

              {/* Period */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 0 12px 0" }}>
                <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: 0 }}>
                  <span style={{ fontWeight: 600, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "10px" }}>Period </span>
                  {formatDate(company.accountingPeriodStart)} &ndash; {formatDate(company.accountingPeriodEnd)}
                </p>
                {outstandingCount > 1 && (
                  <Link
                    href={fileHref}
                    className="focus-ring hoverable-pill"
                    aria-label={`${outstandingCount} outstanding periods — view all`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "2px",
                      padding: "1px 4px 1px 6px",
                      minHeight: "28px",
                      borderRadius: "9999px",
                      fontSize: "10px",
                      fontWeight: 600,
                      textDecoration: "none",
                      backgroundColor: outstandingCount >= 4 ? "var(--color-danger-bg)" : "var(--color-warning-bg)",
                      color: outstandingCount >= 4 ? "var(--color-danger)" : "var(--color-warning-text)",
                      border: `1px solid ${outstandingCount >= 4 ? "var(--color-danger-border)" : "var(--color-warning-border)"}`,
                    }}
                  >
                    {outstandingCount} outstanding
                    <ChevronRight size={10} strokeWidth={2.5} />
                  </Link>
                )}
              </div>

              {/* Filing rows — show current (oldest) period */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Accounts */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  backgroundColor: "var(--color-bg-inset)",
                  borderRadius: "6px",
                }}>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>Accounts</p>
                    <p style={{
                      fontSize: "12px",
                      color: accountsFiling?.status === "accepted" ? "var(--color-text-secondary)"
                        : accountsDaysLeft <= 0 ? "var(--color-danger)"
                        : accountsDaysLeft <= 30 ? "var(--color-due-soon)"
                        : "var(--color-text-secondary)",
                      margin: 0,
                    }}>
                      Due {formatDate(accountsDeadline)}
                      {accountsFiling?.status !== "accepted" && accountsDaysLeft <= 30 && accountsDaysLeft > 0 && ` (${accountsDaysLeft}d)`}
                      {accountsFiling?.status !== "accepted" && accountsDaysLeft <= 0 && (() => {
                        const yearsOverdue = Math.floor(-accountsDaysLeft / 365);
                        return yearsOverdue >= 2 ? ` (${yearsOverdue} years overdue)` : " (Overdue)";
                      })()}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {accountsFiling ? (
                      <>
                        <FilingStatusBadge status={accountsFiling.status} filingType="accounts" />
                        {(accountsFiling.status === "failed" || accountsFiling.status === "rejected") && canFile && (
                          <Link href={hasMultiplePeriods ? fileHref : `/file/${company.id}/accounts`} className="focus-ring hoverable-btn" style={filingBtnStyle}>Retry</Link>
                        )}
                      </>
                    ) : !hasMultiplePeriods && canFile ? (
                      <Link href={`/file/${company.id}/accounts`} className="focus-ring hoverable-btn" style={filingBtnStyle}>File</Link>
                    ) : null}
                  </div>
                </div>

                {/* CT600 */}
                {!company.registeredForCorpTax && (
                  <EnableCorpTax companyId={company.id} />
                )}
                {company.registeredForCorpTax && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    backgroundColor: "var(--color-bg-inset)",
                    borderRadius: "6px",
                  }}>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)", margin: 0 }}>CT600</p>
                      <p style={{
                        fontSize: "12px",
                        color: ct600Filing?.status === "accepted" ? "var(--color-text-secondary)"
                          : ct600DaysLeft <= 0 ? "var(--color-danger)"
                          : ct600DaysLeft <= 30 ? "var(--color-due-soon)"
                          : "var(--color-text-secondary)",
                        margin: 0,
                      }}>
                        Due {formatDate(ct600Deadline)}
                        {ct600Filing?.status !== "accepted" && ct600DaysLeft <= 30 && ct600DaysLeft > 0 && ` (${ct600DaysLeft}d)`}
                        {ct600Filing?.status !== "accepted" && ct600DaysLeft <= 0 && (() => {
                          const yearsOverdue = Math.floor(-ct600DaysLeft / 365);
                          return yearsOverdue >= 2 ? ` (${yearsOverdue} years overdue)` : " (Overdue)";
                        })()}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {ct600Filing ? (
                        <>
                          <FilingStatusBadge status={ct600Filing.status} filingType="ct600" />
                          {(ct600Filing.status === "failed" || ct600Filing.status === "rejected") && canFile && (
                            <Link href={hasMultiplePeriods ? fileHref : `/file/${company.id}/ct600`} className="focus-ring hoverable-btn" style={filingBtnStyle}>Retry</Link>
                          )}
                        </>
                      ) : !hasMultiplePeriods && canFile ? (
                        <Link href={`/file/${company.id}/ct600`} className="focus-ring hoverable-btn" style={filingBtnStyle}>File</Link>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>

              {/* Multi-period action */}
              {hasMultiplePeriods && canFile && (
                <Link
                  href={fileHref}
                  className="focus-ring hoverable-pill"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    marginTop: "8px",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--color-primary)",
                    backgroundColor: "var(--color-primary-bg)",
                    textDecoration: "none",
                  }}
                >
                  View all periods
                  <ChevronRight size={13} strokeWidth={2} />
                </Link>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            marginTop: "32px",
          }}
        >
          {currentPage > 1 && (
            <Link
              href={`/dashboard?page=${currentPage - 1}${search ? `&q=${encodeURIComponent(search)}` : ""}${filter ? `&filter=${filter}` : ""}${sort !== "most-overdue" ? `&sort=${sort}` : ""}`}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary-border)",
                textDecoration: "none",
                transition: "opacity 200ms, background-color 200ms",
              }}
            >
              Previous
            </Link>
          )}
          <span style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/dashboard?page=${currentPage + 1}${search ? `&q=${encodeURIComponent(search)}` : ""}${filter ? `&filter=${filter}` : ""}${sort !== "most-overdue" ? `&sort=${sort}` : ""}`}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--color-primary)",
                border: "1px solid var(--color-primary-border)",
                textDecoration: "none",
                transition: "opacity 200ms, background-color 200ms",
              }}
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
