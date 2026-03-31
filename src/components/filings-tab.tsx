"use client";

import { useState } from "react";
import FilingStatusBadge from "@/components/filing-status-badge";
import MarkFiledButton from "@/components/mark-filed-button";
import { type PeriodView } from "@/lib/filing-queries";
import { FilingStatus } from "@prisma/client";
import { AlertTriangle, Calendar, CheckCircle2, EyeOff, FileText } from "lucide-react";
import Link from "next/link";
import SuppressButton from "@/components/suppress-button";
import CopyFilingSummary from "@/components/copy-filing-summary";
import { isFilingLive } from "@/lib/launch-mode";
import { cn } from "@/lib/cn";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface Filing {
  id: string;
  filingType: string;
  periodStart: Date;
  periodEnd: Date;
  status: FilingStatus;
  createdAt: Date;
  confirmedAt: Date | null;
  submittedAt: Date | null;
}

interface FilingsTabProps {
  companyId: string;
  companyName: string;
  companyNumber: string;
  registeredForCorpTax: boolean;
  periods: PeriodView[];
  filings: Filing[];
  now: number;
}

export default function FilingsTab({
  companyId,
  companyName,
  companyNumber,
  registeredForCorpTax,
  periods,
  filings,
  now,
}: FilingsTabProps) {
  const incompletedPeriods = periods.filter((p) => !p.isComplete && !p.isSuppressed);
  const suppressedPeriods = periods.filter((p) => !p.isComplete && p.isSuppressed);
  const hasDisclosurePeriods = incompletedPeriods.some((p) => p.isDisclosureTerritory);

  // Build completed periods from Filing records (not from getOutstandingPeriods,
  // which only generates periods from the oldest unfiled forward)
  const completedPeriodMap = new Map<number, { periodStart: Date; periodEnd: Date }>();
  for (const f of filings) {
    if (f.filingType === "accounts" && f.status === "accepted") {
      completedPeriodMap.set(f.periodEnd.getTime(), {
        periodStart: f.periodStart,
        periodEnd: f.periodEnd,
      });
    }
  }
  const completedPeriods = [...completedPeriodMap.values()].sort(
    (a, b) => a.periodEnd.getTime() - b.periodEnd.getTime(),
  );

  function getFilingForPeriod(period: PeriodView, filingType: "accounts" | "ct600") {
    return filings.find(
      (f) => f.filingType === filingType && f.periodEnd.getTime() === period.periodEnd.getTime(),
    );
  }

  const [activeTab, setActiveTab] = useState<"outstanding" | "suppressed" | "completed">(
    "outstanding",
  );

  return (
    <>
      {/* Disclosure territory warning */}
      {hasDisclosurePeriods && (
        <div className="flex items-start gap-2.5 px-5 py-3.5 bg-danger-bg border border-danger-border rounded-[10px] mb-5">
          <span className="text-danger shrink-0 mt-px flex">
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="text-sm text-danger-text m-0 font-medium">
            This company has filings more than 4 years overdue. Very old returns may be rejected by
            Companies House. We recommend contacting them directly or consulting an accountant
            before filing.
          </p>
        </div>
      )}

      {/* Sub-tab bar */}
      <div className="flex bg-inset rounded-[10px] p-1 mb-5">
        <button
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold border-0 cursor-pointer transition-all duration-200",
            activeTab === "outstanding"
              ? "bg-card text-foreground shadow-active"
              : "bg-transparent text-secondary"
          )}
          onClick={() => setActiveTab("outstanding")}
        >
          Outstanding ({incompletedPeriods.length})
        </button>
        {suppressedPeriods.length > 0 && (
          <button
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold border-0 cursor-pointer transition-all duration-200",
              activeTab === "suppressed"
                ? "bg-card text-foreground shadow-active"
                : "bg-transparent text-secondary"
            )}
            onClick={() => setActiveTab("suppressed")}
          >
            Suppressed ({suppressedPeriods.length})
          </button>
        )}
        <button
          className={cn(
            "flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold border-0 cursor-pointer transition-all duration-200",
            activeTab === "completed"
              ? "bg-card text-foreground shadow-active"
              : "bg-transparent text-secondary"
          )}
          onClick={() => setActiveTab("completed")}
        >
          Completed ({completedPeriods.length})
        </button>
      </div>

      {/* Outstanding periods */}
      {activeTab === "outstanding" && (
        <>
          <div className="flex flex-col gap-3">
            {incompletedPeriods.map((period, index) => {
              const accountsFiling = getFilingForPeriod(period, "accounts");
              const ct600Filing = getFilingForPeriod(period, "ct600");
              const periodEndISO = period.periodEnd.toISOString().split("T")[0];
              const isFirst = index === 0;

              return (
                <div
                  key={period.periodEnd.toISOString()}
                  className={cn(
                    "bg-card rounded-xl p-5 shadow-card",
                    isFirst
                      ? "border-2 border-primary-border"
                      : "border border-border"
                  )}
                >
                  {/* Period header */}
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      period.hasEarlierGaps || (isFirst && incompletedPeriods.length > 1)
                        ? "mb-2"
                        : "mb-3.5"
                    )}
                  >
                    <span className="text-secondary flex">
                      <Calendar size={16} color="currentColor" strokeWidth={2} />
                    </span>
                    <h2 className="text-base font-bold text-foreground m-0">
                      {formatDate(period.periodStart)} &ndash; {formatDate(period.periodEnd)}
                    </h2>
                    {period.isDisclosureTerritory && (
                      <span className="py-0.5 px-2 rounded-full text-[11px] font-semibold bg-danger-bg text-danger border border-danger-border">
                        &gt;4 years
                      </span>
                    )}
                  </div>

                  {/* Contextual hint */}
                  {isFirst && incompletedPeriods.length > 1 && !period.hasEarlierGaps && (
                    <p className="text-xs text-primary font-medium m-0 mb-3 pl-6">
                      Earliest outstanding period &mdash; we recommend filing this first
                    </p>
                  )}

                  {/* Gap warning */}
                  {period.hasEarlierGaps && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-warning-bg border border-warning-border rounded-md mb-3.5">
                      <span className="text-warning shrink-0 flex">
                        <AlertTriangle size={13} color="currentColor" strokeWidth={2} />
                      </span>
                      <p className="text-xs text-warning-text m-0 font-medium">
                        Earlier periods are still outstanding. Filing out of order may cause issues
                        with Companies House.
                      </p>
                    </div>
                  )}

                  {/* Blocked territory warning */}
                  {period.isBlockedTerritory && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-danger-bg border border-danger-border rounded-md mb-3.5">
                      <span className="text-danger shrink-0 flex">
                        <AlertTriangle size={13} color="currentColor" strokeWidth={2} />
                      </span>
                      <p className="text-xs text-danger-text m-0 font-medium">
                        This period is more than 6 years overdue. We recommend consulting an
                        accountant or contacting Companies House directly.
                      </p>
                    </div>
                  )}

                  {/* Filing rows */}
                  <div className="flex flex-col gap-1.5">
                    {/* Accounts */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground m-0">
                          Accounts
                        </p>
                        <p
                          className={cn(
                            "text-xs m-0",
                            period.accountsFiled
                              ? "text-secondary"
                              : period.accountsDeadline.getTime() < now
                                ? "text-danger"
                                : "text-secondary"
                          )}
                        >
                          Deadline: {formatShortDate(period.accountsDeadline)}
                          {!period.accountsFiled &&
                            period.accountsDeadline.getTime() < now &&
                            " (Overdue)"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {period.isBlockedTerritory ? (
                          <span className="px-3.5 py-1.5 rounded-md text-[13px] font-semibold text-secondary bg-inset border border-border">
                            Seek professional advice
                          </span>
                        ) : accountsFiling && accountsFiling.status !== "outstanding" ? (
                          <>
                            <FilingStatusBadge
                              status={accountsFiling.status}
                              filingType="accounts"
                            />
                            {isFilingLive() &&
                              (accountsFiling.status === "failed" ||
                                accountsFiling.status === "rejected") && (
                                <Link
                                  href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`}
                                  className="inline-flex items-center gap-1.5 bg-cta text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] no-underline transition-opacity duration-200"
                                >
                                  Retry
                                </Link>
                              )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <MarkFiledButton companyId={companyId} periodEnd={periodEndISO} filingType="accounts" />
                            {isFilingLive() && (
                              <Link
                                href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`}
                                className="inline-flex items-center gap-1.5 bg-cta text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] no-underline transition-opacity duration-200"
                              >
                                File
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CT600 */}
                    {registeredForCorpTax && (
                      <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                        <div>
                          <p className="text-[13px] font-semibold text-foreground m-0">
                            CT600
                          </p>
                          <p className="text-xs text-secondary m-0">
                            Due: {formatShortDate(period.ct600Deadline)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {ct600Filing && ct600Filing.status !== "outstanding" ? (
                            <>
                              <FilingStatusBadge status={ct600Filing.status} filingType="ct600" />
                              {isFilingLive() &&
                                (ct600Filing.status === "failed" ||
                                  ct600Filing.status === "rejected") && (
                                  <Link
                                    href={`/file/${companyId}/ct600?periodEnd=${periodEndISO}`}
                                    className="inline-flex items-center gap-1.5 bg-cta text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] no-underline transition-opacity duration-200"
                                  >
                                    Retry
                                  </Link>
                                )}
                            </>
                          ) : period.isBlockedTerritory ? (
                            <MarkFiledButton companyId={companyId} periodEnd={periodEndISO} filingType="ct600" />
                          ) : (
                            <>
                              <MarkFiledButton companyId={companyId} periodEnd={periodEndISO} filingType="ct600" />
                              {isFilingLive() && (
                                <Link
                                  href={`/file/${companyId}/ct600?periodEnd=${periodEndISO}`}
                                  className="inline-flex items-center gap-1.5 bg-cta text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] no-underline transition-opacity duration-200"
                                >
                                  File
                                </Link>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Suppress button */}
                  {period.isOverdue && (
                    <div className="mt-2.5 flex justify-end">
                      <SuppressButton
                        companyId={companyId}
                        periodEnd={periodEndISO}
                        isSuppressed={false}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Outstanding empty state */}
          {incompletedPeriods.length === 0 && (
            <div className="text-center px-6 py-12 bg-card rounded-xl shadow-active">
              <span className="text-success flex justify-center mb-3">
                <CheckCircle2 size={32} color="currentColor" strokeWidth={2} />
              </span>
              <p className="text-base font-semibold text-foreground m-0 mb-1">
                All caught up
              </p>
              <p className="text-sm text-secondary m-0">
                No outstanding accounting periods for this company.
              </p>
            </div>
          )}
        </>
      )}

      {/* Suppressed tab */}
      {activeTab === "suppressed" && (
        <>
          <div className="flex flex-col gap-3">
            {suppressedPeriods.map((period) => {
              const periodEndISO = period.periodEnd.toISOString().split("T")[0];

              return (
                <div
                  key={period.periodEnd.toISOString()}
                  className="bg-card rounded-xl p-5 shadow-card border border-border opacity-70"
                >
                  {/* Period header */}
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-secondary flex">
                        <EyeOff size={16} color="currentColor" strokeWidth={2} />
                      </span>
                      <h2 className="text-base font-bold text-foreground m-0">
                        {formatDate(period.periodStart)} &ndash; {formatDate(period.periodEnd)}
                      </h2>
                    </div>
                    <SuppressButton
                      companyId={companyId}
                      periodEnd={periodEndISO}
                      isSuppressed={true}
                      onRestore={
                        suppressedPeriods.length === 1
                          ? () => setActiveTab("outstanding")
                          : undefined
                      }
                    />
                  </div>

                  <p className="text-xs text-secondary m-0">
                    Accounts deadline: {formatShortDate(period.accountsDeadline)}
                    {" \u00b7 "}
                    This period is suppressed and excluded from warnings and reminders.
                  </p>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Completed tab */}
      {activeTab === "completed" && (
        <>
          {completedPeriods.length > 0 ? (
            <div className="flex flex-col gap-3">
              {[...completedPeriods].reverse().map((period) => {
                const periodEndTime = period.periodEnd.getTime();
                const accountsFiling = filings.find(
                  (f) => f.filingType === "accounts" && f.periodEnd.getTime() === periodEndTime,
                );
                const ct600Filing = filings.find(
                  (f) => f.filingType === "ct600" && f.periodEnd.getTime() === periodEndTime,
                );

                return (
                  <div
                    key={period.periodEnd.toISOString()}
                    className="bg-card rounded-xl p-5 shadow-card border border-border"
                  >
                    {/* Period header */}
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className="text-success flex">
                        <CheckCircle2 size={16} color="currentColor" strokeWidth={2} />
                      </span>
                      <h2 className="text-base font-bold text-foreground m-0">
                        {formatDate(period.periodStart)} &ndash; {formatDate(period.periodEnd)}
                      </h2>
                    </div>

                    {/* Filing rows */}
                    <div className="flex flex-col gap-1.5">
                      {/* Accounts row */}
                      <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                        <div>
                          <p className="text-[13px] font-semibold text-foreground m-0">
                            Accounts
                          </p>
                          <p className="text-xs text-secondary m-0">
                            {accountsFiling?.confirmedAt
                              ? `Accepted ${formatShortDate(accountsFiling.confirmedAt)}`
                              : "Accepted"}
                            {" \u00b7 "}
                            {accountsFiling?.submittedAt
                              ? "Filed via DormantFile"
                              : "Filed elsewhere"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {accountsFiling?.submittedAt && (
                            <>
                              <CopyFilingSummary
                                companyName={companyName}
                                companyNumber={companyNumber}
                                filingType="accounts"
                                periodStart={period.periodStart}
                                periodEnd={period.periodEnd}
                                confirmedAt={accountsFiling.confirmedAt}
                              />
                              <Link
                                href={`/company/${companyId}/receipt/${accountsFiling.id}`}
                                title="View receipt"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border text-secondary transition-colors duration-200"
                              >
                                <FileText size={14} strokeWidth={2} />
                              </Link>
                            </>
                          )}
                          <FilingStatusBadge
                            status={accountsFiling?.status ?? ("accepted" as FilingStatus)}
                            filingType="accounts"
                          />
                        </div>
                      </div>

                      {/* CT600 row */}
                      {registeredForCorpTax && (
                        <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                          <div>
                            <p className="text-[13px] font-semibold text-foreground m-0">
                              CT600
                            </p>
                            <p className="text-xs text-secondary m-0">
                              {ct600Filing ? (
                                <>
                                  {ct600Filing.confirmedAt
                                    ? `Accepted ${formatShortDate(ct600Filing.confirmedAt)}`
                                    : "Accepted"}
                                  {" \u00b7 "}
                                  {ct600Filing.submittedAt
                                    ? "Filed via DormantFile"
                                    : "Filed elsewhere"}
                                </>
                              ) : (
                                "Not tracked for this period"
                              )}
                            </p>
                          </div>
                          {ct600Filing ? (
                            <div className="flex items-center gap-1.5">
                              {ct600Filing.submittedAt && (
                                <>
                                  <CopyFilingSummary
                                    companyName={companyName}
                                    companyNumber={companyNumber}
                                    filingType="ct600"
                                    periodStart={period.periodStart}
                                    periodEnd={period.periodEnd}
                                    confirmedAt={ct600Filing.confirmedAt}
                                  />
                                  <Link
                                    href={`/company/${companyId}/receipt/${ct600Filing.id}`}
                                    title="View receipt"
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border text-secondary transition-colors duration-200"
                                  >
                                    <FileText size={14} strokeWidth={2} />
                                  </Link>
                                </>
                              )}
                              <FilingStatusBadge status={ct600Filing.status} filingType="ct600" />
                            </div>
                          ) : (
                            <span className="py-1 px-2.5 rounded-full text-[11px] font-semibold bg-inset text-secondary border border-border">
                              N/A
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center px-6 py-12 bg-card rounded-xl shadow-active">
              <p className="text-base font-semibold text-foreground m-0 mb-1">
                No completed filings yet
              </p>
              <p className="text-sm text-secondary m-0">
                Completed filings will appear here once accepted by Companies House or HMRC.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
