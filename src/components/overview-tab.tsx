import { cn } from "@/lib/cn";

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
  if (!date) return "\u2014";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatStatus(status: string): string {
  return status.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

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
      : "\u2014";

  // Recent accepted filings (most recent first, limit 5)
  const recentFilings = filings
    .filter((f) => f.status === "accepted")
    .sort((a, b) => b.periodEnd.getTime() - a.periodEnd.getTime())
    .slice(0, 5);

  return (
    <div>
      {/* Company Details */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted m-0 mb-2.5">Company Details</p>
      <div className="bg-card rounded-[10px] p-4 border border-border mb-5">
        <div className="flex justify-between py-2 border-b border-border text-[13px]">
          <span className="text-secondary font-medium">Company name</span>
          <span className="text-foreground font-semibold text-right">
            {companyName}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-border text-[13px]">
          <span className="text-secondary font-medium">Company number</span>
          <span className="text-foreground font-semibold text-right">
            {companyNumber}
          </span>
        </div>
        {companyStatus && (
          <div className="flex justify-between py-2 border-b border-border text-[13px]">
            <span className="text-secondary font-medium">Status</span>
            <span className="text-foreground font-semibold text-right">
              {formatStatus(companyStatus)}
            </span>
          </div>
        )}
        <div className="flex justify-between py-2 border-b border-border text-[13px]">
          <span className="text-secondary font-medium">Incorporated</span>
          <span className="text-foreground font-semibold text-right">
            {formatDate(dateOfCreation)}
          </span>
        </div>
        {companyType && (
          <div className="flex justify-between py-2 border-b border-border text-[13px]">
            <span className="text-secondary font-medium">Company type</span>
            <span className="text-foreground font-semibold text-right">
              {formatStatus(companyType)}
            </span>
          </div>
        )}
        {registeredAddress && (
          <div className="flex justify-between py-2 border-b border-border text-[13px]">
            <span className="text-secondary font-medium">Registered address</span>
            <span className="text-foreground font-semibold text-right max-w-[60%]">
              {registeredAddress}
            </span>
          </div>
        )}
        {sicCodes && (
          <div className="flex justify-between py-2 border-b-0 text-[13px]">
            <span className="text-secondary font-medium">SIC code{sicCodes.includes(",") ? "s" : ""}</span>
            <span className="text-foreground font-semibold text-right">
              {sicCodes.replace(/,/g, ", ")}
            </span>
          </div>
        )}
      </div>

      {/* Accounts Status */}
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted m-0 mb-2.5">Accounts Status</p>
      <div className="bg-card rounded-[10px] p-4 border border-border mb-5">
        <div className="flex justify-between py-2 border-b border-border text-[13px]">
          <span className="text-secondary font-medium">Last accounts</span>
          <span className="text-foreground font-semibold text-right">
            {lastAccountsMadeUpTo ? formatDate(lastAccountsMadeUpTo) : "None filed"}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b border-border text-[13px]">
          <span className="text-secondary font-medium">Next accounts due</span>
          <span className="text-foreground font-semibold text-right flex items-center gap-2">
            {accountsOverdue && (
              <span className="text-[11px] font-semibold text-danger bg-danger-bg rounded py-0.5 px-1.5">
                Overdue
              </span>
            )}
            {formatDate(accountsDueOn)}
          </span>
        </div>
        <div className="flex justify-between py-2 border-b-0 text-[13px]">
          <span className="text-secondary font-medium">Accounting reference date</span>
          <span className="text-foreground font-semibold text-right">
            {ardFormatted}
          </span>
        </div>
      </div>

      {/* Recent Filings */}
      {recentFilings.length > 0 && (
        <>
          <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted m-0 mb-2.5">Recent Filings</p>
          <div className="bg-card rounded-[10px] p-4 border border-border mb-5">
            {recentFilings.map((filing, index) => {
              const isLast = index === recentFilings.length - 1;
              return (
                <div
                  key={`${filing.filingType}-${filing.periodEnd.toISOString()}`}
                  className={cn(
                    "flex justify-between py-2 text-[13px] gap-3",
                    !isLast && "border-b border-border"
                  )}
                >
                  <span className="text-secondary font-medium flex-1">
                    {filing.filingType === "accounts" ? "Accounts" : "CT600"}
                  </span>
                  <span className="text-foreground font-semibold text-right whitespace-nowrap text-xs">
                    Period: {formatDate(filing.periodEnd)}
                    {filing.confirmedAt && ` \u00b7 ${formatDate(filing.confirmedAt)}`}
                  </span>
                </div>
              );
            })}
          </div>
          <a
            href={`https://find-and-update.company-information.service.gov.uk/company/${companyNumber}/filing-history`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-primary no-underline font-medium inline-block -mt-3 mb-5"
          >
            View full history on Companies House &rarr;
          </a>
        </>
      )}
    </div>
  );
}
