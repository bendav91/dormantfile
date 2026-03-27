import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Calendar, Building2, FileText } from "lucide-react";
import Link from "next/link";
import SubscriptionBanner from "@/components/subscription-banner";
import FilingStatusBadge from "@/components/filing-status-badge";
import CheckStatusButton from "@/components/check-status-button";
import { calculateFilingDeadline } from "@/lib/utils";
import { FilingStatus } from "@prisma/client";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const BLOCKING_STATUSES: FilingStatus[] = ["submitted", "polling_timeout", "pending"];

export default async function DashboardPage() {
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

  const company = await prisma.company.findUnique({
    where: { userId: user.id },
    include: {
      filings: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!company) {
    redirect("/onboarding");
  }

  const filingDeadline = calculateFilingDeadline(company.accountingPeriodEnd);

  const blockingFiling = company.filings.find((f) =>
    BLOCKING_STATUSES.includes(f.status)
  );

  const canFile = user.subscriptionStatus === "active";
  const isPollingTimeout = blockingFiling?.status === "polling_timeout";
  const isFilingInProgress =
    blockingFiling &&
    (blockingFiling.status === "submitted" || blockingFiling.status === "pending");

  const daysUntilDeadline = Math.ceil(
    (filingDeadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const deadlineIsUrgent = daysUntilDeadline <= 30 && daysUntilDeadline > 0;
  const deadlineIsPast = daysUntilDeadline <= 0;

  return (
    <div>
      <SubscriptionBanner status={user.subscriptionStatus} />

      {/* Page heading */}
      <div style={{ marginBottom: "32px" }}>
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
        <p style={{ fontSize: "15px", color: "#64748B", margin: 0 }}>
          Manage your CT600 Corporation Tax filings
        </p>
      </div>

      {/* Company overview card */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          marginBottom: "24px",
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
              Corporation Tax account
            </p>
          </div>
        </div>

        {/* Company details grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "20px",
            marginBottom: "24px",
          }}
        >
          <div>
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
              Unique Tax Reference
            </p>
            <p style={{ fontSize: "15px", color: "#1E293B", margin: 0, fontWeight: 500 }}>
              {company.uniqueTaxReference}
            </p>
          </div>

          <div>
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
              Companies House Number
            </p>
            <p style={{ fontSize: "15px", color: "#1E293B", margin: 0, fontWeight: 500 }}>
              {company.companyRegistrationNumber}
            </p>
          </div>

          <div>
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

          <div>
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
              Filing Deadline
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar
                size={15}
                color={deadlineIsPast ? "#DC2626" : deadlineIsUrgent ? "#D97706" : "#64748B"}
                strokeWidth={2}
              />
              <p
                style={{
                  fontSize: "15px",
                  color: deadlineIsPast ? "#DC2626" : deadlineIsUrgent ? "#D97706" : "#1E293B",
                  margin: 0,
                  fontWeight: 600,
                }}
              >
                {formatDate(filingDeadline)}
              </p>
              {deadlineIsUrgent && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: "#FEFCE8",
                    color: "#A16207",
                  }}
                >
                  {daysUntilDeadline}d left
                </span>
              )}
              {deadlineIsPast && (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: "#FEF2F2",
                    color: "#B91C1C",
                  }}
                >
                  Overdue
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action section */}
        <div
          style={{
            paddingTop: "20px",
            borderTop: "1px solid #F1F5F9",
          }}
        >
          {canFile && !blockingFiling ? (
            <Link
              href="/file"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#F97316",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "15px",
                textDecoration: "none",
                transition: "all 200ms",
              }}
            >
              <FileText size={17} strokeWidth={2} />
              File nil CT600 now
            </Link>
          ) : isPollingTimeout && blockingFiling ? (
            <div>
              <p
                style={{
                  fontSize: "14px",
                  color: "#A16207",
                  margin: "0 0 12px 0",
                  fontWeight: 500,
                }}
              >
                Your filing was submitted but HMRC has not yet confirmed the result. Check the current status below.
              </p>
              <CheckStatusButton filingId={blockingFiling.id} />
            </div>
          ) : isFilingInProgress ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 16px",
                backgroundColor: "#EFF6FF",
                border: "1px solid #BFDBFE",
                borderRadius: "8px",
                fontSize: "14px",
                color: "#1D4ED8",
                fontWeight: 500,
              }}
            >
              <FileText size={16} strokeWidth={2} />
              Filing in progress &mdash; we will notify you when HMRC responds.
            </div>
          ) : !canFile ? (
            <p style={{ fontSize: "14px", color: "#64748B", margin: 0 }}>
              <span style={{ fontWeight: 600, color: "#475569" }}>Subscribe to file.</span>{" "}
              An active subscription is required to submit your CT600 return to HMRC.
            </p>
          ) : null}
        </div>
      </div>

      {/* Filing history */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "28px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        }}
      >
        <h2
          style={{
            fontSize: "17px",
            fontWeight: 700,
            color: "#1E293B",
            margin: "0 0 20px 0",
            letterSpacing: "-0.01em",
          }}
        >
          Filing history
        </h2>

        {company.filings.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 0",
              color: "#94A3B8",
            }}
          >
            <FileText
              size={36}
              strokeWidth={1.5}
              color="#CBD5E1"
              style={{ display: "block", margin: "0 auto 12px" }}
            />
            <p style={{ fontSize: "15px", margin: 0, fontWeight: 500 }}>No filings yet</p>
            <p style={{ fontSize: "13px", margin: "4px 0 0", color: "#CBD5E1" }}>
              Your submitted returns will appear here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr>
                  {["Period", "Status", "Filed"].map((heading) => (
                    <th
                      key={heading}
                      style={{
                        textAlign: "left",
                        padding: "0 0 12px",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "#94A3B8",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        borderBottom: "1px solid #F1F5F9",
                        paddingRight: "24px",
                      }}
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {company.filings.map((filing, index) => (
                  <tr
                    key={filing.id}
                    style={{
                      borderBottom:
                        index < company.filings.length - 1
                          ? "1px solid #F8FAFC"
                          : "none",
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 24px 14px 0",
                        color: "#1E293B",
                        fontWeight: 500,
                      }}
                    >
                      {formatDate(filing.periodStart)} &ndash; {formatDate(filing.periodEnd)}
                    </td>
                    <td style={{ padding: "14px 24px 14px 0" }}>
                      <FilingStatusBadge status={filing.status} />
                    </td>
                    <td
                      style={{
                        padding: "14px 0",
                        color: filing.submittedAt ? "#475569" : "#94A3B8",
                      }}
                    >
                      {filing.submittedAt ? formatDate(filing.submittedAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
