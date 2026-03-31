export interface TimelineEvent {
  id: string;
  type:
    | "company_added"
    | "filing_submitted"
    | "filing_accepted"
    | "filing_rejected"
    | "filing_failed"
    | "reminder_sent";
  date: Date;
  title: string;
  detail: string | null;
  filingType?: "accounts" | "ct600";
}

interface FilingInput {
  id: string;
  filingType: "accounts" | "ct600";
  periodStart: Date;
  periodEnd: Date;
  status: string;
  submittedAt: Date | null;
  confirmedAt: Date | null;
  createdAt: Date;
}

interface NotificationInput {
  id: string;
  type: string;
  sentAt: Date;
}

function formatPeriod(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${fmt(start)} \u2013 ${fmt(end)}`;
}

function filingLabel(filingType: "accounts" | "ct600"): string {
  return filingType === "accounts" ? "Accounts" : "CT600";
}

function filingTarget(filingType: "accounts" | "ct600"): string {
  return filingType === "accounts" ? "Companies House" : "HMRC";
}

function humanizeNotificationType(type: string): string {
  // e.g. "reminder_due_30" -> "Due within 30 days"
  //      "reminder_overdue_7" -> "7 days overdue"
  const dueMatch = type.match(/^reminder_due_(\d+)$/);
  if (dueMatch) {
    return `Due within ${dueMatch[1]} days`;
  }
  const overdueMatch = type.match(/^reminder_overdue_(\d+)$/);
  if (overdueMatch) {
    return `${overdueMatch[1]} days overdue`;
  }
  // Fallback: humanize underscores
  return type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function buildActivityTimeline(
  companyCreatedAt: Date,
  filings: FilingInput[],
  notifications: NotificationInput[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Company added event
  events.push({
    id: `company-added`,
    type: "company_added",
    date: companyCreatedAt,
    title: "Company added to DormantFile",
    detail: null,
  });

  // Filing events
  for (const filing of filings) {
    const period = formatPeriod(filing.periodStart, filing.periodEnd);
    const label = filingLabel(filing.filingType);
    const target = filingTarget(filing.filingType);

    if (filing.submittedAt) {
      events.push({
        id: `filing-submitted-${filing.id}`,
        type: "filing_submitted",
        date: filing.submittedAt,
        title: `${label} submitted to ${target}`,
        detail: period,
        filingType: filing.filingType,
      });
    }

    if (filing.confirmedAt && filing.status === "accepted") {
      events.push({
        id: `filing-accepted-${filing.id}`,
        type: "filing_accepted",
        date: filing.confirmedAt,
        title: `${label} accepted`,
        detail: period,
        filingType: filing.filingType,
      });
    }

    if (filing.status === "rejected") {
      events.push({
        id: `filing-rejected-${filing.id}`,
        type: "filing_rejected",
        date: filing.confirmedAt ?? filing.createdAt,
        title: `${label} rejected`,
        detail: period,
        filingType: filing.filingType,
      });
    }

    if (filing.status === "failed") {
      events.push({
        id: `filing-failed-${filing.id}`,
        type: "filing_failed",
        date: filing.confirmedAt ?? filing.createdAt,
        title: "Filing failed",
        detail: period,
        filingType: filing.filingType,
      });
    }
  }

  // Notification events
  for (const notification of notifications) {
    events.push({
      id: `notification-${notification.id}`,
      type: "reminder_sent",
      date: notification.sentAt,
      title: "Reminder sent",
      detail: humanizeNotificationType(notification.type),
    });
  }

  // Sort descending by date (most recent first)
  events.sort((a, b) => b.date.getTime() - a.date.getTime());

  return events;
}
