import { FilingStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

interface FilingStatusBadgeProps {
  status: FilingStatus;
  filingType?: "accounts" | "ct600";
  /**
   * Submitted to Companies House but no accept/reject confirmation after the
   * grace window (CH error 8023 persisting). Not a rejection — it overrides
   * the "Submitted" label with an amber "Awaiting confirmation".
   */
  flaggedForReview?: boolean;
}

const statusConfig: Record<
  FilingStatus,
  { label: string; className: string }
> = {
  outstanding: {
    label: "Outstanding",
    className: "bg-neutral-bg text-neutral-text",
  },
  pending: {
    label: "Pending",
    className: "bg-neutral-bg text-neutral-text",
  },
  submitted: {
    label: "Submitted",
    className: "bg-submitted-bg text-submitted-text",
  },
  accepted: {
    label: "Accepted",
    className: "bg-success-bg text-success",
  },
  rejected: {
    label: "Rejected",
    className: "bg-danger-bg text-danger-deep",
  },
  failed: {
    label: "Failed",
    className: "bg-danger-bg text-danger-deep",
  },
  filed_elsewhere: {
    label: "Filed elsewhere",
    className: "bg-neutral-bg text-neutral-text",
  },
};

export default function FilingStatusBadge({
  status,
  flaggedForReview,
}: FilingStatusBadgeProps) {
  const config =
    flaggedForReview && status === "submitted"
      ? {
          label: "Awaiting confirmation",
          className: "bg-warning-bg text-warning-text",
        }
      : statusConfig[status];
  const label = config.label;

  return (
    <span
      className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold", config.className)}
    >
      {label}
    </span>
  );
}
