"use client";

import CheckStatusButton from "@/components/check-status-button";
import { formatCivilDate, formatCivilDateShort, formatUkDateShort } from "@/lib/format-date";
import CopyFilingSummary from "@/components/copy-filing-summary";
import Ct600PeriodEditor from "@/components/ct600-period-editor";
import FilingStatusBadge from "@/components/filing-status-badge";
import MarkFiledButton from "@/components/mark-filed-button";
import UndoMarkFiledButton from "@/components/undo-mark-filed-button";
import FiledDocumentModal from "@/components/filed-document-modal";
import {
  LedgerEmpty,
  LedgerList,
  LedgerRow,
  LedgerTabs,
  quietAction,
  quietIcon,
} from "@/components/filing-ledger";
import { cn } from "@/lib/cn";
import { REMOVABLE_CT600_STATUSES } from "@/lib/ct600-remove-policy";
import { buildFilingViews } from "@/lib/filing-views";
import { isTaxFilingLive } from "@/lib/launch-mode";
import { FilingStatus } from "@prisma/client";
import { FileText, Settings2, Trash2, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

// CTAP period dates and deadlines are statutory calendar dates → verbatim.
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
}

interface CorpTaxTabProps {
  companyId: string;
  companyName: string;
  companyNumber: string;
  filings: Filing[];
  now: number;
  accountsPeriodStartISO?: string;
  accountsPeriodEndISO?: string;
  suggested?: { startISO: string; endISO: string }[];
  immutable?: { startISO: string; endISO: string; status: string }[];
}

type SubTab = "outstanding" | "filed_elsewhere" | "completed";

const ctaLink =
  "inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-cta px-3.5 py-1.5 text-[13px] font-semibold text-card no-underline transition-opacity duration-200 sm:w-auto";

export default function CorpTaxTab({
  companyId,
  companyName,
  companyNumber,
  filings,
  now,
  accountsPeriodStartISO,
  accountsPeriodEndISO,
  suggested,
  immutable,
}: CorpTaxTabProps) {
  const views = buildFilingViews(filings as never[], "ct600");

  const outstanding = views.filter((v) => !v.isFiled && !v.isSuppressed);
  const filedElsewhere = views.filter((v) => v.filing.status === "filed_elsewhere");
  const completed = views.filter((v) => v.filing.status === "accepted");

  const router = useRouter();

  const [activeTab, setActiveTab] = useState<SubTab>("outstanding");
  const [editing, setEditing] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState("");
  const [previewFilingId, setPreviewFilingId] = useState<string | null>(null);
  const [checkResult, setCheckResult] = useState<{
    filingId: string;
    message: string;
    tone: "accepted" | "rejected" | "processing" | "needs_attention";
  } | null>(null);

  async function handleRemove() {
    if (!confirmRemoveId) return;
    setRemoving(true);
    setRemoveError("");
    try {
      const res = await fetch("/api/company/ct600-periods", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, filingId: confirmRemoveId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRemoveError(data.error ?? "Something went wrong.");
        setRemoving(false);
        return;
      }
      setConfirmRemoveId(null);
      setRemoving(false);
      router.refresh();
    } catch {
      setRemoveError("Something went wrong.");
      setRemoving(false);
    }
  }

  const canManagePeriods =
    accountsPeriodStartISO != null &&
    accountsPeriodEndISO != null &&
    suggested != null &&
    immutable != null;

  const subTabs: { key: SubTab; label: string; count: number }[] = [
    { key: "outstanding", label: "Outstanding", count: outstanding.length },
    ...(filedElsewhere.length > 0
      ? [{ key: "filed_elsewhere" as const, label: "Filed elsewhere", count: filedElsewhere.length }]
      : []),
    { key: "completed", label: "Completed", count: completed.length },
  ];

  function removeButton(id: string) {
    return (
      <button
        type="button"
        title="Remove this CT600"
        onClick={() => {
          setConfirmRemoveId(id);
          setRemoveError("");
        }}
        className={quietIcon}
      >
        <Trash2 size={14} strokeWidth={2} />
      </button>
    );
  }

  return (
    <>
      {/* CT600 filing is gated off via env — surface that it's still in development */}
      {!isTaxFilingLive() && (
        <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-warning-bg px-5 py-3.5 border border-warning-border">
          <span className="mt-px shrink-0 text-warning">
            <Wrench size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p className="m-0 text-sm font-medium leading-relaxed text-warning-text">
            CT600 filing is in active development and not yet available. You can still set up your
            Corporation Tax periods and mark returns as filed elsewhere — online submission to HMRC
            is coming soon.
          </p>
        </div>
      )}

      {/* Manage periods action — shown alongside the sub-tab bar */}
      {activeTab === "outstanding" && canManagePeriods && (
        <div className="mb-3 flex justify-end">
          <button
            disabled={!isTaxFilingLive()}
            type="button"
            onClick={() => setEditing(true)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-card transition-opacity duration-200",
              !isTaxFilingLive() && "cursor-not-allowed opacity-50",
            )}
          >
            <Settings2 size={14} strokeWidth={2} />
            {outstanding.length === 0 && completed.length === 0 && filedElsewhere.length === 0
              ? "Set up CT600 periods"
              : "Manage periods"}
          </button>
        </div>
      )}

      {editing && canManagePeriods && (
        <Ct600PeriodEditor
          companyId={companyId}
          accountsPeriodStartISO={accountsPeriodStartISO}
          accountsPeriodEndISO={accountsPeriodEndISO}
          suggested={suggested}
          immutable={immutable}
          onClose={() => setEditing(false)}
        />
      )}

      <LedgerTabs tabs={subTabs} active={activeTab} onChange={setActiveTab} />

      {/* Outstanding */}
      {activeTab === "outstanding" &&
        (outstanding.length > 0 ? (
          <LedgerList>
            {outstanding.map((view, index) => {
              const f = view.filing;
              const ctapStart = f.startDate ?? f.periodStart;
              const ctapEnd = f.endDate ?? f.periodEnd;
              const ctapEndISO = ctapEnd.toISOString().split("T")[0];
              const deadline = f.deadline ?? f.periodEnd;
              const overdue = deadline ? deadline.getTime() < now : false;
              const showFileNext = index === 0 && outstanding.length > 1;

              const statusBadge =
                f.status !== "outstanding" ? (
                  <FilingStatusBadge status={f.status} filingType="ct600" />
                ) : null;

              let actions: ReactNode;
              if (f.status !== "outstanding") {
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
                  ) : (f.status === "failed" || f.status === "rejected") && isTaxFilingLive() ? (
                    <Link href={`/file/${companyId}/ct600?filingId=${f.id}`} className={ctaLink}>
                      Retry
                    </Link>
                  ) : null;
                actions = (
                  <>
                    {(f.status === "submitted" || f.status === "rejected") && (
                      <button
                        type="button"
                        onClick={() => setPreviewFilingId(f.id)}
                        title="Preview what was submitted to HMRC"
                        className={quietAction}
                      >
                        <FileText size={13} strokeWidth={2} />
                        Preview submitted
                      </button>
                    )}
                    {(f.status === "failed" || f.status === "rejected") && (
                      <MarkFiledButton
                        companyId={companyId}
                        periodEnd={ctapEndISO}
                        filingType="ct600"
                      />
                    )}
                    {REMOVABLE_CT600_STATUSES.has(f.status) && removeButton(f.id)}
                    {primary}
                  </>
                );
              } else {
                actions = (
                  <>
                    <MarkFiledButton
                      companyId={companyId}
                      periodEnd={ctapEndISO}
                      filingType="ct600"
                    />
                    {REMOVABLE_CT600_STATUSES.has(f.status) && removeButton(f.id)}
                    {isTaxFilingLive() && (
                      <Link href={`/file/${companyId}/ct600?filingId=${f.id}`} className={ctaLink}>
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
                      {formatDate(ctapStart)} &ndash; {formatDate(ctapEnd)}
                    </>
                  }
                  meta={
                    <>
                      <p className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {statusBadge}
                        {deadline && (
                          <span className={overdue ? "text-danger" : "text-secondary"}>
                            Due {formatShortDate(deadline)}
                            {overdue && " · Overdue"}
                          </span>
                        )}
                      </p>
                      {checkResult?.filingId === f.id && (
                        <p
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
                        </p>
                      )}
                    </>
                  }
                  actions={actions}
                />
              );
            })}
          </LedgerList>
        ) : canManagePeriods ? (
          <LedgerEmpty
            title="No Corporation Tax periods yet"
            body="Add the accounting period you need to file — split it if your first period was longer than 12 months — then submit."
          />
        ) : (
          <LedgerEmpty title="All caught up" body="No outstanding CT600 returns." />
        ))}

      {/* Filed elsewhere */}
      {activeTab === "filed_elsewhere" && (
        <LedgerList>
          {[...filedElsewhere].reverse().map((view) => {
            const f = view.filing;
            const ctapStart = f.startDate ?? f.periodStart;
            const ctapEnd = f.endDate ?? f.periodEnd;

            return (
              <LedgerRow
                key={f.id}
                title={
                  <>
                    {formatDate(ctapStart)} &ndash; {formatDate(ctapEnd)}
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
              const ctapStart = f.startDate ?? f.periodStart;
              const ctapEnd = f.endDate ?? f.periodEnd;

              return (
                <LedgerRow
                  key={f.id}
                  title={
                    <>
                      {formatDate(ctapStart)} &ndash; {formatDate(ctapEnd)}
                    </>
                  }
                  meta={
                    <p className="m-0 text-secondary">
                      {f.confirmedAt
                        ? `Accepted ${formatUkDateShort(f.confirmedAt)}`
                        : "Accepted"}
                      {f.submittedAt && " · Filed via DormantFile"}
                    </p>
                  }
                  actions={
                    f.submittedAt ? (
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
                          className={quietIcon}
                        >
                          <FileText size={14} strokeWidth={2} />
                        </Link>
                      </>
                    ) : undefined
                  }
                />
              );
            })}
          </LedgerList>
        ) : (
          <LedgerEmpty
            title="No completed filings yet"
            body="Completed CT600 returns will appear here once accepted by HMRC."
          />
        ))}

      {/* Remove CT600 confirmation modal */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[calc(100%-32px)] max-w-[420px] rounded-xl bg-card p-5 shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
            <h3 className="m-0 mb-3 text-base font-bold text-foreground">Remove this CT600?</h3>
            <p className="m-0 mb-5 text-sm leading-relaxed text-body">
              This will permanently remove the CT600 period. You can add it again using the period
              editor. Are you sure?
            </p>
            {removeError && <p className="m-0 mb-4 text-xs text-danger">{removeError}</p>}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmRemoveId(null);
                  setRemoveError("");
                }}
                disabled={removing}
                className="cursor-pointer rounded border border-border bg-transparent px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                disabled={removing}
                className="cursor-pointer rounded-md border-0 bg-danger px-4 py-2 text-xs font-semibold text-white"
              >
                {removing ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewFilingId && (
        <FiledDocumentModal
          src={`/api/file/preview-computations?filingId=${previewFilingId}`}
          downloadHref={`/api/file/preview-computations?filingId=${previewFilingId}&download=1`}
          context="submitted-snapshot"
          title="Submitted CT600"
          onClose={() => setPreviewFilingId(null)}
        />
      )}
    </>
  );
}
