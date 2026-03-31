import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PrintButton from "./print-button";

interface PageProps {
  params: Promise<{ companyId: string; filingId: string }>;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default async function ReceiptPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { companyId, filingId } = await params;

  const filing = await prisma.filing.findFirst({
    where: {
      id: filingId,
      companyId,
      company: { userId: session.user.id, deletedAt: null },
    },
    include: { company: true },
  });

  if (!filing || filing.status !== "accepted" || !filing.submittedAt) {
    redirect(`/company/${companyId}`);
  }

  const authority = filing.filingType === "accounts" ? "Companies House" : "HMRC";
  const filingLabel = filing.filingType === "accounts" ? "Annual Accounts" : "CT600";

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    padding: "10px 0",
    borderBottom: "1px solid var(--color-border)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--color-text-secondary)",
  };

  const valueStyle: React.CSSProperties = {
    fontSize: "14px",
    fontWeight: 600,
    color: "var(--color-text-primary)",
    textAlign: "right",
  };

  return (
    <div>
      <Link
        href={`/company/${companyId}`}
        className="no-print"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          textDecoration: "none",
          fontWeight: 500,
          marginBottom: "24px",
        }}
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Back to company
      </Link>

      <div
        className="print-receipt"
        style={{
          backgroundColor: "var(--color-bg-card)",
          borderRadius: "12px",
          padding: "32px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)",
          maxWidth: "560px",
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <p
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-success)",
              margin: "0 0 4px 0",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Filing Accepted
          </p>
          <h1
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {filingLabel} Confirmation
          </h1>
        </div>

        <div>
          <div style={rowStyle}>
            <span style={labelStyle}>Company</span>
            <span style={valueStyle}>{filing.company.companyName}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Registration number</span>
            <span style={valueStyle}>{filing.company.companyRegistrationNumber}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Filing type</span>
            <span style={valueStyle}>{filingLabel}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Accounting period</span>
            <span style={valueStyle}>
              {formatDate(filing.periodStart)} &ndash; {formatDate(filing.periodEnd)}
            </span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Filed with</span>
            <span style={valueStyle}>{authority}</span>
          </div>
          <div style={rowStyle}>
            <span style={labelStyle}>Date submitted</span>
            <span style={valueStyle}>{formatDate(filing.submittedAt)}</span>
          </div>
          {filing.confirmedAt && (
            <div style={rowStyle}>
              <span style={labelStyle}>Date confirmed</span>
              <span style={valueStyle}>{formatDate(filing.confirmedAt)}</span>
            </div>
          )}
          {filing.correlationId && (
            <div style={rowStyle}>
              <span style={labelStyle}>Submission reference</span>
              <span style={{ ...valueStyle, fontFamily: "monospace", fontSize: "13px" }}>
                {filing.correlationId}
              </span>
            </div>
          )}
          {filing.irmark && (
            <div style={rowStyle}>
              <span style={labelStyle}>IRmark</span>
              <span
                style={{
                  ...valueStyle,
                  fontFamily: "monospace",
                  fontSize: "11px",
                  wordBreak: "break-all",
                  maxWidth: "300px",
                }}
              >
                {filing.irmark}
              </span>
            </div>
          )}
        </div>

        <p
          style={{
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            margin: "20px 0 0 0",
            lineHeight: 1.5,
          }}
        >
          This confirms that your {filingLabel.toLowerCase()} were submitted to {authority} and
          accepted. Keep this for your records.
        </p>

        <PrintButton />
      </div>
    </div>
  );
}
