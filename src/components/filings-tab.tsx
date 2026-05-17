"use client";

import { useState } from "react";
import FilingStatusBadge from "@/components/filing-status-badge";
import { formatCivilDate, formatCivilDateShort, formatUkDateShort } from "@/lib/format-date";
import CheckStatusButton from "@/components/check-status-button";
import MarkFiledButton from "@/components/mark-filed-button";
import { buildFilingViews } from "@/lib/filing-views";
import { FilingStatus } from "@prisma/client";
import { AlertTriangle, Calendar, CheckCircle2, EyeOff, FileText } from "lucide-react";
import Link from "next/link";
import SuppressButton from "@/components/suppress-button";
import CopyFilingSummary from "@/components/copy-filing-summary";
import UndoMarkFiledButton from "@/components/undo-mark-filed-button";
import { isFilingLive } from "@/lib/launch-mode";
import { cn } from "@/lib/cn";

// Period dates and accounts deadlines are statutory calendar dates → verbatim.
const formatDate = formatCivilDate;
const formatShortDate = formatCivilDateShort;

interface Filing {
  id: string;
  filingType: string;
  periodStart: Date;
  periodEnd: Date;
  startDate: Date | null;
  endDate: Date | null;
  status: FilingStatus;
  deadline: Date | null;
  suppressedAt: Date | null;
  createdAt: Date;
  confirmedAt: Date | null;
  submittedAt: Date | null;
  reviewFlaggedAt: Date | null;
}

interface ChAccountsFilingRow {
  madeUpDate: string;
  type: string;
  hasDocument: boolean; // reserved for per-row PDF links (future task)
}

interface FilingsTabProps {
  companyId: string;
  companyName: string;
  companyNumber: string;
  filings: Filing[];
  now: number;
  chAccountsFilings?: ChAccountsFilingRow[];
}

export default function FilingsTab({
  companyId,
  companyName,
  companyNumber,
  filings,
  now,
  chAccountsFilings,
}: FilingsTabProps) {
  const views = buildFilingViews(filings as never[], "accounts");

  const outstanding = views.filter((v) => !v.isFiled && !v.isSuppressed);
  const suppressed = views.filter((v) => !v.isFiled && v.isSuppressed);
  const filedElsewhere = views.filter((v) => v.filing.status === "filed_elsewhere");
  const completed = views.filter((v) => v.filing.status === "accepted");
  const hasDisclosure = outstanding.some((v) => v.isDisclosureTerritory);

  const [activeTab, setActiveTab] = useState<"outstanding" | "suppressed" | "filed_elsewhere" | "completed">(
    "outstanding",
  );

  return (
    <>
      {/* Disclosure territory warning */}
      {hasDisclosure && (
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
          Outstanding ({outstanding.length})
        </button>
        {suppressed.length > 0 && (
          <button
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold border-0 cursor-pointer transition-all duration-200",
              activeTab === "suppressed"
                ? "bg-card text-foreground shadow-active"
                : "bg-transparent text-secondary"
            )}
            onClick={() => setActiveTab("suppressed")}
          >
            Suppressed ({suppressed.length})
          </button>
        )}
        {filedElsewhere.length > 0 && (
          <button
            className={cn(
              "flex-1 px-4 py-2 rounded-lg text-[13px] font-semibold border-0 cursor-pointer transition-all duration-200",
              activeTab === "filed_elsewhere"
                ? "bg-card text-foreground shadow-active"
                : "bg-transparent text-secondary"
            )}
            onClick={() => setActiveTab("filed_elsewhere")}
          >
            Filed elsewhere ({filedElsewhere.length})
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
          Completed ({completed.length})
        </button>
      </div>

      {/* Outstanding */}
      {activeTab === "outstanding" && (
        <>
          {outstanding.length > 0 ? (
            <div className="flex flex-col gap-3">
              {outstanding.map((view, index) => {
                const f = view.filing;
                const start = f.startDate ?? f.periodStart;
                const end = f.endDate ?? f.periodEnd;
                const endISO = end.toISOString().split("T")[0];
                const deadline = f.deadline ?? f.periodEnd;
                const isFirst = index === 0;

                return (
                  <div
                    key={f.id}
                    className={cn(
                      "bg-card rounded-xl p-5 shadow-card",
                      isFirst ? "border-2 border-primary-border" : "border border-border"
                    )}
                  >
                    {/* Period header */}
                    <div
                      className={cn(
                        "flex items-center gap-2",
                        view.hasEarlierGaps || (isFirst && outstanding.length > 1)
                          ? "mb-2"
                          : "mb-3.5"
                      )}
                    >
                      <span className="text-secondary flex">
                        <Calendar size={16} color="currentColor" strokeWidth={2} />
                      </span>
                      <h2 className="text-base font-bold text-foreground m-0">
                        {formatDate(start)} &ndash; {formatDate(end)}
                      </h2>
                      {view.isDisclosureTerritory && (
                        <span className="py-0.5 px-2 rounded-full text-[11px] font-semibold bg-danger-bg text-danger border border-danger-border">
                          &gt;4 years
                        </span>
                      )}
                    </div>

                    {/* Contextual hint */}
                    {isFirst && outstanding.length > 1 && !view.hasEarlierGaps && (
                      <p className="text-xs text-primary font-medium m-0 mb-3 pl-6">
                        Earliest outstanding period &mdash; we recommend filing this first
                      </p>
                    )}

                    {/* Gap warning */}
                    {view.hasEarlierGaps && (
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
                    {view.isBlockedTerritory && (
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

                    {/* Accounts filing row */}
                    <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground m-0">
                          Annual accounts
                        </p>
                        <p
                          className={cn(
                            "text-xs m-0",
                            deadline.getTime() < now ? "text-danger" : "text-secondary"
                          )}
                        >
                          Deadline: {formatShortDate(deadline)}
                          {deadline.getTime() < now && " (Overdue)"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {view.isBlockedTerritory ? (
                          <span className="px-3.5 py-1.5 rounded-md text-[13px] font-semibold text-secondary bg-inset border border-border">
                            Seek professional advice
                          </span>
                        ) : f.status !== "outstanding" ? (
                          <>
                            {f.status === "submitted" && (
                              <CheckStatusButton filingId={f.id} />
                            )}
                            <FilingStatusBadge
                              status={f.status}
                              filingType="accounts"
                              flaggedForReview={!!f.reviewFlaggedAt}
                            />
                            {(f.status === "failed" || f.status === "rejected") && (
                              <>
                                <MarkFiledButton companyId={companyId} periodEnd={endISO} filingType="accounts" />
                                {isFilingLive() && (
                                  <Link
                                    href={`/file/${companyId}/accounts?filingId=${f.id}`}
                                    className="inline-flex items-center gap-1.5 bg-cta text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] no-underline transition-opacity duration-200"
                                  >
                                    Retry
                                  </Link>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <MarkFiledButton companyId={companyId} periodEnd={endISO} filingType="accounts" />
                            {isFilingLive() && (
                              <Link
                                href={`/file/${companyId}/accounts?filingId=${f.id}`}
                                className="inline-flex items-center gap-1.5 bg-cta text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] no-underline transition-opacity duration-200"
                              >
                                File
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Awaiting-confirmation note (CH 8023 persisted past grace) */}
                    {f.status === "submitted" && f.reviewFlaggedAt && (
                      <div className="flex items-start gap-1.5 px-2.5 py-1.5 bg-warning-bg border border-warning-border rounded-md mt-2.5">
                        <span className="text-warning shrink-0 mt-px flex">
                          <AlertTriangle size={13} color="currentColor" strokeWidth={2} />
                        </span>
                        <p className="text-xs text-warning-text m-0 font-medium">
                          Submitted to Companies House, but we haven&apos;t had a confirmation back
                          yet. This is usually a delay on their side &mdash; we&apos;re still
                          checking automatically. If it doesn&apos;t clear, contact support and
                          we&apos;ll chase it with Companies House.
                        </p>
                      </div>
                    )}

                    {/* Suppress button */}
                    {view.isOverdue && (
                      <div className="mt-2.5 flex justify-end">
                        <SuppressButton companyId={companyId} periodEnd={endISO} isSuppressed={false} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center px-6 py-10 bg-card rounded-xl shadow-active">
              <span className="text-success flex justify-center mb-3">
                <CheckCircle2 size={32} color="currentColor" strokeWidth={2} />
              </span>
              <p className="text-base font-semibold text-foreground m-0 mb-1">All caught up</p>
              <p className="text-sm text-secondary m-0">No outstanding accounts periods.</p>
            </div>
          )}
        </>
      )}

      {/* Suppressed tab */}
      {activeTab === "suppressed" && (
        <div className="flex flex-col gap-3">
          {suppressed.map((view) => {
            const f = view.filing;
            const start = f.startDate ?? f.periodStart;
            const end = f.endDate ?? f.periodEnd;
            const endISO = end.toISOString().split("T")[0];
            const deadline = f.deadline ?? f.periodEnd;

            return (
              <div
                key={f.id}
                className="bg-card rounded-xl p-5 shadow-card border border-border opacity-70"
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-secondary flex">
                      <EyeOff size={16} color="currentColor" strokeWidth={2} />
                    </span>
                    <h2 className="text-base font-bold text-foreground m-0">
                      {formatDate(start)} &ndash; {formatDate(end)}
                    </h2>
                  </div>
                  <SuppressButton
                    companyId={companyId}
                    periodEnd={endISO}
                    isSuppressed={true}
                    onRestore={
                      suppressed.length === 1
                        ? () => setActiveTab("outstanding")
                        : undefined
                    }
                  />
                </div>
                <p className="text-xs text-secondary m-0">
                  Accounts deadline: {formatShortDate(deadline)}
                  {" \u00b7 "}
                  This period is suppressed and excluded from warnings and reminders.
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Filed elsewhere tab */}
      {activeTab === "filed_elsewhere" && (
        <div className="flex flex-col gap-3">
          {[...filedElsewhere].reverse().map((view) => {
            const f = view.filing;
            const start = f.startDate ?? f.periodStart;
            const end = f.endDate ?? f.periodEnd;

            return (
              <div key={f.id} className="bg-card rounded-xl p-5 shadow-card border border-border">
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="text-secondary flex">
                    <Calendar size={16} color="currentColor" strokeWidth={2} />
                  </span>
                  <h2 className="text-base font-bold text-foreground m-0">
                    {formatDate(start)} &ndash; {formatDate(end)}
                  </h2>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground m-0">Annual accounts</p>
                    <p className="text-xs text-secondary m-0">Filed elsewhere</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UndoMarkFiledButton
                      filingId={f.id}
                      onUndo={filedElsewhere.length === 1 ? () => setActiveTab("outstanding") : undefined}
                    />
                    <FilingStatusBadge status={"filed_elsewhere" as FilingStatus} filingType="accounts" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed tab */}
      {activeTab === "completed" && (
        <>
          {completed.length > 0 ? (
            <div className="flex flex-col gap-3">
              {[...completed].reverse().map((view) => {
                const f = view.filing;
                const start = f.startDate ?? f.periodStart;
                const end = f.endDate ?? f.periodEnd;

                return (
                  <div key={f.id} className="bg-card rounded-xl p-5 shadow-card border border-border">
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className="text-success flex">
                        <CheckCircle2 size={16} color="currentColor" strokeWidth={2} />
                      </span>
                      <h2 className="text-base font-bold text-foreground m-0">
                        {formatDate(start)} &ndash; {formatDate(end)}
                      </h2>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground m-0">Annual accounts</p>
                        <p className="text-xs text-secondary m-0">
                          {f.confirmedAt
                            ? `Accepted ${formatUkDateShort(f.confirmedAt)}`
                            : "Accepted"}
                          {f.submittedAt && " \u00b7 Filed via DormantFile"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {f.submittedAt && (
                          <>
                            <CopyFilingSummary
                              companyName={companyName}
                              companyNumber={companyNumber}
                              filingType="accounts"
                              periodStart={start}
                              periodEnd={end}
                              confirmedAt={f.confirmedAt}
                            />
                            <Link
                              href={`/company/${companyId}/receipt/${f.id}`}
                              title="View receipt"
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border text-secondary transition-colors duration-200"
                            >
                              <FileText size={14} strokeWidth={2} />
                            </Link>
                          </>
                        )}
                        <FilingStatusBadge status={f.status} filingType="accounts" />
                      </div>
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
                Completed filings will appear here once accepted by Companies House.
              </p>
            </div>
          )}

          {chAccountsFilings && chAccountsFilings.length > 0 && (
            <div className="bg-card rounded-xl p-5 shadow-card border border-border mt-4">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-bold text-foreground m-0">
                  Companies House record
                </h3>
                <a
                  href={`https://find-and-update.company-information.service.gov.uk/company/${companyNumber}/filing-history`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-semibold text-primary no-underline"
                >
                  View on Companies House
                </a>
              </div>
              <p className="text-xs text-secondary m-0 mb-3">
                Official accounts filings held by Companies House — including any filed before
                DormantFile or by an accountant. Full documents are available on Companies House.
              </p>
              <div className="flex flex-col gap-1.5">
                {[...chAccountsFilings]
                  .sort(
                    (a, b) =>
                      new Date(b.madeUpDate).getTime() - new Date(a.madeUpDate).getTime(),
                  )
                  .map((doc) => (
                    <div
                      key={`${doc.madeUpDate}-${doc.type}`}
                      className="flex items-center justify-between px-3 py-2 bg-inset rounded-lg"
                    >
                      <p className="text-[13px] font-semibold text-foreground m-0">
                        Made up to {formatDate(new Date(doc.madeUpDate))}
                      </p>
                      <p className="text-xs text-secondary m-0">{doc.type}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
