import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Building2, Plus, AlertTriangle, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import SubscriptionBanner from "@/components/subscription-banner";
import CompanySearch from "@/components/company-search";
import SortDropdown, { type SortType } from "@/components/sort-dropdown";
import {
  type FilterType,
  type FilterCounts,
  matchesFilter,
  computeFilterCounts,
} from "@/lib/dashboard-filters";
import { calculateAccountsDeadline, calculateCT600Deadline } from "@/lib/utils";
import { canAddCompany, getCompanyLimit, TIER_LABELS } from "@/lib/subscription";
import { syncSubscriptionIfStale } from "@/lib/stripe/sync";
import { getOutstandingPeriods } from "@/lib/periods";

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
  const validFilters: FilterType[] = ["needs-attention", "recently-filed", "issues"];
  const filter: FilterType = validFilters.includes(filterParam as FilterType)
    ? (filterParam as FilterType)
    : "";
  const validSorts: SortType[] = ["most-overdue", "most-outstanding", "name-asc", "date-added-newest", "date-added-oldest"];
  const sort: SortType = validSorts.includes(sortParam as SortType) ? (sortParam as SortType) : "most-overdue";

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
  const paginatedCompanies = filteredCompanies.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

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
            <span className="add-company-label">Add company</span>
          </Link>
        )}
      </div>

      {/* Filters, search, and sort — show when there are 2+ companies, or when a search/filter is active */}
      {(allCompanyCount > 1 || search || filter) && (
        <>
          {/* Segmented filter control */}
          <div
            style={{
              display: "inline-flex",
              backgroundColor: "var(--color-bg-inset)",
              borderRadius: "8px",
              padding: "3px",
              marginBottom: "10px",
              overflowX: "auto",
            }}
          >
            {([
              { key: "" as FilterType, label: "All", mobileLabel: "All", count: filterCounts.all, urgent: false },
              { key: "needs-attention" as FilterType, label: "Needs Attention", mobileLabel: "Attention", count: filterCounts.needsAttention, urgent: true },
              { key: "recently-filed" as FilterType, label: "Recently Filed", mobileLabel: "Filed", count: filterCounts.recentlyFiled, urgent: false },
              { key: "issues" as FilterType, label: "Issues", mobileLabel: "Issues", count: filterCounts.issues, urgent: true },
            ]).map((f) => {
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
                  className="focus-ring segmented-tab"
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    transition: "background-color 150ms, box-shadow 150ms",
                    backgroundColor: isActive ? "var(--color-bg-card)" : "transparent",
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  <span className="segmented-tab-label-full">{f.label}</span>
                  <span className="segmented-tab-label-short">{f.mobileLabel}</span>
                  {" "}
                  {showUrgentBadge ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "var(--color-danger-bg)",
                        color: "var(--color-danger)",
                        padding: "1px 6px",
                        borderRadius: "9999px",
                        fontSize: "10px",
                        fontWeight: 600,
                        minWidth: "18px",
                      }}
                    >
                      {f.count}
                    </span>
                  ) : (
                    <span style={{ color: "var(--color-text-muted)", fontWeight: 500 }}>{f.count}</span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Search + sort row */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
            <CompanySearch />
            <SortDropdown currentSort={sort} />
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

          // Show the current (oldest unfiled) period's deadlines
          const currentPeriod = periods.find((p) => !p.isComplete) ?? periods[0];
          const accountsDeadline = currentPeriod?.accountsDeadline ?? calculateAccountsDeadline(company.accountingPeriodEnd);
          const ct600Deadline = currentPeriod?.ct600Deadline ?? calculateCT600Deadline(company.accountingPeriodEnd);

          const accountsDaysLeft = Math.ceil(
            (accountsDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          const ct600DaysLeft = Math.ceil(
            (ct600Deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );

          return (
            <Link
              key={company.id}
              href={`/company/${company.id}`}
              className="focus-ring"
              style={{
                display: "block",
                backgroundColor: "var(--color-bg-card)",
                borderRadius: "10px",
                padding: "18px",
                border: "1px solid var(--color-border)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                textDecoration: "none",
                color: "inherit",
                transition: "background-color 200ms",
              }}
            >
              {/* Header — icon + name + CRN */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "8px",
                  backgroundColor: outstandingCount === 0 ? "var(--color-success-bg)" : "var(--color-primary-bg)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <span style={{ color: outstandingCount === 0 ? "var(--color-success)" : "var(--color-primary)", display: "flex" }}>
                    {outstandingCount === 0
                      ? <CheckCircle2 size={16} color="currentColor" strokeWidth={2} />
                      : <Building2 size={16} color="currentColor" strokeWidth={2} />
                    }
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{
                    fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)",
                    margin: 0, letterSpacing: "-0.01em",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {company.companyName}
                  </h2>
                  <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0, marginTop: "1px" }}>
                    {company.companyRegistrationNumber}
                  </p>
                </div>
              </div>

              {/* Deadline summary */}
              {outstandingCount > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                  {/* Accounts deadline */}
                  <p style={{
                    fontSize: "12px", margin: 0, fontWeight: 600,
                    color: accountsDaysLeft <= 0 ? "var(--color-danger)"
                      : accountsDaysLeft <= 30 ? "var(--color-due-soon)"
                      : "var(--color-text-secondary)",
                  }}>
                    {accountsDaysLeft <= 0
                      ? (() => {
                          const yearsOverdue = Math.floor(-accountsDaysLeft / 365);
                          return yearsOverdue >= 2
                            ? `Accounts ${yearsOverdue} years overdue — due ${formatDate(accountsDeadline)}`
                            : `Accounts overdue — due ${formatDate(accountsDeadline)}`;
                        })()
                      : accountsDaysLeft <= 30
                        ? `Accounts due in ${accountsDaysLeft}d — ${formatDate(accountsDeadline)}`
                        : `Accounts due ${formatDate(accountsDeadline)}`
                    }
                  </p>
                  {/* CT600 deadline — only if registered */}
                  {company.registeredForCorpTax && (
                    <p style={{
                      fontSize: "12px", margin: 0, fontWeight: 600,
                      color: ct600DaysLeft <= 0 ? "var(--color-danger)"
                        : ct600DaysLeft <= 30 ? "var(--color-due-soon)"
                        : "var(--color-text-secondary)",
                    }}>
                      {ct600DaysLeft <= 0
                        ? (() => {
                            const yearsOverdue = Math.floor(-ct600DaysLeft / 365);
                            return yearsOverdue >= 2
                              ? `CT600 ${yearsOverdue} years overdue — due ${formatDate(ct600Deadline)}`
                              : `CT600 overdue — due ${formatDate(ct600Deadline)}`;
                          })()
                        : ct600DaysLeft <= 30
                          ? `CT600 due in ${ct600DaysLeft}d — ${formatDate(ct600Deadline)}`
                          : `CT600 due ${formatDate(ct600Deadline)}`
                      }
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-success)", margin: 0 }}>
                    All caught up
                  </p>
                  <p style={{ fontSize: "11px", color: "var(--color-text-secondary)", margin: "2px 0 0 0" }}>
                    Next period due {formatDate(accountsDeadline)}
                  </p>
                </div>
              )}

              {/* Outstanding badge */}
              {outstandingCount > 0 && (
                <div style={{
                  display: "inline-flex", alignItems: "center", gap: "2px",
                  padding: "2px 6px 2px 8px", borderRadius: "9999px",
                  fontSize: "10px", fontWeight: 600,
                  backgroundColor: outstandingCount >= 4 ? "var(--color-danger-bg)" : "var(--color-warning-bg)",
                  color: outstandingCount >= 4 ? "var(--color-danger)" : "var(--color-warning-text)",
                  border: `1px solid ${outstandingCount >= 4 ? "var(--color-danger-border)" : "var(--color-warning-border)"}`,
                }}>
                  {outstandingCount} outstanding
                  <span style={{ display: "flex" }}><ChevronRight size={10} strokeWidth={2.5} /></span>
                </div>
              )}
            </Link>
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
