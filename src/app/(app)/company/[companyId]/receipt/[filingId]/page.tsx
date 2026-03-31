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

  const rowClass = "flex justify-between items-baseline py-2.5 border-b border-border";
  const labelClass = "text-[13px] font-medium text-secondary";
  const valueClass = "text-sm font-semibold text-foreground text-right";

  return (
    <div>
      <Link
        href={`/company/${companyId}`}
        className="no-print inline-flex items-center gap-1.5 text-sm text-secondary no-underline font-medium mb-6"
      >
        <ArrowLeft size={15} strokeWidth={2} />
        Back to company
      </Link>

      <div className="print-receipt bg-card rounded-xl p-8 shadow-card max-w-[560px]">
        <div className="mb-6">
          <p className="text-[13px] font-semibold text-success mb-1 uppercase tracking-[0.05em]">
            Filing Accepted
          </p>
          <h1 className="text-[22px] font-bold text-foreground tracking-[-0.02em]">
            {filingLabel} Confirmation
          </h1>
        </div>

        <div>
          <div className={rowClass}>
            <span className={labelClass}>Company</span>
            <span className={valueClass}>{filing.company.companyName}</span>
          </div>
          <div className={rowClass}>
            <span className={labelClass}>Registration number</span>
            <span className={valueClass}>{filing.company.companyRegistrationNumber}</span>
          </div>
          <div className={rowClass}>
            <span className={labelClass}>Filing type</span>
            <span className={valueClass}>{filingLabel}</span>
          </div>
          <div className={rowClass}>
            <span className={labelClass}>Accounting period</span>
            <span className={valueClass}>
              {formatDate(filing.periodStart)} &ndash; {formatDate(filing.periodEnd)}
            </span>
          </div>
          <div className={rowClass}>
            <span className={labelClass}>Filed with</span>
            <span className={valueClass}>{authority}</span>
          </div>
          <div className={rowClass}>
            <span className={labelClass}>Date submitted</span>
            <span className={valueClass}>{formatDate(filing.submittedAt)}</span>
          </div>
          {filing.confirmedAt && (
            <div className={rowClass}>
              <span className={labelClass}>Date confirmed</span>
              <span className={valueClass}>{formatDate(filing.confirmedAt)}</span>
            </div>
          )}
          {filing.correlationId && (
            <div className={rowClass}>
              <span className={labelClass}>Submission reference</span>
              <span className={`${valueClass} font-mono text-[13px]`}>
                {filing.correlationId}
              </span>
            </div>
          )}
          {filing.irmark && (
            <div className={rowClass}>
              <span className={labelClass}>IRmark</span>
              <span className={`${valueClass} font-mono text-[11px] break-all max-w-[300px]`}>
                {filing.irmark}
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-secondary mt-5 leading-normal">
          This confirms that your {filingLabel.toLowerCase()} were submitted to {authority} and
          accepted. Keep this for your records.
        </p>

        <PrintButton />
      </div>
    </div>
  );
}
