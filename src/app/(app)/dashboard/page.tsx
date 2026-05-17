import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Plus, AlertTriangle, ChevronRight, Download } from "lucide-react";
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
import { getOutstandingCount, getEarliestDeadline } from "@/lib/filing-views";
import { isFilingLive, isTaxFilingLive } from "@/lib/launch-mode";
import { getOnboardingState } from "@/lib/onboarding";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import { ReviewPrompt } from "@/components/marketing/ReviewPrompt";
import CalendarFeedSection from "@/components/calendar-feed-section";
import { LedgerList, LedgerRow } from "@/components/filing-ledger";

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

  const [
    allCompanyCount,
    existingReview,
    hasSubmittedFilingRow,
    firstCompany,
  ] = await Promise.all([
    prisma.company.count({
      where: { userId: user.id, deletedAt: null },
    }),
    prisma.review.findUnique({
      where: { userId: user.id },
      select: { id: true },
    }),
    // "Filed through DormantFile" means submittedAt is set. Synced Companies
    // House history lands as status "accepted"/"filed_elsewhere" with no
    // submittedAt, so it must NOT count toward onboarding completion.
    prisma.filing.findFirst({
      where: {
        company: { userId: user.id },
        submittedAt: { not: null },
      },
      select: { id: true },
    }),
    prisma.company.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    }),
  ]);

  // Only prompt for a review once the user has actually filed *through*
  // DormantFile (submittedAt set). Seeded Companies House history lands as
  // status "accepted" with no submittedAt and must not trigger the prompt.
  const showReviewPrompt = !!hasSubmittedFilingRow && !existingReview;

  let onboardingState: ReturnType<typeof getOnboardingState> | null = null;
  try {
    onboardingState = getOnboardingState({
      companyCount: allCompanyCount,
      subscriptionStatus: user.subscriptionStatus,
      hasSubmittedFiling: !!hasSubmittedFilingRow,
      dismissedAt: user.onboardingDismissedAt ?? null,
      accountsFilingLive: isFilingLive(),
      ct600FilingLive: isTaxFilingLive(),
      firstCompanyId: firstCompany?.id ?? null,
    });
  } catch {
    // getOnboardingState is pure; this only fires on a programming error.
    // Degrade gracefully (hide the checklist) rather than 500 the dashboard.
    onboardingState = null;
  }
  const showOnboarding =
    !!onboardingState && (onboardingState.visible || onboardingState.complete);

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
        {showOnboarding && onboardingState ? (
          <OnboardingChecklist state={onboardingState} />
        ) : (
          <div className="px-6 py-16 bg-card border border-border rounded-xl text-center">
            <h2 className="text-lg font-bold text-foreground mb-2">No companies yet</h2>
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
        )}
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
    const outstandingCount = getOutstandingCount(c.filings as never[], "accounts");
    const earliestDeadline = getEarliestDeadline(c.filings as never[]);

    return { company: c, outstandingCount, earliestDeadline };
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
      registeredForCorpTax: c.company.registeredForCorpTax,
      filings: c.company.filings,
    })),
  );

  // Apply active filter as JS predicate
  const filteredCompanies = filter
    ? companiesWithSortData.filter((c) =>
        matchesFilter(filter, c.company.filings, c.company.registeredForCorpTax),
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

  // One ranked column ordered by urgency. Each company carries the deadline
  // phrase + colour so a 4-years-overdue company never reads like a caught-up
  // one; overdue companies are split out so "is anything on fire?" is answered
  // at a glance instead of inferred by reading down the list.
  const rows = paginatedCompanies.map(({ company, outstandingCount }) => {
    const currentFiling = company.filings
      .filter(
        (f) =>
          f.filingType === "accounts" &&
          f.status !== "accepted" &&
          f.status !== "filed_elsewhere" &&
          !f.suppressedAt,
      )
      .sort((a, b) => a.periodEnd.getTime() - b.periodEnd.getTime())[0];
    const accountsDeadline = currentFiling?.deadline ?? company.accountingPeriodEnd;
    const accountsDaysLeft = Math.ceil((accountsDeadline.getTime() - now) / (1000 * 60 * 60 * 24));
    const accountsOverdueYears = accountsDaysLeft <= 0 ? Math.floor(-accountsDaysLeft / 365) : 0;
    const accountsText =
      accountsDaysLeft <= 0
        ? accountsOverdueYears >= 2
          ? `Accounts ${accountsOverdueYears} years overdue`
          : `Accounts overdue — due ${formatDate(accountsDeadline)}`
        : accountsDaysLeft <= 30
          ? `Accounts due in ${accountsDaysLeft} days — ${formatDate(accountsDeadline)}`
          : `Accounts due ${formatDate(accountsDeadline)}`;
    return {
      company,
      outstandingCount,
      accountsDeadline,
      accountsDaysLeft,
      accountsText,
      isOverdue: outstandingCount > 0 && accountsDaysLeft <= 0,
    };
  });

  const overdueRows = rows.filter((r) => r.isOverdue);
  const otherRows = rows.filter((r) => !r.isOverdue);
  const split = overdueRows.length > 0 && otherRows.length > 0;
  const singleFocused = allCompanyCount === 1 && !search && !filter && rows.length === 1;

  function deadlineColor(daysLeft: number) {
    return daysLeft <= 0 ? "text-danger" : daysLeft <= 30 ? "text-due-soon" : "text-secondary";
  }

  function renderRow(r: (typeof rows)[number]) {
    return (
      <Link
        key={r.company.id}
        href={`/company/${r.company.id}`}
        className="focus-ring hoverable-card block no-underline text-inherit transition-colors duration-200"
      >
        <LedgerRow
          title={r.company.companyName}
          meta={
            <p className="m-0">
              <span className="text-muted">{r.company.companyRegistrationNumber}</span>
              {" · "}
              {r.outstandingCount > 0 ? (
                <span className={deadlineColor(r.accountsDaysLeft)}>{r.accountsText}</span>
              ) : (
                <>
                  <span className="text-success">All caught up</span>
                  <span className="text-secondary">
                    {" · "}next due {formatDate(r.accountsDeadline)}
                  </span>
                </>
              )}
            </p>
          }
          actions={
            r.outstandingCount > 0 ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-xs font-semibold tabular-nums",
                  r.outstandingCount >= 4 ? "text-danger" : "text-warning-text",
                )}
              >
                {r.outstandingCount} {r.outstandingCount === 1 ? "period" : "periods"}
                <ChevronRight size={14} strokeWidth={2.5} />
              </span>
            ) : (
              <span className="flex text-muted" aria-hidden="true">
                <ChevronRight size={16} strokeWidth={2} />
              </span>
            )
          }
        />
      </Link>
    );
  }

  return (
    <div className="max-w-[960px] mx-auto">
      <SubscriptionBanner status={user.subscriptionStatus} />

      {showOnboarding && onboardingState && <OnboardingChecklist state={onboardingState} />}

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
          <p className="text-[15px] text-secondary mt-0.5">
            {allCompanyCount} {allCompanyCount === 1 ? "company" : "companies"}
            {companyLimit > 0 && ` / ${companyLimit}`}
            {" · "}
            <span className={cn(user.subscriptionTier === "none" && "text-danger font-semibold")}>
              {user.subscriptionTier === "none"
                ? "No plan"
                : `${TIER_LABELS[user.subscriptionTier]} plan`}
            </span>
          </p>
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

      {/* Filter + search + sort — shown at 2+ companies, or when searching/filtering */}
      {(allCompanyCount > 1 || search || filter) && (
        <>
          <div className="flex items-center gap-5 sm:gap-6 overflow-x-auto border-b border-border mb-4 scrollbar-none">
            {[
              { key: "" as FilterType, label: "All", count: filterCounts.all, urgent: false },
              {
                key: "needs-attention" as FilterType,
                label: "Needs attention",
                count: filterCounts.needsAttention,
                urgent: true,
              },
              {
                key: "recently-filed" as FilterType,
                label: "Recently filed",
                count: filterCounts.recentlyFiled,
                urgent: false,
              },
              {
                key: "issues" as FilterType,
                label: "Issues",
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
              return (
                <Link
                  key={f.key}
                  href={href}
                  role="tab"
                  aria-selected={isActive}
                  className={cn(
                    "focus-ring -mb-px whitespace-nowrap border-0 border-b-2 bg-transparent pb-2.5 text-[13px] no-underline transition-colors duration-200",
                    isActive
                      ? "border-foreground font-semibold text-foreground"
                      : "border-transparent font-medium text-secondary hover:text-foreground",
                  )}
                >
                  {f.label}{" "}
                  <span
                    className={cn(
                      f.urgent && f.count > 0
                        ? "font-semibold text-danger"
                        : "font-normal text-muted",
                    )}
                  >
                    ({f.count})
                  </span>
                </Link>
              );
            })}
          </div>

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

      {/* Company list — focused summary for a single company, otherwise a
          prioritised ledger split into Overdue / Everything else */}
      {singleFocused
        ? (() => {
            const r = rows[0];
            return (
              <Link
                href={`/company/${r.company.id}`}
                className="focus-ring hoverable-card block no-underline text-inherit rounded-xl border border-border bg-card p-6 sm:p-8 transition-colors duration-200"
              >
                <h2 className="m-0 text-xl font-bold text-foreground tracking-[-0.01em]">
                  {r.company.companyName}
                </h2>
                <p className="m-0 mt-1 text-sm text-muted">
                  {r.company.companyRegistrationNumber}
                </p>
                {r.outstandingCount > 0 ? (
                  <>
                    <p
                      className={cn(
                        "m-0 mt-6 text-[15px] font-semibold",
                        deadlineColor(r.accountsDaysLeft),
                      )}
                    >
                      {r.accountsText}
                    </p>
                    <p className="m-0 mt-1 text-sm text-secondary">
                      {r.outstandingCount} outstanding{" "}
                      {r.outstandingCount === 1 ? "period" : "periods"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="m-0 mt-6 text-[15px] font-semibold text-success">
                      All caught up
                    </p>
                    <p className="m-0 mt-1 text-sm text-secondary">
                      Next period due {formatDate(r.accountsDeadline)}
                    </p>
                  </>
                )}
                <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                  Open company
                  <ChevronRight size={16} strokeWidth={2.5} />
                </span>
              </Link>
            );
          })()
        : rows.length > 0
          ? split
            ? (
              <div className="flex flex-col gap-6">
                <div>
                  <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary">
                    Overdue <span className="text-danger">({overdueRows.length})</span>
                  </p>
                  <LedgerList>{overdueRows.map(renderRow)}</LedgerList>
                </div>
                <div>
                  <p className="m-0 mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary">
                    Everything else <span className="text-muted">({otherRows.length})</span>
                  </p>
                  <LedgerList>{otherRows.map(renderRow)}</LedgerList>
                </div>
              </div>
            )
            : <LedgerList>{rows.map(renderRow)}</LedgerList>
          : null}

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
