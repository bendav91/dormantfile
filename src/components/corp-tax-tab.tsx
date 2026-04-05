"use client";

import { useState } from "react";
import FilingStatusBadge from "@/components/filing-status-badge";
import CheckStatusButton from "@/components/check-status-button";
import MarkFiledButton from "@/components/mark-filed-button";
import { buildFilingViews } from "@/lib/filing-views";
import { FilingStatus } from "@prisma/client";
import { Calendar, CheckCircle2, FileText } from "lucide-react";
import Link from "next/link";
import CopyFilingSummary from "@/components/copy-filing-summary";
import UndoMarkFiledButton from "@/components/undo-mark-filed-button";
import { isFilingLive } from "@/lib/launch-mode";
import { cn } from "@/lib/cn";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

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
}

interface CorpTaxTabProps {
  companyId: string;
  companyName: string;
  companyNumber: string;
  filings: Filing[];
  now: number;
}

export default function CorpTaxTab({
  companyId,
  companyName,
  companyNumber,
  filings,
  now,
}: CorpTaxTabProps) {
  const views = buildFilingViews(filings as never[], "ct600");

  const outstanding = views.filter((v) => !v.isFiled && !v.isSuppressed);
  const filedElsewhere = views.filter((v) => v.filing.status === "filed_elsewhere");
  const completed = views.filter((v) => v.filing.status === "accepted");

  const [activeTab, setActiveTab] = useState<"outstanding" | "filed_elsewhere" | "completed">(
    "outstanding",
  );

  return (
    <>
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
                const ctapStart = f.startDate ?? f.periodStart;
                const ctapEnd = f.endDate ?? f.periodEnd;
                const ctapEndISO = ctapEnd.toISOString().split("T")[0];
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
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className="text-secondary flex">
                        <Calendar size={16} color="currentColor" strokeWidth={2} />
                      </span>
                      <h2 className="text-base font-bold text-foreground m-0">
                        {formatDate(ctapStart)} &ndash; {formatDate(ctapEnd)}
                      </h2>
                    </div>

                    <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground m-0">CT600</p>
                        {deadline && (
                          <p
                            className={cn(
                              "text-xs m-0",
                              deadline.getTime() < now ? "text-danger" : "text-secondary"
                            )}
                          >
                            Due: {formatShortDate(deadline)}
                            {deadline.getTime() < now && " (Overdue)"}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {f.status !== "outstanding" ? (
                          <>
                            {f.status === "submitted" && (
                              <CheckStatusButton filingId={f.id} />
                            )}
                            <FilingStatusBadge status={f.status} filingType="ct600" />
                            {(f.status === "failed" || f.status === "rejected") && (
                              <>
                                <MarkFiledButton companyId={companyId} periodEnd={ctapEndISO} filingType="ct600" />
                                {isFilingLive() && (
                                  <Link
                                    href={`/file/${companyId}/ct600?filingId=${f.id}`}
                                    className="inline-flex items-center gap-1.5 bg-cta text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] no-underline transition-opacity duration-200"
                                  >
                                    Retry
                                  </Link>
                                )}
                              </>
                            )}
                          </>
                        ) : (
                          <>
                            <MarkFiledButton companyId={companyId} periodEnd={ctapEndISO} filingType="ct600" />
                            {isFilingLive() && (
                              <Link
                                href={`/file/${companyId}/ct600?filingId=${f.id}`}
                                className="inline-flex items-center gap-1.5 bg-cta text-card px-3.5 py-1.5 rounded-md font-semibold text-[13px] no-underline transition-opacity duration-200"
                              >
                                File
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </div>
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
              <p className="text-sm text-secondary m-0">No outstanding CT600 returns.</p>
            </div>
          )}
        </>
      )}

      {/* Filed elsewhere */}
      {activeTab === "filed_elsewhere" && (
        <div className="flex flex-col gap-3">
          {[...filedElsewhere].reverse().map((view) => {
            const f = view.filing;
            const ctapStart = f.startDate ?? f.periodStart;
            const ctapEnd = f.endDate ?? f.periodEnd;

            return (
              <div key={f.id} className="bg-card rounded-xl p-5 shadow-card border border-border">
                <div className="flex items-center gap-2 mb-3.5">
                  <span className="text-secondary flex">
                    <Calendar size={16} color="currentColor" strokeWidth={2} />
                  </span>
                  <h2 className="text-base font-bold text-foreground m-0">
                    {formatDate(ctapStart)} &ndash; {formatDate(ctapEnd)}
                  </h2>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                  <div>
                    <p className="text-[13px] font-semibold text-foreground m-0">CT600</p>
                    <p className="text-xs text-secondary m-0">Filed elsewhere</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <UndoMarkFiledButton
                      filingId={f.id}
                      onUndo={filedElsewhere.length === 1 ? () => setActiveTab("outstanding") : undefined}
                    />
                    <FilingStatusBadge status={"filed_elsewhere" as FilingStatus} filingType="ct600" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed */}
      {activeTab === "completed" && (
        <>
          {completed.length > 0 ? (
            <div className="flex flex-col gap-3">
              {[...completed].reverse().map((view) => {
                const f = view.filing;
                const ctapStart = f.startDate ?? f.periodStart;
                const ctapEnd = f.endDate ?? f.periodEnd;

                return (
                  <div key={f.id} className="bg-card rounded-xl p-5 shadow-card border border-border">
                    <div className="flex items-center gap-2 mb-3.5">
                      <span className="text-success flex">
                        <CheckCircle2 size={16} color="currentColor" strokeWidth={2} />
                      </span>
                      <h2 className="text-base font-bold text-foreground m-0">
                        {formatDate(ctapStart)} &ndash; {formatDate(ctapEnd)}
                      </h2>
                    </div>
                    <div className="flex items-center justify-between px-3 py-2.5 bg-inset rounded-lg">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground m-0">CT600</p>
                        <p className="text-xs text-secondary m-0">
                          {f.confirmedAt
                            ? `Accepted ${formatShortDate(f.confirmedAt)}`
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
                              filingType="ct600"
                              periodStart={ctapStart}
                              periodEnd={ctapEnd}
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
                        <FilingStatusBadge status={f.status} filingType="ct600" />
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
                Completed CT600 returns will appear here once accepted by HMRC.
              </p>
            </div>
          )}
        </>
      )}
    </>
  );
}
