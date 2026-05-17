import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import {
  buildReminderEmail,
  buildLapsedComplianceEmail,
  type ReminderSection,
} from "@/lib/email/templates";
import { isFilingLive } from "@/lib/launch-mode";
import { generateMuteUrl } from "@/lib/email/mute-token";
import {
  classifyComplianceCohort,
  decideLapsedNotificationType,
} from "@/lib/lapsed-compliance";
import { crossedTier } from "@/lib/reminder-tiers";

const SIX_YEARS_MS = 6 * 365.25 * 24 * 60 * 60 * 1000;

/**
 * Returns the notification type for a filing's current tier, or null
 * if the filing hasn't crossed any tier threshold yet.
 *
 * For a filing at 25 days until deadline, the current tier is "due_30"
 * (the most recently crossed threshold). For 10 days overdue, it's "overdue_7".
 *
 * Tier arithmetic is the shared `crossedTier` (src/lib/reminder-tiers.ts) so
 * this stays in lock-step with the lapsed track; only the `reminder_` prefix
 * is local here.
 */
function getCurrentTierType(daysUntilDeadline: number): string | null {
  const t = crossedTier(daysUntilDeadline);
  return t ? `reminder_${t.kind}_${t.days}` : null;
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

  if (!isFilingLive()) {
    return NextResponse.json({ sent: 0, skipped: "filing not live" });
  }

  const now = new Date();
  const sixYearsAgo = new Date(now.getTime() - SIX_YEARS_MS);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dormantfile.co.uk";

  const filings = await prisma.filing.findMany({
    where: {
      status: "outstanding",
      filingType: "accounts",
      suppressedAt: null,
      deadline: { not: null },
      periodEnd: { gt: sixYearsAgo },
      company: {
        // Soft-deleted companies are silenced entirely (Stop). The
        // active/cancelling restriction is intentionally REMOVED so the
        // Lapsed cohort (past_due / cancelled / none) also loads here; the
        // per-filing classification below splits Covered vs Lapsed so the
        // existing reminder path stays byte-for-byte unchanged.
        deletedAt: null,
        // Struck off / dissolved companies are silenced entirely — no
        // reminders and no win-back, for both the Covered and Lapsed
        // cohorts. Resumes automatically when the daily resync clears
        // the flag on reinstatement.
        companyGoneAt: null,
        user: {
          // Honouring an explicit reminder-email opt-out for both the
          // reminder and the win-back stream (same email channel).
          remindersMuted: false,
        },
      },
    },
    include: {
      company: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              subscriptionStatus: true,
            },
          },
        },
      },
      notifications: true,
    },
  });

  // Split by compliance cohort. Covered → existing reminder path, UNCHANGED.
  // Lapsed → honest reactivate-only win-back track. Stop → nothing.
  const coveredFilings: typeof filings = [];
  const lapsedFilings: typeof filings = [];
  for (const filing of filings) {
    const cohort = classifyComplianceCohort({
      subscriptionStatus: filing.company.user.subscriptionStatus,
      companyDeleted: filing.company.deletedAt != null,
      filingStatus: filing.status,
      hasObligation: true, // query already restricts to live obligations
    });
    if (cohort === "Covered") coveredFilings.push(filing);
    else if (cohort === "Lapsed") lapsedFilings.push(filing);
    // cohort === "Stop" → skip entirely
  }

  // Group Covered filings by user (existing reminder path — UNCHANGED).
  const userMap = new Map<
    string,
    {
      email: string;
      name: string;
      filings: typeof filings;
    }
  >();

  for (const filing of coveredFilings) {
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

  for (const [userId, userData] of userMap.entries()) {
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
      const deadline = filing.deadline!;
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
      const unsubscribeUrl = generateMuteUrl(userId);

      const { subject, html } = buildReminderEmail({
        userName: userData.name,
        dashboardUrl: `${appUrl}/dashboard`,
        sections: emailSections,
        unsubscribeUrl,
      });

      await sendEmail({
        to: userData.email,
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

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

  // ── Lapsed win-back track ──────────────────────────────────────────────
  // Honest, reactivate-only. Same per-user consolidation and the SAME
  // notification-history idempotency + createMany dedupe as above, but the
  // tier/cap/grace decision is delegated to decideLapsedNotificationType
  // and the copy is the lapsed compliance template.
  const lapsedUserMap = new Map<
    string,
    {
      email: string;
      name: string;
      filings: typeof filings;
    }
  >();

  for (const filing of lapsedFilings) {
    const userId = filing.company.user.id;
    if (!lapsedUserMap.has(userId)) {
      lapsedUserMap.set(userId, {
        email: filing.company.user.email,
        name: filing.company.user.name,
        filings: [],
      });
    }
    lapsedUserMap.get(userId)!.filings.push(filing);
  }

  for (const [userId, userData] of lapsedUserMap.entries()) {
    const items: Array<{
      companyName: string;
      deadline: Date;
      daysUntilDeadline: number;
      filingId: string;
      companyId: string;
      notificationType: string;
    }> = [];

    for (const filing of userData.filings) {
      const deadline = filing.deadline!;
      const daysUntilDeadline = Math.floor(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      const notificationType = decideLapsedNotificationType({
        subscriptionStatus: filing.company.user.subscriptionStatus,
        companyDeleted: filing.company.deletedAt != null,
        filingStatus: filing.status,
        daysUntilDeadline,
        existingTypes: filing.notifications.map((n) => n.type),
      });
      if (!notificationType) continue;

      items.push({
        companyName: filing.company.companyName,
        deadline,
        daysUntilDeadline,
        filingId: filing.id,
        companyId: filing.companyId,
        notificationType,
      });
    }

    if (items.length === 0) continue;

    try {
      const { subject, html } = buildLapsedComplianceEmail({
        userName: userData.name,
        reactivateUrl: `${appUrl}/settings/billing`,
        companies: items.map((i) => ({
          companyName: i.companyName,
          deadline: i.deadline,
          daysUntilDeadline: i.daysUntilDeadline,
        })),
      });

      const unsubscribeUrl = generateMuteUrl(userId);

      await sendEmail({
        to: userData.email,
        subject,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      // Same dedupe pattern: one row per (filing, lapsed-tier) so a tier
      // never re-sends and the per-period cap is enforced via history.
      await prisma.notification.createMany({
        data: items.map((item) => ({
          companyId: item.companyId,
          filingId: item.filingId,
          type: item.notificationType,
        })),
      });

      sent++;
    } catch {
      // Continue to next user on error
    }
  }

  return NextResponse.json({ sent });
}
