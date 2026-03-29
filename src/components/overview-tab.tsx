import React from "react";

interface OverviewTabProps {
  companyName: string;
  companyNumber: string;
  companyStatus: string | null;
  companyType: string | null;
  dateOfCreation: Date | null;
  registeredAddress: string | null;
  sicCodes: string | null;
  ardMonth: number | null;
  ardDay: number | null;
  accountsDueOn: Date | null;
  lastAccountsMadeUpTo: Date | null;
  accountsOverdue: boolean;
  filings: Array<{
    filingType: string;
    periodEnd: Date;
    status: string;
    confirmedAt: Date | null;
  }>;
}

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatStatus(status: string): string {
  return status.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: "11px",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "var(--color-text-muted)",
  margin: "0 0 10px 0",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--color-bg-card)",
  borderRadius: "10px",
  padding: "16px",
  border: "1px solid var(--color-border)",
  marginBottom: "20px",
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid var(--color-border)",
  fontSize: "13px",
};

const labelStyle: React.CSSProperties = {
  color: "var(--color-text-secondary)",
  fontWeight: 500,
};

const valueStyle: React.CSSProperties = {
  color: "var(--color-text-primary)",
  fontWeight: 600,
  textAlign: "right" as const,
};

export default function OverviewTab({
  companyName,
  companyNumber,
  companyStatus,
  companyType,
  dateOfCreation,
  registeredAddress,
  sicCodes,
  ardMonth,
  ardDay,
  accountsDueOn,
  lastAccountsMadeUpTo,
  accountsOverdue,
  filings,
}: OverviewTabProps) {
  // Format ARD
  const ardFormatted =
    ardMonth && ardDay
      ? (() => {
          const day = String(ardDay).padStart(2, "0");
          const monthName = new Date(2000, ardMonth - 1, 1).toLocaleDateString("en-GB", {
            month: "long",
          });
          return `${day} ${monthName}`;
        })()
      : "—";

  // Recent accepted filings (most recent first, limit 5)
  const recentFilings = filings
    .filter((f) => f.status === "accepted")
    .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime())
    .slice(0, 5);

  return (
    <div>
      {/* Company Details */}
      <p style={sectionHeaderStyle}>Company Details</p>
      <div style={cardStyle}>
        <div style={{ ...rowStyle }}>
          <span style={labelStyle}>Company name</span>
          <span style={valueStyle}>{companyName}</span>
        </div>
        <div style={{ ...rowStyle }}>
          <span style={labelStyle}>Company number</span>
          <span style={valueStyle}>{companyNumber}</span>
        </div>
        {companyStatus && (
          <div style={{ ...rowStyle }}>
            <span style={labelStyle}>Status</span>
            <span style={valueStyle}>{formatStatus(companyStatus)}</span>
          </div>
        )}
        <div style={{ ...rowStyle }}>
          <span style={labelStyle}>Incorporated</span>
          <span style={valueStyle}>{formatDate(dateOfCreation)}</span>
        </div>
        {companyType && (
          <div style={{ ...rowStyle }}>
            <span style={labelStyle}>Company type</span>
            <span style={valueStyle}>{formatStatus(companyType)}</span>
          </div>
        )}
        {registeredAddress && (
          <div style={{ ...rowStyle }}>
            <span style={labelStyle}>Registered address</span>
            <span style={{ ...valueStyle, maxWidth: "60%" }}>{registeredAddress}</span>
          </div>
        )}
        {sicCodes && (
          <div style={{ ...rowStyle, borderBottom: "none" }}>
            <span style={labelStyle}>
              SIC code{sicCodes.includes(",") ? "s" : ""}
            </span>
            <span style={valueStyle}>{sicCodes.replace(/,/g, ", ")}</span>
          </div>
        )}
      </div>

      {/* Accounts Status */}
      <p style={sectionHeaderStyle}>Accounts Status</p>
      <div style={cardStyle}>
        <div style={{ ...rowStyle }}>
          <span style={labelStyle}>Last accounts</span>
          <span style={valueStyle}>
            {lastAccountsMadeUpTo ? formatDate(lastAccountsMadeUpTo) : "None filed"}
          </span>
        </div>
        <div style={{ ...rowStyle }}>
          <span style={labelStyle}>Next accounts due</span>
          <span style={{ ...valueStyle, display: "flex", alignItems: "center", gap: "8px" }}>
            {accountsOverdue && (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "var(--color-error)",
                  backgroundColor: "var(--color-error-bg)",
                  borderRadius: "4px",
                  padding: "2px 6px",
                }}
              >
                Overdue
              </span>
            )}
            {formatDate(accountsDueOn)}
          </span>
        </div>
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={labelStyle}>Accounting reference date</span>
          <span style={valueStyle}>{ardFormatted}</span>
        </div>
      </div>

      {/* Recent Filings */}
      {recentFilings.length > 0 && (
        <>
          <p style={sectionHeaderStyle}>Recent Filings</p>
          <div style={cardStyle}>
            {recentFilings.map((filing, index) => {
              const isLast = index === recentFilings.length - 1;
              return (
                <div
                  key={`${filing.filingType}-${filing.periodEnd.toISOString()}`}
                  style={{
                    ...rowStyle,
                    borderBottom: isLast ? "none" : "1px solid var(--color-border)",
                    gap: "12px",
                  }}
                >
                  <span style={{ ...labelStyle, flex: 1 }}>
                    {filing.filingType === "accounts" ? "Accounts" : "CT600"}
                  </span>
                  <span style={{ ...valueStyle, whiteSpace: "nowrap", fontSize: "12px" }}>
                    Period: {formatDate(filing.periodEnd)}
                    {filing.confirmedAt && ` · ${formatDate(filing.confirmedAt)}`}
                  </span>
                </div>
              );
            })}
          </div>
          <a
            href={`https://find-and-update.company-information.service.gov.uk/company/${companyNumber}/filing-history`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "13px",
              color: "var(--color-primary)",
              textDecoration: "none",
              fontWeight: 500,
              display: "inline-block",
              marginTop: "-12px",
              marginBottom: "20px",
            }}
          >
            View full history on Companies House →
          </a>
        </>
      )}
    </div>
  );
}
