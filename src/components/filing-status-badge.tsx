import { FilingStatus } from "@prisma/client";
import { cn } from "@/lib/cn";

interface FilingStatusBadgeProps {
  status: FilingStatus;
  filingType?: "accounts" | "ct600";
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

export default function FilingStatusBadge({ status }: FilingStatusBadgeProps) {
  const config = statusConfig[status];
  const label = config.label;

  return (
    <span
      className={cn("inline-block px-2 py-0.5 rounded-full text-xs font-semibold", config.className)}
    >
      {label}
    </span>
  );
}
