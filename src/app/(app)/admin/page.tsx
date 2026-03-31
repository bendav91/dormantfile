import Link from "next/link";
import { getAttentionCounts, getHealthStats, getRecentActivity } from "@/lib/admin";
import {
  AlertTriangle,
  XCircle,
  CreditCard,
  MessageSquare,
  Star,
  UserPlus,
  FileText,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard — Admin",
};

export default async function AdminDashboardPage() {
  const [attention, health, activity] = await Promise.all([
    getAttentionCounts(),
    getHealthStats(),
    getRecentActivity(),
  ]);

  const attentionCards = [
    {
      label: "Stuck filings",
      count: attention.stuckFilings,
      href: "/admin/filings?status=stuck",
      icon: AlertTriangle,
      severity: "red" as const,
    },
    {
      label: "Rejected filings",
      count: attention.rejectedFilings,
      href: "/admin/filings?status=rejected",
      icon: XCircle,
      severity: "red" as const,
    },
    {
      label: "Failed payments",
      count: attention.failedPayments,
      href: "/admin/customers?filter=past_due",
      icon: CreditCard,
      severity: "yellow" as const,
    },
    {
      label: "Pending reviews",
      count: attention.pendingReviews,
      href: "/admin/reviews",
      icon: Star,
      severity: "yellow" as const,
    },
    {
      label: "Unread messages",
      count: attention.unreadMessages,
      href: "/admin/messages",
      icon: MessageSquare,
      severity: "yellow" as const,
    },
  ];

  const severityClasses = {
    red: { card: "bg-danger-bg border-danger-border text-danger", text: "text-danger" },
    yellow: { card: "bg-warning-bg border-warning-border text-warning", text: "text-warning" },
    none: { card: "bg-card border-border text-muted", text: "text-muted" },
  };

  const activityIcons: Record<string, typeof UserPlus> = {
    signup: UserPlus,
    filing: FileText,
    message: Mail,
  };

  return (
    <div>
      {/* Attention Cards */}
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        Needs attention
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
        {attentionCards.map((card) => {
          const Icon = card.icon;
          const classes = card.count > 0 ? severityClasses[card.severity] : severityClasses.none;
          return (
            <Link
              key={card.label}
              href={card.href}
              className={cn("p-4 rounded-xl transition-colors duration-150 no-underline border", classes.card)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={classes.text} />
                <span className={cn("text-xs font-medium", classes.text)}>
                  {card.label}
                </span>
              </div>
              <p className={cn("text-2xl font-bold", classes.text)}>
                {card.count}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Health Stats */}
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        Overview
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs font-medium mb-1 text-muted">
            Active subscribers
          </p>
          <p className="text-2xl font-bold text-foreground">
            {health.totalSubscribers}
          </p>
          <p className="text-xs mt-1 text-muted">
            {health.tiers.basic} basic, {health.tiers.multi} multi, {health.tiers.agent} agent
          </p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs font-medium mb-1 text-muted">
            Total companies
          </p>
          <p className="text-2xl font-bold text-foreground">
            {health.totalCompanies}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs font-medium mb-1 text-muted">
            Filed this month
          </p>
          <p className="text-2xl font-bold text-foreground">
            {health.filingsThisMonth}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-card border border-border">
          <p className="text-xs font-medium mb-1 text-muted">
            MRR
          </p>
          <p className="text-2xl font-bold text-foreground">
            &pound;{health.mrr}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <h2 className="text-lg font-semibold mb-4 text-foreground">
        Recent activity
      </h2>
      {activity.length === 0 ? (
        <p className="text-sm text-muted">
          No recent activity.
        </p>
      ) : (
        <div className="rounded-xl overflow-hidden bg-card border border-border">
          {activity.map((item, i) => {
            const Icon = activityIcons[item.type] || FileText;
            return (
              <Link
                key={`${item.type}-${i}`}
                href={item.link}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-colors duration-150 hoverable-subtle no-underline",
                  i < activity.length - 1 && "border-b border-border"
                )}
              >
                <Icon size={14} className="text-muted" />
                <span className="text-sm flex-1 text-body">
                  {item.description}
                </span>
                <span className="text-xs text-muted">
                  {formatRelative(item.timestamp)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
