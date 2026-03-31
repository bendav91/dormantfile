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

  const severityColours = {
    red: { bg: "var(--color-danger-bg)", text: "var(--color-danger)", border: "rgba(220, 38, 38, 0.2)" },
    yellow: { bg: "var(--color-warning-bg)", text: "var(--color-warning)", border: "rgba(202, 138, 4, 0.2)" },
    none: { bg: "var(--color-bg-card)", text: "var(--color-text-muted)", border: "var(--color-border)" },
  };

  const activityIcons: Record<string, typeof UserPlus> = {
    signup: UserPlus,
    filing: FileText,
    message: Mail,
  };

  return (
    <div>
      {/* Attention Cards */}
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Needs attention
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
        {attentionCards.map((card) => {
          const Icon = card.icon;
          const colours = card.count > 0 ? severityColours[card.severity] : severityColours.none;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="p-4 rounded-xl transition-colors duration-150"
              style={{
                backgroundColor: colours.bg,
                border: `1px solid ${colours.border}`,
                textDecoration: "none",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color: colours.text }} />
                <span className="text-xs font-medium" style={{ color: colours.text }}>
                  {card.label}
                </span>
              </div>
              <p className="text-2xl font-bold" style={{ color: colours.text }}>
                {card.count}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Health Stats */}
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Overview
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            Active subscribers
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {health.totalSubscribers}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            {health.tiers.basic} basic, {health.tiers.multi} multi, {health.tiers.agent} agent
          </p>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            Total companies
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {health.totalCompanies}
          </p>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            Filed this month
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {health.filingsThisMonth}
          </p>
        </div>
        <div
          className="p-4 rounded-xl"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>
            MRR
          </p>
          <p className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            &pound;{health.mrr}
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
        Recent activity
      </h2>
      {activity.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          No recent activity.
        </p>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ backgroundColor: "var(--color-bg-card)", border: "1px solid var(--color-border)" }}
        >
          {activity.map((item, i) => {
            const Icon = activityIcons[item.type] || FileText;
            return (
              <Link
                key={`${item.type}-${i}`}
                href={item.link}
                className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hoverable-subtle"
                style={{
                  borderBottom: i < activity.length - 1 ? "1px solid var(--color-border)" : "none",
                  textDecoration: "none",
                }}
              >
                <Icon size={14} style={{ color: "var(--color-text-muted)" }} />
                <span className="text-sm flex-1" style={{ color: "var(--color-text-body)" }}>
                  {item.description}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
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
