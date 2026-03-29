import React from "react";

interface OverviewTabProps {
  companyNumber: string;
}

async function fetchCompanyProfile(companyNumber: string) {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) return null;

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  try {
    const res = await fetch(
      `${endpoint}/company/${encodeURIComponent(companyNumber)}`,
      { headers: { Authorization: `Basic ${basicAuth}` }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function fetchRecentFilings(companyNumber: string) {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) return null;

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  try {
    const res = await fetch(
      `${endpoint}/company/${encodeURIComponent(companyNumber)}/filing-history?items_per_page=5`,
      { headers: { Authorization: `Basic ${basicAuth}` }, next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
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

export default async function OverviewTab({ companyNumber }: OverviewTabProps) {
  const [profileResult, filingsResult] = await Promise.allSettled([
    fetchCompanyProfile(companyNumber),
    fetchRecentFilings(companyNumber),
  ]);

  const profile = profileResult.status === "fulfilled" ? profileResult.value : null;
  const filings = filingsResult.status === "fulfilled" ? filingsResult.value : null;

  if (!profile && !filings) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <p style={{ fontSize: "14px", color: "var(--color-text-secondary)" }}>
          Could not load company information from Companies House. Try again later.
        </p>
      </div>
    );
  }

  const partialWarning = (!profile || !filings) && (
    <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", marginBottom: "16px" }}>
      Some company information could not be loaded.
    </p>
  );

  // Build address string
  const address = profile
    ? [
        profile.registered_office_address?.address_line_1,
        profile.registered_office_address?.address_line_2,
        profile.registered_office_address?.locality,
        profile.registered_office_address?.region,
        profile.registered_office_address?.postal_code,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  // Format ARD
  const ard = profile?.accounts?.accounting_reference_date;
  const ardFormatted = ard
    ? (() => {
        const day = String(ard.day).padStart(2, "0");
        const monthIndex = parseInt(ard.month, 10) - 1;
        const monthName = new Date(2000, monthIndex, 1).toLocaleDateString("en-GB", { month: "long" });
        return `${day} ${monthName}`;
      })()
    : "—";

  return (
    <div>
      {partialWarning}

      {profile && (
        <>
          {/* Company Details */}
          <p style={sectionHeaderStyle}>Company Details</p>
          <div style={cardStyle}>
            <div style={{ ...rowStyle }}>
              <span style={labelStyle}>Company name</span>
              <span style={valueStyle}>{profile.company_name}</span>
            </div>
            <div style={{ ...rowStyle }}>
              <span style={labelStyle}>Company number</span>
              <span style={valueStyle}>{profile.company_number}</span>
            </div>
            <div style={{ ...rowStyle }}>
              <span style={labelStyle}>Status</span>
              <span style={valueStyle}>{formatStatus(profile.company_status ?? "")}</span>
            </div>
            <div style={{ ...rowStyle }}>
              <span style={labelStyle}>Incorporated</span>
              <span style={valueStyle}>{formatDate(profile.date_of_creation)}</span>
            </div>
            <div style={{ ...rowStyle }}>
              <span style={labelStyle}>Company type</span>
              <span style={valueStyle}>{formatStatus(profile.type ?? "")}</span>
            </div>
            {address && (
              <div style={{ ...rowStyle }}>
                <span style={labelStyle}>Registered address</span>
                <span style={{ ...valueStyle, maxWidth: "60%" }}>{address}</span>
              </div>
            )}
            {profile.sic_codes && profile.sic_codes.length > 0 && (
              <div style={{ ...rowStyle, borderBottom: "none" }}>
                <span style={labelStyle}>SIC code{profile.sic_codes.length > 1 ? "s" : ""}</span>
                <span style={valueStyle}>{profile.sic_codes.join(", ")}</span>
              </div>
            )}
          </div>

          {/* Accounts Status */}
          <p style={sectionHeaderStyle}>Accounts Status</p>
          <div style={cardStyle}>
            <div style={{ ...rowStyle }}>
              <span style={labelStyle}>Last accounts</span>
              <span style={valueStyle}>
                {profile.accounts?.last_accounts?.made_up_to
                  ? formatDate(profile.accounts.last_accounts.made_up_to)
                  : "None filed"}
              </span>
            </div>
            <div style={{ ...rowStyle }}>
              <span style={labelStyle}>Next accounts due</span>
              <span style={{ ...valueStyle, display: "flex", alignItems: "center", gap: "8px" }}>
                {profile.accounts?.next_accounts?.overdue === true && (
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
                {formatDate(profile.accounts?.next_accounts?.due_on)}
              </span>
            </div>
            <div style={{ ...rowStyle, borderBottom: "none" }}>
              <span style={labelStyle}>Accounting reference date</span>
              <span style={valueStyle}>{ardFormatted}</span>
            </div>
          </div>
        </>
      )}

      {filings && filings.items && filings.items.length > 0 && (
        <>
          {/* Recent Filings */}
          <p style={sectionHeaderStyle}>Recent Filings</p>
          <div style={cardStyle}>
            {filings.items.map(
              (
                item: {
                  description: string;
                  date: string;
                  description_values?: { made_up_date?: string };
                  transaction_id: string;
                },
                index: number,
              ) => {
                const isLast = index === filings.items.length - 1;
                const rawDesc = item.description ?? "";
                const desc = formatStatus(
                  rawDesc.replace(/^accounts-with-accounts-type-/, ""),
                );
                const madeUpDate = item.description_values?.made_up_date;
                return (
                  <div
                    key={item.transaction_id ?? index}
                    style={{ ...rowStyle, borderBottom: isLast ? "none" : "1px solid var(--color-border)", gap: "12px" }}
                  >
                    <span style={{ ...labelStyle, flex: 1 }}>{desc}</span>
                    <span style={{ ...valueStyle, whiteSpace: "nowrap", fontSize: "12px" }}>
                      {madeUpDate ? `Period: ${formatDate(madeUpDate)} · ` : ""}
                      {formatDate(item.date)}
                    </span>
                  </div>
                );
              },
            )}
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
