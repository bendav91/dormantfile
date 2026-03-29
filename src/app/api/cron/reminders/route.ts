import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { buildReminderEmail, type ReminderSection } from "@/lib/email/templates";
import { isPreviewMode } from "@/lib/launch-mode";

// Upcoming: remind at these days-before-deadline thresholds.
// Overdue: remind at these days-after-deadline thresholds.
const UPCOMING_TIERS = [90, 30, 14, 7, 3, 1] as const;
const OVERDUE_TIERS = [1, 7, 30, 90] as const;

const SIX_YEARS_MS = 6 * 365.25 * 24 * 60 * 60 * 1000;

/**
 * Returns the notification type for a filing's current tier, or null
 * if the filing hasn't crossed any tier threshold yet.
 *
 * For a filing at 25 days until deadline, the current tier is "due_30"
 * (the most recently crossed threshold). For 10 days overdue, it's "overdue_7".
 */
function getCurrentTierType(daysUntilDeadline: number): string | null {
  if (daysUntilDeadline >= 0) {
    let matched: number | null = null;
    for (const tier of UPCOMING_TIERS) {
      if (daysUntilDeadline <= tier) matched = tier;
    }
    return matched !== null ? `reminder_due_${matched}` : null;
  } else {
    const daysOverdue = -daysUntilDeadline;
    let matched: number | null = null;
    for (const tier of OVERDUE_TIERS) {
      if (daysOverdue >= tier) matched = tier;
    }
    return matched !== null ? `reminder_overdue_${matched}` : null;
  }
}

function tierLabel(tierType: string): { heading: string; isOverdue: boolean; sortOrder: number } {
  const isOverdue = tierType.startsWith("reminder_overdue_");
  const days = parseInt(tierType.split("_").pop()!);
  if (isOverdue) {
    return {
      heading: `Overdue: ${days}+ days past deadline`,
      isOverdue: true,
      sortOrder: -days, // most overdue first
    };
  }
  return {
    heading: `Due within ${days} days`,
    isOverdue: false,
    sortOrder: days, // most urgent first
  };
}

/**
 * Daily cron (08:00) — sends one consolidated reminder email per user.
 *
 * For each user, checks all their outstanding non-suppressed accounts filings,
 * determines which tier each has reached, and if any filings have a new
 * (unnotified) tier, sends a single email grouping companies by tier.
 *
 * Skips blocked territory (6+ years overdue). Runs after resync-filings (07:00)
 * and create-periods (07:30) so data is fresh.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isPreviewMode) {
    return NextResponse.json({ sent: 0, skipped: "preview mode" });
  }

  const now = new Date();
  const sixYearsAgo = new Date(now.getTime() - SIX_YEARS_MS);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dormantfile.com";

  const filings = await prisma.filing.findMany({
    where: {
      status: "outstanding",
      filingType: "accounts",
      suppressedAt: null,
      accountsDeadline: { not: null },
      periodEnd: { gt: sixYearsAgo },
      company: {
        deletedAt: null,
        user: { subscriptionStatus: { in: ["active", "cancelling"] } },
      },
    },
    include: {
      company: {
        include: { user: { select: { id: true, email: true, name: true } } },
      },
      notifications: true,
    },
  });

  // Group filings by user
  const userMap = new Map<
    string,
    {
      email: string;
      name: string;
      filings: typeof filings;
    }
  >();

  for (const filing of filings) {
    const userId = filing.company.user.id;
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        email: filing.company.user.email,
        name: filing.company.user.name,
        filings: [],
      });
    }
    userMap.get(userId)!.filings.push(filing);
  }

  let sent = 0;

  for (const userData of userMap.values()) {
    // For each filing, check if its current tier needs a notification
    const sectionMap = new Map<
      string,
      {
        heading: string;
        isOverdue: boolean;
        sortOrder: number;
        items: Array<{
          companyName: string;
          deadline: Date;
          daysUntilDeadline: number;
          fileUrl: string;
          filingId: string;
          companyId: string;
          notificationType: string;
        }>;
      }
    >();

    for (const filing of userData.filings) {
      const deadline = filing.accountsDeadline!;
      const daysUntilDeadline = Math.floor(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const tierType = getCurrentTierType(daysUntilDeadline);
      if (!tierType) continue;

      const alreadyNotified = filing.notifications.some((n) => n.type === tierType);
      if (alreadyNotified) continue;

      if (!sectionMap.has(tierType)) {
        sectionMap.set(tierType, { ...tierLabel(tierType), items: [] });
      }

      sectionMap.get(tierType)!.items.push({
        companyName: filing.company.companyName,
        deadline,
        daysUntilDeadline,
        fileUrl: `${appUrl}/file/${filing.companyId}/accounts`,
        filingId: filing.id,
        companyId: filing.companyId,
        notificationType: tierType,
      });
    }

    if (sectionMap.size === 0) continue;

    // Sort: overdue first (most overdue), then upcoming (most urgent)
    const sortedSections = [...sectionMap.values()].sort((a, b) => a.sortOrder - b.sortOrder);

    const emailSections: ReminderSection[] = sortedSections.map((s) => ({
      heading: s.heading,
      isOverdue: s.isOverdue,
      companies: s.items.map((i) => ({
        companyName: i.companyName,
        deadline: i.deadline,
        daysUntilDeadline: i.daysUntilDeadline,
        fileUrl: i.fileUrl,
      })),
    }));

    try {
      const { subject, html } = buildReminderEmail({
        userName: userData.name,
        dashboardUrl: `${appUrl}/dashboard`,
        sections: emailSections,
      });

      await sendEmail({ to: userData.email, subject, html });

      // Record one notification per filing so we don't re-send this tier
      await prisma.notification.createMany({
        data: sortedSections.flatMap((s) =>
          s.items.map((item) => ({
            companyId: item.companyId,
            filingId: item.filingId,
            type: item.notificationType,
          })),
        ),
      });

      sent++;
    } catch {
      // Continue to next user on error
    }
  }

  return NextResponse.json({ sent });
}
