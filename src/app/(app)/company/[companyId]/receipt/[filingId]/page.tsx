import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PrintButton from "./print-button";
import { formatCivilDate, formatUkDate } from "@/lib/format-date";
import { fetchAccountsFilingDocuments } from "@/lib/companies-house/filing-history";
import { resolvePostFilingDocument } from "@/lib/post-filing-resolution";
import FiledDocumentViewer from "@/components/filed-document-viewer";

interface PageProps {
  params: Promise<{ companyId: string; filingId: string }>;
}

// Period dates are statutory civil dates; submitted/confirmed are instants.
const formatDate = formatCivilDate;

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

  // --- Post-filing document resolution (accepted only) ---
  type DocumentSection =
    | { type: "viewer"; src: string; downloadHref: string; context: "official" | "post-accounts-interim" | "post-ct600"; title: string; secondaryHref?: string }
    | { type: "legacy-none"; companyNumber: string }
    | { type: "ct600-legacy" }
    | { type: "none" };

  let documentSection: DocumentSection = { type: "none" };

  if (filing.filingType === "accounts") {
    const chFilings = await fetchAccountsFilingDocuments(
      filing.company.companyRegistrationNumber,
    );
    const resolution = resolvePostFilingDocument({
      periodEnd: filing.endDate ?? filing.periodEnd,
      filingType: filing.filingType,
      hasSnapshot: !!filing.filedAccountsIxbrl,
      chFilings,
    });
    if (resolution.kind === "official") {
      documentSection = {
        type: "viewer",
        src: `/api/file/official-accounts?filingId=${filing.id}`,
        downloadHref: `/api/file/official-accounts?filingId=${filing.id}`,
        context: "official",
        title: "Accounts filed at Companies House",
      };
    } else if (resolution.kind === "interim") {
      documentSection = {
        type: "viewer",
        src: `/api/file/preview-accounts?filingId=${filing.id}`,
        downloadHref: `/api/file/preview-accounts?filingId=${filing.id}&download=1`,
        context: "post-accounts-interim",
        title: "Filed dormant accounts",
      };
    } else {
      documentSection = {
        type: "legacy-none",
        companyNumber: filing.company.companyRegistrationNumber,
      };
    }
  } else if (filing.filingType === "ct600") {
    if (filing.filedComputationsIxbrl) {
      documentSection = {
        type: "viewer",
        src: `/api/file/preview-computations?filingId=${filing.id}`,
        downloadHref: `/api/file/preview-computations?filingId=${filing.id}&download=1`,
        context: "post-ct600",
        title: "Corporation Tax return filed with HMRC",
        secondaryHref: `/api/file/preview-accounts?filingId=${filing.id}`,
      };
    } else {
      documentSection = { type: "ct600-legacy" };
    }
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
            <span className={valueClass}>{formatUkDate(filing.submittedAt)}</span>
          </div>
          {filing.confirmedAt && (
            <div className={rowClass}>
              <span className={labelClass}>Date confirmed</span>
              <span className={valueClass}>{formatUkDate(filing.confirmedAt)}</span>
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

      {documentSection.type === "viewer" && (
        <div className="mt-8 max-w-[560px]">
          <h2 className="text-[15px] font-semibold text-foreground mb-3">
            {documentSection.title}
          </h2>
          <FiledDocumentViewer
            src={documentSection.src}
            downloadHref={documentSection.downloadHref}
            context={documentSection.context}
            title={documentSection.title}
          />
          {documentSection.secondaryHref && (
            <p className="mt-3 text-[13px] text-secondary">
              <a
                href={documentSection.secondaryHref}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary no-underline"
              >
                View attached accounts
              </a>
            </p>
          )}
        </div>
      )}

      {documentSection.type === "legacy-none" && (
        <div className="mt-8 max-w-[560px]">
          <p className="text-[13px] text-secondary">
            The official copy of your accounts is available on the{" "}
            <a
              href={`https://find-and-update.company-information.service.gov.uk/company/${documentSection.companyNumber}/filing-history`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary no-underline"
            >
              Companies House website
            </a>
            .
          </p>
        </div>
      )}

      {documentSection.type === "ct600-legacy" && (
        <div className="mt-8 max-w-[560px]">
          <p className="text-[13px] text-secondary">
            The filed document was not retained for filings made before this feature.
          </p>
        </div>
      )}
    </div>
  );
}
