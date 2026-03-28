import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Building2, Plus, AlertTriangle } from "lucide-react";
import Link from "next/link";
import SubscriptionBanner from "@/components/subscription-banner";
import FilingStatusBadge from "@/components/filing-status-badge";
import EnableCorpTax from "@/components/enable-corp-tax";
import EditUTR from "@/components/edit-utr";
import CompanySearch from "@/components/company-search";
import { calculateAccountsDeadline, calculateCT600Deadline } from "@/lib/utils";
import { canAddCompany, getCompanyLimit, TIER_LABELS } from "@/lib/subscription";
import { syncSubscriptionIfStale } from "@/lib/stripe/sync";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PAGE_SIZE = 10;

type FilterType = "overdue" | "due-soon" | "recently-filed" | "accepted" | "rejected" | "failed" | "";

interface DashboardProps {
  searchParams: Promise<{ page?: string; q?: string; filter?: string }>;
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

  const { page: pageParam, q: searchQuery, filter: filterParam } = await searchParams;
  const search = searchQuery?.trim() || "";
  const validFilters = ["overdue", "due-soon", "recently-filed", "accepted", "rejected", "failed"];
  const filter = (validFilters.includes(filterParam ?? "") ? filterParam : "") as FilterType;

  // For overdue/due-soon filters, we need to compute deadlines in JS then filter by ID.
  // Fetch all company IDs + period ends for this user (lightweight query).
  let filterIds: string[] | null = null;
  if (filter === "overdue" || filter === "due-soon") {
    const allCompanies = await prisma.company.findMany({
      where: { userId: user.id, deletedAt: null },
      select: { id: true, accountingPeriodEnd: true, registeredForCorpTax: true },
    });
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    filterIds = allCompanies
      .filter((c) => {
        const accountsDeadline = calculateAccountsDeadline(c.accountingPeriodEnd).getTime();
        const ct600Deadline = c.registeredForCorpTax
          ? calculateCT600Deadline(c.accountingPeriodEnd).getTime()
          : null;

        if (filter === "overdue") {
          return accountsDeadline < now || (ct600Deadline !== null && ct600Deadline < now);
        }
        // due-soon: either deadline is in the future but within 30 days
        const accountsDueSoon = accountsDeadline >= now && accountsDeadline <= now + thirtyDaysMs;
        const ct600DueSoon = ct600Deadline !== null && ct600Deadline >= now && ct600Deadline <= now + thirtyDaysMs;
        return accountsDueSoon || ct600DueSoon;
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

  const totalCompanies = search || filter
    ? await prisma.company.count({ where: baseWhere })
    : allCompanyCount;

  const totalPages = Math.max(1, Math.ceil(totalCompanies / PAGE_SIZE));
  const currentPage = Math.max(1, Math.min(totalPages, parseInt(pageParam ?? "1", 10) || 1));

  const companies = await prisma.company.findMany({
    where: baseWhere,
    include: {
      filings: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "asc" },
    skip: (currentPage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const canFile = user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling";
  const showAddCompany = canAddCompany(user.subscriptionTier, allCompanyCount);
  const companyLimit = getCompanyLimit(user.subscriptionTier);

  // Count filings used in current billing period
  const periodStart = user.subscriptionPeriodStart ?? user.createdAt;
  const filedCompanyIds = await prisma.filing.findMany({
    where: {
      company: { userId: user.id },
      status: { in: ["submitted", "polling_timeout", "accepted"] },
      createdAt: { gte: periodStart },
    },
    select: { companyId: true },
    distinct: ["companyId"],
  });
  const filingsUsed = filedCompanyIds.length;
  const atFilingLimit = filingsUsed >= companyLimit && companyLimit > 0;

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
            backgroundColor: "#FEFCE8",
            border: "1px solid #FDE047",
            borderRadius: "12px",
            marginBottom: "24px",
          }}
        >
          <AlertTriangle size={18} color="#CA8A04" strokeWidth={2} style={{ flexShrink: 0, marginTop: "1px" }} />
          <p style={{ fontSize: "14px", color: "#713F12", margin: 0, fontWeight: 500 }}>
            You have {allCompanyCount} {allCompanyCount === 1 ? "company" : "companies"} but your {TIER_LABELS[user.subscriptionTier]} plan supports {companyLimit}. You can file for up to {companyLimit} {companyLimit === 1 ? "company" : "companies"} this billing period. Remove companies or upgrade your plan from{" "}
            <a href="/choose-plan" style={{ color: "#92400E", fontWeight: 600 }}>Change plan</a>.
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
              color: "#1E293B",
              margin: "0 0 6px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Dashboard
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "2px" }}>
            <p style={{ fontSize: "15px", color: "#64748B", margin: 0 }}>
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
                backgroundColor: user.subscriptionTier === "none" ? "#FEF2F2" : (user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling") ? "#EFF6FF" : "#F8FAFC",
                color: user.subscriptionTier === "none" ? "#DC2626" : (user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling") ? "#2563EB" : "#64748B",
                border: `1px solid ${user.subscriptionTier === "none" ? "#FECACA" : (user.subscriptionStatus === "active" || user.subscriptionStatus === "cancelling") ? "#BFDBFE" : "#E2E8F0"}`,
              }}
            >
              {user.subscriptionTier === "none" ? "No plan" : `${TIER_LABELS[user.subscriptionTier]} plan`}
            </span>
            {companyLimit > 0 && (
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: 600,
                  backgroundColor: atFilingLimit ? "#FEF2F2" : "#F0FDF4",
                  color: atFilingLimit ? "#DC2626" : "#15803D",
                  border: `1px solid ${atFilingLimit ? "#FECACA" : "#BBF7D0"}`,
                }}
              >
                {filingsUsed} / {companyLimit} {companyLimit === 1 ? "filing" : "filings"} used
              </span>
            )}
          </div>
        </div>
        {showAddCompany && (
          <Link
            href="/onboarding"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#2563EB",
              color: "#ffffff",
              padding: "10px 20px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "14px",
              textDecoration: "none",
              transition: "all 200ms",
              flexShrink: 0,
            }}
          >
            <Plus size={16} strokeWidth={2.5} />
            Add company
          </Link>
        )}
      </div>

      {/* Search and filters - show when there are enough companies to paginate, or when a search/filter is active */}
      {(allCompanyCount > PAGE_SIZE || search || filter) && (
        <>
          <CompanySearch />
          <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
            {([
              { key: "", label: "All" },
              { key: "overdue", label: "Overdue" },
              { key: "due-soon", label: "Due soon" },
              { key: "recently-filed", label: "Recently filed" },
              { key: "accepted", label: "Accepted" },
              { key: "rejected", label: "Rejected" },
              { key: "failed", label: "Failed" },
            ] as const).map((f) => {
              const isActive = filter === f.key;
              const params = new URLSearchParams();
              if (f.key) params.set("filter", f.key);
              if (search) params.set("q", search);
              const href = `/dashboard${params.toString() ? `?${params}` : ""}`;
              return (
                <Link
                  key={f.key}
                  href={href}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 600,
                    textDecoration: "none",
                    transition: "all 200ms",
                    backgroundColor: isActive ? "#2563EB" : "#ffffff",
                    color: isActive ? "#ffffff" : "#475569",
                    border: `1px solid ${isActive ? "#2563EB" : "#E2E8F0"}`,
                  }}
                >
                  {f.label}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* No results */}
      {companies.length === 0 && (search || filter) && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "#64748B",
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
        {companies.map((company) => {
          const accountsDeadline = calculateAccountsDeadline(company.accountingPeriodEnd);
          const ct600Deadline = calculateCT600Deadline(company.accountingPeriodEnd);

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

          // How many periods behind is this company?
          // Compare current period end to today — each year gap = 1 period behind.
          const now = new Date();
          const periodsBehind = Math.max(0, now.getUTCFullYear() - company.accountingPeriodEnd.getUTCFullYear() + (
            now.getTime() > new Date(Date.UTC(now.getUTCFullYear(), company.accountingPeriodEnd.getUTCMonth(), company.accountingPeriodEnd.getUTCDate())).getTime() ? 1 : 0
          ) - 1);

          const filingBtnStyle: React.CSSProperties = {
            display: "inline-flex", alignItems: "center",
            backgroundColor: "#F97316", color: "#ffffff",
            padding: "4px 10px", borderRadius: "5px",
            fontWeight: 600, fontSize: "12px", textDecoration: "none",
          };

          return (
            <div
              key={company.id}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "10px",
                padding: "18px",
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
                    backgroundColor: "#EFF6FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={16} color="#2563EB" strokeWidth={2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#1E293B",
                      margin: 0,
                      letterSpacing: "-0.01em",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {company.companyName}
                  </h2>
                  <p style={{ fontSize: "12px", color: "#94A3B8", margin: 0, marginTop: "1px" }}>
                    {company.registeredForCorpTax && company.uniqueTaxReference
                      ? <><EditUTR companyId={company.id} currentUTR={company.uniqueTaxReference} /> &middot; </> : ""}
                    {company.companyRegistrationNumber}
                  </p>
                </div>
              </div>

              {/* Period */}
              <p style={{ fontSize: "12px", color: "#64748B", margin: periodsBehind > 0 ? "0 0 4px 0" : "0 0 12px 0" }}>
                <span style={{ fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: "10px" }}>Period </span>
                {formatDate(company.accountingPeriodStart)} &ndash; {formatDate(company.accountingPeriodEnd)}
              </p>

              {/* Periods behind warning */}
              {periodsBehind > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px",
                    backgroundColor: "#FEF2F2",
                    border: "1px solid #FECACA",
                    borderRadius: "6px",
                    marginBottom: "12px",
                  }}
                >
                  <AlertTriangle size={13} color="#DC2626" strokeWidth={2} style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: "11px", color: "#991B1B", margin: 0, fontWeight: 500 }}>
                    {periodsBehind === 1
                      ? "1 period behind — file this period to advance to the next"
                      : `${periodsBehind} periods behind — each filing advances the period by one year`}
                  </p>
                </div>
              )}

              {/* Filing rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Accounts */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "6px",
                }}>
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: 600, color: "#1E293B", margin: 0 }}>Accounts</p>
                    <p style={{
                      fontSize: "11px",
                      color: accountsDaysLeft <= 0 ? "#DC2626" : accountsDaysLeft <= 30 ? "#D97706" : "#64748B",
                      margin: 0,
                    }}>
                      {formatDate(accountsDeadline)}
                      {accountsDaysLeft <= 30 && accountsDaysLeft > 0 && ` (${accountsDaysLeft}d)`}
                      {accountsDaysLeft <= 0 && " (Overdue)"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {accountsFiling ? (
                      <>
                        <FilingStatusBadge status={accountsFiling.status} filingType="accounts" />
                        {(accountsFiling.status === "failed" || accountsFiling.status === "rejected") && canFile && (
                          <Link href={`/file/${company.id}/accounts`} style={filingBtnStyle}>Retry</Link>
                        )}
                      </>
                    ) : canFile && !atFilingLimit ? (
                      <Link href={`/file/${company.id}/accounts`} style={filingBtnStyle}>File</Link>
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
                    backgroundColor: "#F8FAFC",
                    borderRadius: "6px",
                  }}>
                    <div>
                      <p style={{ fontSize: "12px", fontWeight: 600, color: "#1E293B", margin: 0 }}>CT600</p>
                      <p style={{
                        fontSize: "11px",
                        color: ct600DaysLeft <= 0 ? "#DC2626" : ct600DaysLeft <= 30 ? "#D97706" : "#64748B",
                        margin: 0,
                      }}>
                        {formatDate(ct600Deadline)}
                        {ct600DaysLeft <= 30 && ct600DaysLeft > 0 && ` (${ct600DaysLeft}d)`}
                        {ct600DaysLeft <= 0 && " (Overdue)"}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {ct600Filing ? (
                        <>
                          <FilingStatusBadge status={ct600Filing.status} filingType="ct600" />
                          {(ct600Filing.status === "failed" || ct600Filing.status === "rejected") && canFile && (
                            <Link href={`/file/${company.id}/ct600`} style={filingBtnStyle}>Retry</Link>
                          )}
                        </>
                      ) : canFile && !atFilingLimit ? (
                        <Link href={`/file/${company.id}/ct600`} style={filingBtnStyle}>File</Link>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
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
              href={`/dashboard?page=${currentPage - 1}${search ? `&q=${encodeURIComponent(search)}` : ""}${filter ? `&filter=${filter}` : ""}`}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#2563EB",
                border: "1px solid #BFDBFE",
                textDecoration: "none",
                transition: "all 200ms",
              }}
            >
              Previous
            </Link>
          )}
          <span style={{ fontSize: "14px", color: "#64748B" }}>
            Page {currentPage} of {totalPages}
          </span>
          {currentPage < totalPages && (
            <Link
              href={`/dashboard?page=${currentPage + 1}${search ? `&q=${encodeURIComponent(search)}` : ""}${filter ? `&filter=${filter}` : ""}`}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                color: "#2563EB",
                border: "1px solid #BFDBFE",
                textDecoration: "none",
                transition: "all 200ms",
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
