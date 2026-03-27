import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, FileText, Building2, Calendar } from "lucide-react";
import FilingStatusBadge from "@/components/filing-status-badge";
import { calculateAccountsDeadline, calculateCT600Deadline } from "@/lib/utils";
import { FilingStatus } from "@prisma/client";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

const BLOCKED_STATUSES: FilingStatus[] = ["submitted", "polling_timeout", "accepted", "pending"];

interface PageProps {
  params: Promise<{ companyId: string }>;
}

export default async function FilingSelector({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { companyId } = await params;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling")) redirect("/dashboard");

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
    include: {
      filings: {
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!company) redirect("/dashboard");

  const accountsFiling = company.filings.find(
    (f) => f.filingType === "accounts" && f.periodEnd.getTime() === company.accountingPeriodEnd.getTime()
  );
  const ct600Filing = company.filings.find(
    (f) => f.filingType === "ct600" && f.periodEnd.getTime() === company.accountingPeriodEnd.getTime()
  );

  const accountsDeadline = calculateAccountsDeadline(company.accountingPeriodEnd);
  const ct600Deadline = calculateCT600Deadline(company.accountingPeriodEnd);

  const accountsBlocked = accountsFiling && BLOCKED_STATUSES.includes(accountsFiling.status);
  const ct600Blocked = ct600Filing && BLOCKED_STATUSES.includes(ct600Filing.status);

  return (
    <div style={{ maxWidth: "640px", margin: "0 auto" }}>
      {/* Back link */}
      <Link
        href="/dashboard"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          color: "#64748B",
          textDecoration: "none",
          fontWeight: 500,
          marginBottom: "24px",
        }}
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Back to dashboard
      </Link>

      {/* Heading */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: "42px",
              height: "42px",
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
            <h1
              style={{
                fontSize: "26px",
                fontWeight: 700,
                color: "#1E293B",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              {company.companyName}
            </h1>
            <p style={{ fontSize: "14px", color: "#64748B", margin: 0, marginTop: "2px" }}>
              Period: {formatDate(company.accountingPeriodStart)} &ndash; {formatDate(company.accountingPeriodEnd)}
            </p>
          </div>
        </div>
      </div>

      {/* Filing cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Accounts card */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "#F0FDF4",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <FileText size={18} color="#15803D" strokeWidth={2} />
              </div>
              <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#1E293B", margin: 0 }}>
                Accounts
              </h2>
            </div>
            {accountsFiling && (
              <FilingStatusBadge status={accountsFiling.status} filingType="accounts" />
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
            <Calendar size={14} color="#64748B" strokeWidth={2} />
            <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>
              Deadline: {formatDate(accountsDeadline)}
            </p>
          </div>

          {!accountsBlocked && (
            <Link
              href={`/file/${companyId}/accounts`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#F97316",
                color: "#ffffff",
                padding: "10px 20px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "14px",
                textDecoration: "none",
                transition: "all 200ms",
              }}
            >
              <FileText size={16} strokeWidth={2} />
              File accounts
            </Link>
          )}
        </div>

        {/* CT600 card — only if registered for Corp Tax */}
        {company.registeredForCorpTax && (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "8px",
                    backgroundColor: "#EFF6FF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <FileText size={18} color="#2563EB" strokeWidth={2} />
                </div>
                <h2 style={{ fontSize: "17px", fontWeight: 700, color: "#1E293B", margin: 0 }}>
                  CT600
                </h2>
              </div>
              {ct600Filing && (
                <FilingStatusBadge status={ct600Filing.status} filingType="ct600" />
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}>
              <Calendar size={14} color="#64748B" strokeWidth={2} />
              <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>
                Deadline: {formatDate(ct600Deadline)}
              </p>
            </div>

            {!ct600Blocked && (
              <Link
                href={`/file/${companyId}/ct600`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  backgroundColor: "#F97316",
                  color: "#ffffff",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "14px",
                  textDecoration: "none",
                  transition: "all 200ms",
                }}
              >
                <FileText size={16} strokeWidth={2} />
                File CT600
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
