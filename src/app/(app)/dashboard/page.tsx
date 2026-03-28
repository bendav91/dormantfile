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

interface DashboardProps {
  searchParams: Promise<{ page?: string; q?: string }>;
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

  const { page: pageParam, q: searchQuery } = await searchParams;
  const search = searchQuery?.trim() || "";

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

  const totalCompanies = search
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
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
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

      {/* Search - show when there are enough companies to paginate, or when a search is active */}
      {(allCompanyCount > PAGE_SIZE || search) && <CompanySearch />}

      {/* No results */}
      {companies.length === 0 && search && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            color: "#64748B",
          }}
        >
          <p style={{ fontSize: "15px", margin: "0 0 4px 0", fontWeight: 500 }}>
            No companies matching &ldquo;{search}&rdquo;
          </p>
          <p style={{ fontSize: "13px", margin: 0 }}>
            Try a different name or registration number.
          </p>
        </div>
      )}

      {/* Company cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
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

          return (
            <div
              key={company.id}
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "12px",
                padding: "28px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                transition: "box-shadow 200ms, transform 200ms",
              }}
            >
              {/* Card header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "24px",
                  paddingBottom: "20px",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    backgroundColor: "#EFF6FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Building2 size={20} color="#2563EB" strokeWidth={2} />
                </div>
                <div>
                  <h2
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#1E293B",
                      margin: 0,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {company.companyName}
                  </h2>
                  <p style={{ fontSize: "13px", color: "#94A3B8", margin: 0, marginTop: "2px" }}>
                    {company.registeredForCorpTax && company.uniqueTaxReference
                      ? <><EditUTR companyId={company.id} currentUTR={company.uniqueTaxReference} /> &middot; </> : ""}
                    {company.companyRegistrationNumber}
                  </p>
                </div>
              </div>

              {/* Accounting period */}
              <div style={{ marginBottom: "20px" }}>
                <p
                  style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "#94A3B8",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    margin: "0 0 4px 0",
                  }}
                >
                  Accounting Period
                </p>
                <p style={{ fontSize: "15px", color: "#1E293B", margin: 0, fontWeight: 500 }}>
                  {formatDate(company.accountingPeriodStart)} &ndash;{" "}
                  {formatDate(company.accountingPeriodEnd)}
                </p>
              </div>

              {/* Filing rows */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  paddingTop: "20px",
                  borderTop: "1px solid #F1F5F9",
                }}
              >
                {/* Accounts row */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  backgroundColor: "#F8FAFC",
                  borderRadius: "8px",
                }}>
                  <div>
                    <p style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: "0 0 2px 0" }}>
                      Annual Accounts
                    </p>
                    <p style={{
                      fontSize: "12px",
                      color: accountsDaysLeft <= 0 ? "#DC2626" : accountsDaysLeft <= 30 ? "#D97706" : "#64748B",
                      margin: 0,
                    }}>
                      Due: {formatDate(accountsDeadline)}
                      {accountsDaysLeft <= 30 && accountsDaysLeft > 0 && ` (${accountsDaysLeft}d left)`}
                      {accountsDaysLeft <= 0 && " (Overdue)"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {accountsFiling ? (
                      <>
                        <FilingStatusBadge status={accountsFiling.status} filingType="accounts" />
                        {(accountsFiling.status === "failed" || accountsFiling.status === "rejected") && canFile && (
                          <Link
                            href={`/file/${company.id}/accounts`}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: "6px",
                              backgroundColor: "#F97316", color: "#ffffff",
                              padding: "6px 14px", borderRadius: "6px",
                              fontWeight: 600, fontSize: "13px", textDecoration: "none",
                            }}
                          >
                            Retry
                          </Link>
                        )}
                      </>
                    ) : canFile && !atFilingLimit ? (
                      <Link
                        href={`/file/${company.id}/accounts`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "6px",
                          backgroundColor: "#F97316", color: "#ffffff",
                          padding: "6px 14px", borderRadius: "6px",
                          fontWeight: 600, fontSize: "13px", textDecoration: "none",
                        }}
                      >
                        File
                      </Link>
                    ) : null}
                  </div>
                </div>

                {/* CT600 row - or enable prompt */}
                {!company.registeredForCorpTax && (
                  <EnableCorpTax companyId={company.id} />
                )}
                {company.registeredForCorpTax && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    backgroundColor: "#F8FAFC",
                    borderRadius: "8px",
                  }}>
                    <div>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: "0 0 2px 0" }}>
                        CT600
                      </p>
                      <p style={{
                        fontSize: "12px",
                        color: ct600DaysLeft <= 0 ? "#DC2626" : ct600DaysLeft <= 30 ? "#D97706" : "#64748B",
                        margin: 0,
                      }}>
                        Due: {formatDate(ct600Deadline)}
                        {ct600DaysLeft <= 30 && ct600DaysLeft > 0 && ` (${ct600DaysLeft}d left)`}
                        {ct600DaysLeft <= 0 && " (Overdue)"}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {ct600Filing ? (
                        <>
                          <FilingStatusBadge status={ct600Filing.status} filingType="ct600" />
                          {(ct600Filing.status === "failed" || ct600Filing.status === "rejected") && canFile && (
                            <Link
                              href={`/file/${company.id}/ct600`}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: "4px",
                                backgroundColor: "#F97316", color: "#ffffff",
                                padding: "4px 10px", borderRadius: "6px",
                                fontWeight: 600, fontSize: "12px", textDecoration: "none",
                              }}
                            >
                              Retry
                            </Link>
                          )}
                        </>
                      ) : canFile && !atFilingLimit ? (
                        <Link
                          href={`/file/${company.id}/ct600`}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "6px",
                            backgroundColor: "#F97316", color: "#ffffff",
                            padding: "6px 14px", borderRadius: "6px",
                            fontWeight: 600, fontSize: "13px", textDecoration: "none",
                          }}
                        >
                          File
                        </Link>
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
              href={`/dashboard?page=${currentPage - 1}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
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
              href={`/dashboard?page=${currentPage + 1}${search ? `&q=${encodeURIComponent(search)}` : ""}`}
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
