import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resend } from "@/lib/email/client";
import { buildReminderEmail } from "@/lib/email/templates";
import { calculateNextReminderDate } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = new Date();

  const reminders = await prisma.reminder.findMany({
    where: {
      nextReminderAt: {
        not: null,
        lte: today,
      },
      company: {
        user: {
          subscriptionStatus: { in: ["active", "cancelling"] },
        },
      },
    },
    include: {
      company: {
        include: { user: true },
      },
    },
  });

  let sent = 0;

  for (const reminder of reminders) {
    const daysUntilDeadline = Math.floor(
      (reminder.filingDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilDeadline < 0) {
      continue;
    }

    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dormantfile.com";
      const filingType = reminder.filingType as "accounts" | "ct600";
      const filePath = filingType === "accounts" ? "accounts" : "ct600";
      const fileUrl = `${appUrl}/file/${reminder.companyId}/${filePath}`;

      const { subject, html } = buildReminderEmail({
        companyName: reminder.company.companyName,
        daysUntilDeadline,
        filingDeadline: reminder.filingDeadline,
        fileUrl,
        filingType,
      });

      await resend.emails.send({
        from: "DormantFile <noreply@dormantfile.com>",
        to: reminder.company.user.email,
        subject,
        html,
      });

      const newRemindersSent = reminder.remindersSent + 1;
      const nextReminderAt = calculateNextReminderDate(reminder.filingDeadline, newRemindersSent);

      await prisma.reminder.update({
        where: { id: reminder.id },
        data: {
          remindersSent: newRemindersSent,
          lastReminderSentAt: new Date(),
          nextReminderAt,
        },
      });

      sent++;
    } catch {
      // Continue to next reminder on error
    }
  }

  return NextResponse.json({ sent });
}
