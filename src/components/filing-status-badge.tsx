import { FilingStatus } from "@prisma/client";

interface FilingStatusBadgeProps {
  status: FilingStatus;
  filingType?: "accounts" | "ct600";
}

const statusConfig: Record<
  FilingStatus,
  { label: string; backgroundColor: string; color: string }
> = {
  pending: {
    label: "Pending",
    backgroundColor: "var(--color-neutral-bg)",
    color: "var(--color-neutral-text)",
  },
  submitted: {
    label: "Submitted",
    backgroundColor: "var(--color-submitted-bg)",
    color: "var(--color-submitted-text)",
  },
  polling_timeout: {
    label: "Awaiting HMRC",
    backgroundColor: "var(--color-warning-bg)",
    color: "var(--color-warning-deep)",
  },
  accepted: {
    label: "Accepted",
    backgroundColor: "var(--color-success-bg)",
    color: "var(--color-success)",
  },
  rejected: {
    label: "Rejected",
    backgroundColor: "var(--color-danger-bg)",
    color: "var(--color-danger-deep)",
  },
  failed: {
    label: "Failed",
    backgroundColor: "var(--color-danger-bg)",
    color: "var(--color-danger-deep)",
  },
};

export default function FilingStatusBadge({ status, filingType }: FilingStatusBadgeProps) {
  const config = statusConfig[status];
  const label =
    status === "polling_timeout" && filingType === "accounts" ? "Awaiting CH" : config.label;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: "9999px",
        fontSize: "12px",
        fontWeight: 600,
        backgroundColor: config.backgroundColor,
        color: config.color,
      }}
    >
      {label}
    </span>
  );
}
