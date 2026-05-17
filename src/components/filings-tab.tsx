"use client";

import CheckStatusButton from "@/components/check-status-button";
import CopyFilingSummary from "@/components/copy-filing-summary";
import FiledDocumentModal from "@/components/filed-document-modal";
import {
  LedgerEmpty,
  LedgerList,
  LedgerRow,
  LedgerTabs,
  quietAction,
  quietIcon,
} from "@/components/filing-ledger";
import FilingStatusBadge from "@/components/filing-status-badge";
import MarkFiledButton from "@/components/mark-filed-button";
import SuppressButton from "@/components/suppress-button";
import UndoMarkFiledButton from "@/components/undo-mark-filed-button";
import { buildFilingViews } from "@/lib/filing-views";
import { formatCivilDate, formatCivilDateShort, formatUkDateShort } from "@/lib/format-date";
import { isFilingLive } from "@/lib/launch-mode";
import { FilingStatus } from "@prisma/client";
import { AlertTriangle, ExternalLink, FileText } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";

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

interface ChAccountsDoc {
  madeUpDate: string; // YYYY-MM-DD, equals the accounting period end
  transactionId: string;
}

interface FilingsTabProps {
  companyId: string;
  companyName: string;
  companyNumber: string;
  filings: Filing[];
  now: number;
  chAccountsDocs?: ChAccountsDoc[];
}

type SubTab = "outstanding" | "suppressed" | "filed_elsewhere" | "completed";

// One primary action per row; everything else uses the shared quiet treatment.
const ctaLink =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-cta px-3.5 py-1.5 text-[13px] font-semibold text-card no-underline transition-opacity duration-200 sm:w-auto";

export default function FilingsTab({
  companyId,
  companyName,
  companyNumber,
  filings,
  now,
  chAccountsDocs,
}: FilingsTabProps) {
  const views = buildFilingViews(filings as never[], "accounts");

  // Map accounting period end → CH document transaction id, so each accepted
  // filing can deep-link to its exact filed document on Companies House.
  const chDocByPeriodEnd = new Map(
    (chAccountsDocs ?? []).map((d) => [d.madeUpDate, d.transactionId]),
  );

  const outstanding = views.filter((v) => !v.isFiled && !v.isSuppressed);
  const suppressed = views.filter((v) => !v.isFiled && v.isSuppressed);
  const filedElsewhere = views.filter((v) => v.filing.status === "filed_elsewhere");
  const completed = views.filter((v) => v.filing.status === "accepted");
  const hasDisclosure = outstanding.some((v) => v.isDisclosureTerritory);

  const [activeTab, setActiveTab] = useState<SubTab>("outstanding");
  const [previewFilingId, setPreviewFilingId] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{
    filingId: string;
    message: string;
    tone: "accepted" | "rejected" | "processing" | "needs_attention";
  } | null>(null);

  const subTabs: { key: SubTab; label: string; count: number }[] = [
    { key: "outstanding", label: "Outstanding", count: outstanding.length },
    ...(suppressed.length > 0
      ? [{ key: "suppressed" as const, label: "Suppressed", count: suppressed.length }]
      : []),
    ...(filedElsewhere.length > 0
      ? [
          {
            key: "filed_elsewhere" as const,
            label: "Filed elsewhere",
            count: filedElsewhere.length,
          },
        ]
      : []),
    { key: "completed", label: "Completed", count: completed.length },
  ];

  return (
    <>
      {/* Disclosure territory warning — single page-level banner */}
      {hasDisclosure && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-danger-bg px-5 py-3.5 border border-danger-border">
          <span className="mt-px flex shrink-0 text-danger">
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="m-0 text-sm font-medium text-danger-text">
            This company has filings more than 4 years overdue. Very old returns may be rejected by
            Companies House. We recommend contacting them directly or consulting an accountant
            before filing.
          </p>
        </div>
      )}

      <LedgerTabs tabs={subTabs} active={activeTab} onChangeAction={setActiveTab} />

      {/* Outstanding */}
      {activeTab === "outstanding" &&
        (outstanding.length > 0 ? (
          <LedgerList>
            {outstanding.map((view, index) => {
              const f = view.filing;
              const start = f.startDate ?? f.periodStart;
              const end = f.endDate ?? f.periodEnd;
              const endISO = end.toISOString().split("T")[0];
              const deadline = f.deadline ?? f.periodEnd;
              const overdue = deadline.getTime() < now;
              const showFileNext = index === 0 && outstanding.length > 1;

              const statusBadge =
                f.status !== "outstanding" ? (
                  <FilingStatusBadge
                    status={f.status}
                    filingType="accounts"
                    flaggedForReview={!!f.reviewFlaggedAt}
                  />
                ) : null;

              const meta: ReactNode[] = [];
              if (view.isBlockedTerritory) {
                meta.push(
                  <p key="due" className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {statusBadge}
                    <span className="text-danger">
                      More than 6 years overdue — consult an accountant or contact Companies House
                    </span>
                  </p>,
                );
              } else {
                meta.push(
                  <p key="due" className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {statusBadge}
                    <span className={overdue ? "text-danger" : "text-secondary"}>
                      Due {formatShortDate(deadline)}
                      {overdue && " · Overdue"}
                    </span>
                  </p>,
                );
                if (view.hasEarlierGaps) {
                  meta.push(
                    <p key="gap" className="m-0 text-muted">
                      Earlier periods still open
                    </p>,
                  );
                }
                if (
                  f.status === "submitted" &&
                  f.reviewFlaggedAt &&
                  checkResult?.filingId !== f.id
                ) {
                  meta.push(
                    <p key="awaiting" className="m-0 text-warning-text">
                      Awaiting confirmation from Companies House
                    </p>,
                  );
                }
                if (checkResult?.filingId === f.id) {
                  meta.push(
                    <p
                      key="checked"
                      aria-live="polite"
                      className={
                        checkResult.tone === "accepted"
                          ? "m-0 text-success"
                          : checkResult.tone === "rejected"
                            ? "m-0 text-danger"
                            : "m-0 text-warning-text"
                      }
                    >
                      {checkResult.message}
                    </p>,
                  );
                }
              }

              let actions: ReactNode;
              if (view.isBlockedTerritory) {
                actions = view.isOverdue ? (
                  <SuppressButton companyId={companyId} periodEnd={endISO} isSuppressed={false} />
                ) : null;
              } else if (f.status !== "outstanding") {
                const primary =
                  f.status === "submitted" ? (
                    <CheckStatusButton
                      filingId={f.id}
                      onResult={(r) =>
                        setCheckResult(
                          r ? { filingId: f.id, message: r.message, tone: r.type } : null,
                        )
                      }
                    />
                  ) : (f.status === "failed" || f.status === "rejected") && isFilingLive() ? (
                    <Link href={`/file/${companyId}/accounts?filingId=${f.id}`} className={ctaLink}>
                      Retry
                    </Link>
                  ) : null;
                actions = (
                  <>
                    {(f.status === "submitted" || f.status === "rejected") && (
                      <button
                        type="button"
                        onClick={() => setPreviewFilingId(f.id)}
                        title="Preview what was submitted to Companies House"
                        className={quietAction}
                      >
                        <FileText size={13} strokeWidth={2} />
                        Preview submitted
                      </button>
                    )}
                    {(f.status === "failed" || f.status === "rejected") && (
                      <MarkFiledButton
                        companyId={companyId}
                        periodEnd={endISO}
                        filingType="accounts"
                      />
                    )}
                    {view.isOverdue && f.status !== "submitted" && f.status !== "pending" && (
                      <SuppressButton
                        companyId={companyId}
                        periodEnd={endISO}
                        isSuppressed={false}
                      />
                    )}
                    {primary}
                  </>
                );
              } else {
                actions = (
                  <>
                    <MarkFiledButton
                      companyId={companyId}
                      periodEnd={endISO}
                      filingType="accounts"
                    />
                    {view.isOverdue && (
                      <SuppressButton
                        companyId={companyId}
                        periodEnd={endISO}
                        isSuppressed={false}
                      />
                    )}
                    {isFilingLive() && (
                      <Link
                        href={`/file/${companyId}/accounts?filingId=${f.id}`}
                        className={ctaLink}
                      >
                        File
                      </Link>
                    )}
                  </>
                );
              }

              return (
                <LedgerRow
                  key={f.id}
                  eyebrow={showFileNext ? "File next" : undefined}
                  title={
                    <>
                      {formatDate(start)} &ndash; {formatDate(end)}
                    </>
                  }
                  tag={
                    view.isDisclosureTerritory ? (
                      <span className="text-[11px] font-semibold text-danger">&gt;4 yrs</span>
                    ) : undefined
                  }
                  meta={meta}
                  actions={actions}
                />
              );
            })}
          </LedgerList>
        ) : (
          <LedgerEmpty title="All caught up" body="No outstanding accounts periods." />
        ))}

      {/* Suppressed */}
      {activeTab === "suppressed" && (
        <LedgerList>
          {suppressed.map((view) => {
            const f = view.filing;
            const start = f.startDate ?? f.periodStart;
            const end = f.endDate ?? f.periodEnd;
            const endISO = end.toISOString().split("T")[0];
            const deadline = f.deadline ?? f.periodEnd;

            return (
              <LedgerRow
                key={f.id}
                dimmed
                title={
                  <>
                    {formatDate(start)} &ndash; {formatDate(end)}
                  </>
                }
                meta={
                  <p className="m-0 text-secondary">
                    Suppressed · accounts deadline {formatShortDate(deadline)} · excluded from
                    warnings and reminders
                  </p>
                }
                actions={
                  <SuppressButton
                    companyId={companyId}
                    periodEnd={endISO}
                    isSuppressed={true}
                    onRestore={
                      suppressed.length === 1 ? () => setActiveTab("outstanding") : undefined
                    }
                  />
                }
              />
            );
          })}
        </LedgerList>
      )}

      {/* Filed elsewhere */}
      {activeTab === "filed_elsewhere" && (
        <LedgerList>
          {[...filedElsewhere].reverse().map((view) => {
            const f = view.filing;
            const start = f.startDate ?? f.periodStart;
            const end = f.endDate ?? f.periodEnd;

            return (
              <LedgerRow
                key={f.id}
                title={
                  <>
                    {formatDate(start)} &ndash; {formatDate(end)}
                  </>
                }
                meta={<p className="m-0 text-secondary">Filed elsewhere</p>}
                actions={
                  <UndoMarkFiledButton
                    filingId={f.id}
                    onUndo={
                      filedElsewhere.length === 1 ? () => setActiveTab("outstanding") : undefined
                    }
                  />
                }
              />
            );
          })}
        </LedgerList>
      )}

      {/* Completed */}
      {activeTab === "completed" &&
        (completed.length > 0 ? (
          <LedgerList>
            {[...completed].reverse().map((view) => {
              const f = view.filing;
              const start = f.startDate ?? f.periodStart;
              const end = f.endDate ?? f.periodEnd;
              const chTxnId = chDocByPeriodEnd.get(end.toISOString().split("T")[0]);

              return (
                <LedgerRow
                  key={f.id}
                  title={
                    <>
                      {formatDate(start)} &ndash; {formatDate(end)}
                    </>
                  }
                  meta={
                    <p className="m-0 text-secondary">
                      {f.confirmedAt ? `Accepted ${formatUkDateShort(f.confirmedAt)}` : "Accepted"}
                      {f.submittedAt && " · Filed via DormantFile"}
                    </p>
                  }
                  actions={
                    <>
                      {chTxnId && (
                        <a
                          href={`https://find-and-update.company-information.service.gov.uk/company/${companyNumber}/filing-history/${chTxnId}/document?format=pdf&download=0`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View the filed accounts document on Companies House"
                          className={quietAction}
                        >
                          <ExternalLink size={13} strokeWidth={2} />
                          View on Companies House
                        </a>
                      )}
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
                            className={quietIcon}
                          >
                            <FileText size={14} strokeWidth={2} />
                          </Link>
                        </>
                      )}
                    </>
                  }
                />
              );
            })}
          </LedgerList>
        ) : (
          <LedgerEmpty
            title="No completed filings yet"
            body="Completed filings will appear here once accepted by Companies House."
          />
        ))}

      {previewFilingId && (
        <FiledDocumentModal
          src={`/api/file/preview-accounts?filingId=${previewFilingId}`}
          downloadHref={`/api/file/preview-accounts?filingId=${previewFilingId}&download=1`}
          context="submitted-snapshot"
          title="Submitted accounts"
          onClose={() => setPreviewFilingId(null)}
        />
      )}
    </>
  );
}
