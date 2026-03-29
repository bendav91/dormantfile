import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  calculateAccountsDeadline,
  calculateCT600Deadline,
  calculateNextReminderDate,
} from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyId, periodEnd } = body;

  if (!companyId || !periodEnd) {
    return NextResponse.json({ error: "companyId and periodEnd are required" }, { status: 400 });
  }

  // Verify ownership
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const periodEndDate = new Date(periodEnd);

  await prisma.suppressedPeriod.upsert({
    where: { companyId_periodEnd: { companyId, periodEnd: periodEndDate } },
    create: { companyId, periodEnd: periodEndDate },
    update: {},
  });

  // If the suppressed period is the company's current period, delete its reminders
  if (company.accountingPeriodEnd.getTime() === periodEndDate.getTime()) {
    await prisma.reminder.deleteMany({ where: { companyId } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get("companyId");
  const periodEnd = searchParams.get("periodEnd");

  if (!companyId || !periodEnd) {
    return NextResponse.json({ error: "companyId and periodEnd are required" }, { status: 400 });
  }

  // Verify ownership
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const periodEndDate = new Date(periodEnd);

  await prisma.suppressedPeriod.deleteMany({
    where: { companyId, periodEnd: periodEndDate },
  });

  // If the unsuppressed period is the company's current period, recreate reminders
  if (company.accountingPeriodEnd.getTime() === periodEndDate.getTime()) {
    const accountsDeadline = calculateAccountsDeadline(periodEndDate);
    const reminders: Array<{
      companyId: string;
      filingType: "accounts" | "ct600";
      filingDeadline: Date;
      remindersSent: number;
      nextReminderAt: Date | null;
    }> = [
      {
        companyId,
        filingType: "accounts",
        filingDeadline: accountsDeadline,
        remindersSent: 0,
        nextReminderAt: calculateNextReminderDate(accountsDeadline, 0),
      },
    ];

    if (company.registeredForCorpTax) {
      const ct600Deadline = calculateCT600Deadline(periodEndDate);
      reminders.push({
        companyId,
        filingType: "ct600",
        filingDeadline: ct600Deadline,
        remindersSent: 0,
        nextReminderAt: calculateNextReminderDate(ct600Deadline, 0),
      });
    }

    await prisma.$transaction([
      prisma.reminder.deleteMany({ where: { companyId } }),
      ...reminders.map((r) => prisma.reminder.create({ data: r })),
    ]);
  }

  return NextResponse.json({ ok: true });
}
