const COLOURS: Record<string, { bg: string; text: string }> = {
  // Filing status
  accepted: { bg: "rgba(21, 128, 61, 0.08)", text: "var(--color-success)" },
  rejected: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
  failed: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
  stuck: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
  pending: { bg: "rgba(202, 138, 4, 0.08)", text: "var(--color-warning)" },
  submitted: { bg: "rgba(202, 138, 4, 0.08)", text: "var(--color-warning)" },
  outstanding: { bg: "rgba(100, 116, 139, 0.08)", text: "var(--color-text-muted)" },
  // Subscription status
  active: { bg: "rgba(21, 128, 61, 0.08)", text: "var(--color-success)" },
  cancelling: { bg: "rgba(202, 138, 4, 0.08)", text: "var(--color-warning)" },
  cancelled: { bg: "rgba(100, 116, 139, 0.08)", text: "var(--color-text-muted)" },
  past_due: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
  none: { bg: "rgba(100, 116, 139, 0.08)", text: "var(--color-text-muted)" },
  // Review status
  published: { bg: "rgba(21, 128, 61, 0.08)", text: "var(--color-success)" },
  hidden: { bg: "rgba(220, 38, 38, 0.08)", text: "var(--color-danger)" },
};

const LABELS: Record<string, string> = {
  past_due: "Past due",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colours = COLOURS[status] || COLOURS.outstanding;
  const displayLabel = label || LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ backgroundColor: colours.bg, color: colours.text }}
    >
      {displayLabel}
    </span>
  );
}
