import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Building2, Plus, AlertTriangle, ChevronRight, CheckCircle2, Download } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import SubscriptionBanner from "@/components/subscription-banner";
import CompanySearch from "@/components/company-search";
import SortDropdown, { type SortType } from "@/components/sort-dropdown";
import {
  type FilterType,
  type FilterCounts,
  matchesFilter,
  computeFilterCounts,
} from "@/lib/dashboard-filters";
import { canAddCompany, getCompanyLimit, TIER_LABELS } from "@/lib/subscription";
import { syncSubscriptionIfStale } from "@/lib/stripe/sync";
import { buildPeriodViews } from "@/lib/filing-queries";
import { isFilingLive } from "@/lib/launch-mode";
import { ReviewPrompt } from "@/components/marketing/ReviewPrompt";
import CalendarFeedSection from "@/components/calendar-feed-section";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PAGE_SIZE = 10;

interface DashboardProps {
  searchParams: Promise<{ page?: string; q?: string; filter?: string; sort?: string }>;
}

function getNow() {
  return Date.now();
}

export default async function DashboardPage({ searchParams }: DashboardProps) {
  const now = getNow();
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

  const [allCompanyCount, hasAcceptedFiling, existingReview] = await Promise.all([
    prisma.company.count({
      where: { userId: user.id, deletedAt: null },
    }),
    prisma.filing.findFirst({
      where: { company: { userId: user.id }, status: "accepted" },
      select: { id: true },
    }),
    prisma.review.findUnique({
      where: { userId: user.id },
      select: { id: true },
    }),
  ]);

  const showReviewPrompt = !!hasAcceptedFiling && !existingReview;

  if (allCompanyCount === 0) {
    return (
      <div className="max-w-[960px] mx-auto">
        <SubscriptionBanner status={user.subscriptionStatus} />
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-foreground mb-1.5 tracking-[-0.02em]">
              Dashboard
            </h1>
          </div>
        </div>
        <div className="text-center px-6 py-16 bg-card border border-border rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-primary-bg inline-flex items-center justify-center mb-4">
            <Building2 size={24} color="var(--color-primary)" strokeWidth={2} />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">
            No companies yet
          </h2>
          <p className="text-[15px] text-secondary mb-6 max-w-[400px] mx-auto leading-normal">
            Add your first company to get started with filing. You can explore the dashboard in the
            meantime.
          </p>
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 bg-primary text-card py-2.5 px-6 rounded-lg font-semibold text-sm no-underline"
          >
            <Plus size={16} strokeWidth={2.5} />
            Add your first company
          </Link>
        </div>
      </div>
    );
  }

  const {
    page: pageParam,
    q: searchQuery,
    filter: filterParam,
    sort: sortParam,
  } = await searchParams;
  const search = searchQuery?.trim() || "";
  const validFilters: FilterType[] = ["needs-attention", "recently-filed", "issues"];
  const filter: FilterType = validFilters.includes(filterParam as FilterType)
    ? (filterParam as FilterType)
    : "";
  const validSorts: SortType[] = [
    "most-overdue",
    "most-outstanding",
    "name-asc",
    "date-added-newest",
    "date-added-oldest",
  ];
  const sort: SortType = validSorts.includes(sortParam as SortType)
    ? (sortParam as SortType)
    : "most-overdue";

  const baseWhere = {
    userId: user.id,
    deletedAt: null,
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
    const periods = buildPeriodViews(c.filings);
    const incompletePeriods = periods.filter((p) => !p.isComplete && !p.isSuppressed);
    const outstandingCount = incompletePeriods.length;

    // Earliest deadline across all outstanding periods (for "most overdue" sort)
    let earliestDeadline = Infinity;
    for (const p of incompletePeriods) {
      if (!p.accountsFiled)
        earliestDeadline = Math.min(earliestDeadline, p.accountsDeadline.getTime());
      if (c.registeredForCorpTax && !p.ct600Filed)
        earliestDeadline = Math.min(earliestDeadline, p.ct600Deadline.getTime());
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

  // Compute filter counts over the search-filtered set (counts reflect what the user sees)
  const filterCounts: FilterCounts = computeFilterCounts(
    companiesWithSortData.map((c) => ({
      periods: c.periods,
      registeredForCorpTax: c.company.registeredForCorpTax,
      filings: c.company.filings,
    })),
  );

  // Apply active filter as JS predicate
  const filteredCompanies = filter
    ? companiesWithSortData.filter((c) =>
        matchesFilter(filter, c.periods, c.company.registeredForCorpTax, c.company.filings),
      )
    : companiesWithSortData;

  const totalCompanies = filteredCompanies.length;
  const totalPages = Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));
  const currentPage = Math.max(1, Math.min(totalPages, parseInt(pageParam ?? "1", 10) || 1));
  const paginatedCompanies = filteredCompanies.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const canFile = user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling";
  const showAddCompany = canAddCompany(user.subscriptionTier, allCompanyCount);
  const companyLimit = getCompanyLimit(user.subscriptionTier);

  return (
    <div className="max-w-[960px] mx-auto">
      <SubscriptionBanner status={user.subscriptionStatus} />

      {showReviewPrompt && <ReviewPrompt />}

      {!isFilingLive() && (
        <div className="flex items-center gap-2.5 py-3.5 px-5 bg-primary-bg border border-primary-border rounded-xl mb-6">
          <p className="text-sm text-primary-text font-medium">
            Filing isn&apos;t available just yet. Add your companies and explore the dashboard
            &mdash; we&apos;ll notify you when you can choose a plan and start filing.
          </p>
        </div>
      )}

      {canFile && companyLimit > 0 && allCompanyCount > companyLimit && (
        <div className="flex items-start gap-2.5 py-3.5 px-5 bg-warning-bg border border-warning-border rounded-xl mb-6">
          <span className="text-warning shrink-0 mt-px flex">
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="text-sm text-warning-text font-medium">
            You have {allCompanyCount} {allCompanyCount === 1 ? "company" : "companies"} but your{" "}
            {TIER_LABELS[user.subscriptionTier]} plan supports {companyLimit}. You can file for up
            to {companyLimit} {companyLimit === 1 ? "company" : "companies"} this billing period.
            Remove companies or upgrade your plan from{" "}
            <a href="/choose-plan" className="text-warning-link font-semibold">
              Change plan
            </a>
            .
          </p>
        </div>
      )}

      {/* Page heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold text-foreground mb-1.5 tracking-[-0.02em]">
            Dashboard
          </h1>
          <div className="flex items-center gap-2.5 mt-0.5">
            <p className="text-[15px] text-secondary">
              {allCompanyCount} {allCompanyCount === 1 ? "company" : "companies"}
              {companyLimit > 0 && ` / ${companyLimit}`}
            </p>
            <span
              className={cn(
                "inline-flex items-center gap-[5px] px-2.5 py-[3px] rounded-full text-xs font-semibold border",
                user.subscriptionTier === "none"
                  ? "bg-danger-bg text-danger border-danger-border"
                  : user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling"
                    ? "bg-primary-bg text-primary border-primary-border"
                    : "bg-inset text-secondary border-border",
              )}
            >
              {user.subscriptionTier === "none"
                ? "No plan"
                : `${TIER_LABELS[user.subscriptionTier]} plan`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {canFile && (
            <a
              href="/api/export/companies-csv"
              download
              className="inline-flex items-center gap-1.5 py-2.5 px-5 rounded-lg font-semibold text-sm no-underline text-secondary border border-border transition-all duration-200"
            >
              <Download size={16} strokeWidth={2} />
              Export CSV
            </a>
          )}
          {showAddCompany && (
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-1.5 bg-primary text-card py-2.5 px-5 rounded-lg font-semibold text-sm no-underline transition-all duration-200 shrink-0"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span className="add-company-label">Add company</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filters, search, and sort — show when there are 2+ companies, or when a search/filter is active */}
      {(allCompanyCount > 1 || search || filter) && (
        <>
          {/* Segmented filter control */}
          <div className="flex w-full sm:inline-flex sm:w-auto overflow-x-auto scrollbar-none bg-inset rounded-lg p-[3px] mb-2.5 [-webkit-overflow-scrolling:touch]">

            {[
              {
                key: "" as FilterType,
                label: "All",
                mobileLabel: "All",
                count: filterCounts.all,
                urgent: false,
              },
              {
                key: "needs-attention" as FilterType,
                label: "Needs Attention",
                mobileLabel: "Attention",
                count: filterCounts.needsAttention,
                urgent: true,
              },
              {
                key: "recently-filed" as FilterType,
                label: "Recently Filed",
                mobileLabel: "Filed",
                count: filterCounts.recentlyFiled,
                urgent: false,
              },
              {
                key: "issues" as FilterType,
                label: "Issues",
                mobileLabel: "Issues",
                count: filterCounts.issues,
                urgent: true,
              },
            ].map((f) => {
              const isActive = filter === f.key;
              const params = new URLSearchParams();
              if (f.key) params.set("filter", f.key);
              if (search) params.set("q", search);
              if (sort !== "most-overdue") params.set("sort", sort);
              const href = `/dashboard${params.toString() ? `?${params}` : ""}`;
              const showUrgentBadge = f.urgent && f.count > 0;
              return (
                <Link
                  key={f.key}
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "focus-ring segmented-tab flex-1 sm:flex-none py-1.5 px-2.5 rounded-md text-xs text-center no-underline whitespace-nowrap transition-all duration-150",
                    isActive
                      ? "font-semibold bg-card text-foreground shadow-sm"
                      : "font-medium bg-transparent text-secondary",
                  )}
                >
                  <span className="segmented-tab-label-full">{f.label}</span>
                  <span className="segmented-tab-label-short">{f.mobileLabel}</span>{" "}
                  {showUrgentBadge ? (
                    <span className="inline-flex items-center justify-center bg-danger-bg text-danger px-1.5 py-px rounded-full text-[10px] font-semibold min-w-[18px]">
                      {f.count}
                    </span>
                  ) : (
                    <span className="text-muted font-medium">
                      {f.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Search + sort row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5 mb-4">

            <CompanySearch />
            <SortDropdown currentSort={sort} />
          </div>
        </>
      )}

      {/* No results */}
      {totalCompanies === 0 && (search || filter) && (
        <div className="text-center px-6 py-12 text-secondary">
          <p className="text-[15px] mb-1 font-medium">
            {search ? (
              <>No companies matching &ldquo;{search}&rdquo;</>
            ) : (
              "No companies match this filter"
            )}
          </p>
          <p className="text-[13px]">
            {search
              ? "Try a different name or registration number."
              : "Try a different filter or check back later."}
          </p>
        </div>
      )}

      {/* Company cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedCompanies.map(({ company, periods, outstandingCount }) => {
          // Show the current (oldest unfiled) period's deadlines
          const currentPeriod = periods.find((p) => !p.isComplete && !p.isSuppressed) ?? periods[0];
          const accountsDeadline = currentPeriod?.accountsDeadline ?? company.accountingPeriodEnd;

          const accountsDaysLeft = Math.ceil(
            (accountsDeadline.getTime() - now) / (1000 * 60 * 60 * 24),
          );

          // Pre-compute deadline text
          const accountsOverdueYears =
            accountsDaysLeft <= 0 ? Math.floor(-accountsDaysLeft / 365) : 0;
          const accountsText =
            accountsDaysLeft <= 0
              ? accountsOverdueYears >= 2
                ? `Accounts ${accountsOverdueYears} years overdue`
                : `Accounts overdue \u2014 due ${formatDate(accountsDeadline)}`
              : accountsDaysLeft <= 30
                ? `Accounts due in ${accountsDaysLeft}\u00a0days \u2014 ${formatDate(accountsDeadline)}`
                : `Accounts due ${formatDate(accountsDeadline)}`;

          return (
            <article key={company.id}>
              <Link
                href={`/company/${company.id}`}
                className="focus-ring hoverable-card block bg-card rounded-[10px] p-[18px] border border-border shadow-active no-underline text-inherit transition-colors duration-200 touch-manipulation"
              >
                {/* Header — icon + name + CRN */}
                <div className="flex items-center gap-2.5 mb-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                      outstandingCount === 0 ? "bg-success-bg" : "bg-primary-bg",
                    )}
                  >
                    <span
                      className={cn(
                        "flex",
                        outstandingCount === 0 ? "text-success" : "text-primary",
                      )}
                      aria-hidden="true"
                    >
                      {outstandingCount === 0 ? (
                        <CheckCircle2 size={16} color="currentColor" strokeWidth={2} />
                      ) : (
                        <Building2 size={16} color="currentColor" strokeWidth={2} />
                      )}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-foreground tracking-[-0.01em] whitespace-nowrap overflow-hidden text-ellipsis">
                      {company.companyName}
                    </h2>
                    <p className="text-xs text-muted mt-px">
                      {company.companyRegistrationNumber}
                    </p>
                  </div>
                </div>

                {/* Deadline summary */}
                {outstandingCount > 0 ? (
                  <div className="flex flex-col gap-1 mb-3">
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        accountsDaysLeft <= 0
                          ? "text-danger"
                          : accountsDaysLeft <= 30
                            ? "text-due-soon"
                            : "text-secondary",
                      )}
                    >
                      {accountsText}
                    </p>
                  </div>
                ) : (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-success">
                      All caught up
                    </p>
                    <p className="text-[11px] text-secondary mt-0.5">
                      Next period due {formatDate(accountsDeadline)}
                    </p>
                  </div>
                )}

                {/* Outstanding badge */}
                {outstandingCount > 0 && (
                  <div
                    className={cn(
                      "inline-flex items-center gap-0.5 py-0.5 pl-2 pr-1.5 rounded-full text-[10px] font-semibold tabular-nums border",
                      outstandingCount >= 4
                        ? "bg-danger-bg text-danger border-danger-border"
                        : "bg-warning-bg text-warning-text border-warning-border",
                    )}
                  >
                    {outstandingCount} {outstandingCount === 1 ? "period" : "periods"}
                    <span className="flex" aria-hidden="true">
                      <ChevronRight size={10} strokeWidth={2.5} />
                    </span>
                  </div>
                )}
              </Link>
            </article>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <Link
              href={`/dashboard?page=${currentPage - 1}${search ? `&q=${encodeURIComponent(search)}` : ""}${filter ? `&filter=${filter}` : ""}${sort !== "most-overdue" ? `&sort=${sort}` : ""}`}
              className="py-2 px-4 rounded-lg text-sm font-semibold text-primary border border-primary-border no-underline transition-all duration-200"
            >
              Previous
            </Link>
          )}
          <span className="text-sm text-secondary">
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/dashboard?page=${currentPage + 1}${search ? `&q=${encodeURIComponent(search)}` : ""}${filter ? `&filter=${filter}` : ""}${sort !== "most-overdue" ? `&sort=${sort}` : ""}`}
              className="py-2 px-4 rounded-lg text-sm font-semibold text-primary border border-primary-border no-underline transition-all duration-200"
            >
              Next
            </Link>
          )}
        </div>
      )}

      <div className="mt-8">
        <CalendarFeedSection initialToken={user.calendarFeedToken} />
      </div>
    </div>
  );
}
