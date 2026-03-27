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
    backgroundColor: "#F1F5F9",
    color: "#475569",
  },
  submitted: {
    label: "Submitted",
    backgroundColor: "#EFF6FF",
    color: "#1D4ED8",
  },
  polling_timeout: {
    label: "Awaiting HMRC",
    backgroundColor: "#FEFCE8",
    color: "#A16207",
  },
  accepted: {
    label: "Accepted",
    backgroundColor: "#F0FDF4",
    color: "#15803D",
  },
  rejected: {
    label: "Rejected",
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
  },
  failed: {
    label: "Failed",
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
  },
};

export default function FilingStatusBadge({ status, filingType }: FilingStatusBadgeProps) {
  const config = statusConfig[status];
  const label = status === "polling_timeout" && filingType === "accounts"
    ? "Awaiting CH"
    : config.label;

  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        borderRadius: "9999px",
        fontSize: "13px",
        fontWeight: 600,
        backgroundColor: config.backgroundColor,
        color: config.color,
      }}
    >
      {label}
    </span>
  );
}
