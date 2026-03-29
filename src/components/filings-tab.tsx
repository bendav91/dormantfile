"use client";

import { useState } from "react";
import FilingStatusBadge from "@/components/filing-status-badge";
import MarkFiledButton from "@/components/mark-filed-button";
import { type PeriodInfo } from "@/lib/periods";
import { FilingStatus } from "@prisma/client";
import { AlertTriangle, Calendar, CheckCircle2 } from "lucide-react";
import Link from "next/link";

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
  registeredForCorpTax: boolean;
  periods: PeriodInfo[];
  filings: Filing[];
  now: number;
}

export default function FilingsTab({
  companyId,
  registeredForCorpTax,
  periods,
  filings,
  now,
}: FilingsTabProps) {
  const incompletePeriods = periods.filter((p) => !p.isComplete);
  const completePeriods = periods.filter((p) => p.isComplete);
  const hasDisclosurePeriods = periods.some((p) => p.isDisclosureTerritory);

  function getFilingForPeriod(period: PeriodInfo, filingType: "accounts" | "ct600") {
    return filings.find(
      (f) => f.filingType === filingType && f.periodEnd.getTime() === period.periodEnd.getTime(),
    );
  }

  const filingBtnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "var(--color-cta)",
    color: "var(--color-bg-card)",
    padding: "6px 14px",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
    textDecoration: "none",
    transition: "opacity 200ms",
  };

  return (
    <>
      {/* Disclosure territory warning */}
      {hasDisclosurePeriods && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
            padding: "14px 20px",
            backgroundColor: "var(--color-danger-bg)",
            border: "1px solid var(--color-danger-border)",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          <span
            style={{
              color: "var(--color-danger)",
              flexShrink: 0,
              marginTop: "1px",
              display: "flex",
            }}
          >
            <AlertTriangle size={18} color="currentColor" strokeWidth={2} />
          </span>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-danger-text)",
              margin: 0,
              fontWeight: 500,
            }}
          >
            This company has filings more than 4 years overdue. Very old returns may be rejected by
            Companies House. We recommend contacting them directly or consulting an accountant
            before filing.
          </p>
        </div>
      )}

      {/* Outstanding periods */}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {incompletePeriods.map((period, index) => {
          const accountsFiling = getFilingForPeriod(period, "accounts");
          const ct600Filing = getFilingForPeriod(period, "ct600");
          const periodEndISO = period.periodEnd.toISOString().split("T")[0];
          const isFirst = index === 0;

          return (
            <div
              key={period.periodEnd.toISOString()}
              style={{
                backgroundColor: "var(--color-bg-card)",
                borderRadius: "12px",
                padding: "20px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
                border: isFirst
                  ? "2px solid var(--color-primary-border)"
                  : "1px solid var(--color-border)",
              }}
            >
              {/* Period header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom:
                    period.hasEarlierGaps || (isFirst && incompletePeriods.length > 1)
                      ? "8px"
                      : "14px",
                }}
              >
                <span style={{ color: "var(--color-text-secondary)", display: "flex" }}>
                  <Calendar size={16} color="currentColor" strokeWidth={2} />
                </span>
                <h2
                  style={{
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    margin: 0,
                  }}
                >
                  {formatDate(period.periodStart)} &ndash; {formatDate(period.periodEnd)}
                </h2>
                {period.isDisclosureTerritory && (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "9999px",
                      fontSize: "11px",
                      fontWeight: 600,
                      backgroundColor: "var(--color-danger-bg)",
                      color: "var(--color-danger)",
                      border: "1px solid var(--color-danger-border)",
                    }}
                  >
                    &gt;4 years
                  </span>
                )}
              </div>

              {/* Contextual hint */}
              {isFirst && incompletePeriods.length > 1 && !period.hasEarlierGaps && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--color-primary)",
                    fontWeight: 500,
                    margin: "0 0 12px 0",
                    paddingLeft: "24px",
                  }}
                >
                  Earliest outstanding period &mdash; we recommend filing this first
                </p>
              )}

              {/* Gap warning */}
              {period.hasEarlierGaps && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px",
                    backgroundColor: "var(--color-warning-bg)",
                    border: "1px solid var(--color-warning-border)",
                    borderRadius: "6px",
                    marginBottom: "14px",
                  }}
                >
                  <span style={{ color: "var(--color-warning)", flexShrink: 0, display: "flex" }}>
                    <AlertTriangle size={13} color="currentColor" strokeWidth={2} />
                  </span>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--color-warning-text)",
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    Earlier periods are still outstanding. Filing out of order may cause issues with
                    Companies House.
                  </p>
                </div>
              )}

              {/* Blocked territory warning */}
              {period.isBlockedTerritory && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px",
                    backgroundColor: "var(--color-danger-bg)",
                    border: "1px solid var(--color-danger-border)",
                    borderRadius: "6px",
                    marginBottom: "14px",
                  }}
                >
                  <span style={{ color: "var(--color-danger)", flexShrink: 0, display: "flex" }}>
                    <AlertTriangle size={13} color="currentColor" strokeWidth={2} />
                  </span>
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--color-danger-text)",
                      margin: 0,
                      fontWeight: 500,
                    }}
                  >
                    This period is more than 6 years overdue. We recommend consulting an accountant
                    or contacting Companies House directly.
                  </p>
                </div>
              )}

              {/* Filing rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {/* Accounts */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 12px",
                    backgroundColor: "var(--color-bg-inset)",
                    borderRadius: "8px",
                  }}
                >
                  <div>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: "var(--color-text-primary)",
                        margin: 0,
                      }}
                    >
                      Accounts
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        color: period.accountsFiled
                          ? "var(--color-text-secondary)"
                          : period.accountsDeadline.getTime() < now
                            ? "var(--color-danger)"
                            : "var(--color-text-secondary)",
                        margin: 0,
                      }}
                    >
                      Deadline: {formatShortDate(period.accountsDeadline)}
                      {!period.accountsFiled &&
                        period.accountsDeadline.getTime() < now &&
                        " (Overdue)"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {period.isBlockedTerritory ? (
                      <span
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--color-text-secondary)",
                          backgroundColor: "var(--color-bg-inset)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        Seek professional advice
                      </span>
                    ) : accountsFiling ? (
                      <>
                        <FilingStatusBadge status={accountsFiling.status} filingType="accounts" />
                        {(accountsFiling.status === "failed" ||
                          accountsFiling.status === "rejected") && (
                          <Link
                            href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`}
                            style={filingBtnStyle}
                          >
                            Retry
                          </Link>
                        )}
                      </>
                    ) : (
                      <Link
                        href={`/file/${companyId}/accounts?periodEnd=${periodEndISO}`}
                        style={filingBtnStyle}
                      >
                        File
                      </Link>
                    )}
                  </div>
                </div>

                {/* CT600 */}
                {registeredForCorpTax && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      backgroundColor: "var(--color-bg-inset)",
                      borderRadius: "8px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                          margin: 0,
                        }}
                      >
                        CT600
                      </p>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "var(--color-text-secondary)",
                          margin: 0,
                        }}
                      >
                        Due: {formatShortDate(period.ct600Deadline)}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {ct600Filing ? (
                        <>
                          <FilingStatusBadge status={ct600Filing.status} filingType="ct600" />
                          {(ct600Filing.status === "failed" ||
                            ct600Filing.status === "rejected") && (
                            <Link
                              href={`/file/${companyId}/ct600?periodEnd=${periodEndISO}`}
                              style={filingBtnStyle}
                            >
                              Retry
                            </Link>
                          )}
                        </>
                      ) : period.isBlockedTerritory ? (
                        <MarkFiledButton companyId={companyId} periodEnd={periodEndISO} />
                      ) : (
                        <>
                          <MarkFiledButton companyId={companyId} periodEnd={periodEndISO} />
                          <Link
                            href={`/file/${companyId}/ct600?periodEnd=${periodEndISO}`}
                            style={filingBtnStyle}
                          >
                            File
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed periods */}
      {completePeriods.length > 0 && (
        <>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              margin: "32px 0 12px 0",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Completed periods
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {completePeriods.map((period) => (
              <div
                key={period.periodEnd.toISOString()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  backgroundColor: "var(--color-bg-card)",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  opacity: 0.7,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ color: "var(--color-success)", display: "flex" }}>
                    <CheckCircle2 size={16} color="currentColor" strokeWidth={2} />
                  </span>
                  <p
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      color: "var(--color-text-secondary)",
                      margin: 0,
                    }}
                  >
                    {formatDate(period.periodStart)} &ndash; {formatDate(period.periodEnd)}
                  </p>
                </div>
                <span
                  style={{
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: "var(--color-success-bg)",
                    color: "var(--color-success)",
                  }}
                >
                  Complete
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* No periods - company is up to date */}
      {incompletePeriods.length === 0 && completePeriods.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "48px 24px",
            backgroundColor: "var(--color-bg-card)",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          }}
        >
          <span
            style={{
              color: "var(--color-success)",
              display: "flex",
              justifyContent: "center",
              marginBottom: "12px",
            }}
          >
            <CheckCircle2 size={32} color="currentColor" strokeWidth={2} />
          </span>
          <p
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--color-text-primary)",
              margin: "0 0 4px 0",
            }}
          >
            All caught up
          </p>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0 }}>
            No outstanding accounting periods for this company.
          </p>
        </div>
      )}
    </>
  );
}
