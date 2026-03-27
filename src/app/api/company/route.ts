import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateFilingDeadline, calculateNextReminderDate } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.company.findUnique({
    where: { userId: session.user.id },
  });

  if (existing) {
    return NextResponse.json({ error: "Company already exists for this account" }, { status: 409 });
  }

  const body = await req.json();
  const { companyName, companyRegistrationNumber, uniqueTaxReference, accountingPeriodEnd } = body;

  if (!companyName || !companyRegistrationNumber || !uniqueTaxReference || !accountingPeriodEnd) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  const periodEnd = new Date(accountingPeriodEnd);

  // Derive accountingPeriodStart: periodEnd - 1 year + 1 day
  const periodStart = new Date(periodEnd);
  periodStart.setUTCFullYear(periodStart.getUTCFullYear() - 1);
  periodStart.setUTCDate(periodStart.getUTCDate() + 1);

  const filingDeadline = calculateFilingDeadline(periodEnd);
  const nextReminderAt = calculateNextReminderDate(filingDeadline, 0);

  const company = await prisma.company.create({
    data: {
      userId: session.user.id,
      companyName,
      companyRegistrationNumber,
      uniqueTaxReference,
      accountingPeriodStart: periodStart,
      accountingPeriodEnd: periodEnd,
      reminders: {
        create: {
          filingDeadline,
          remindersSent: 0,
          nextReminderAt,
        },
      },
    },
  });

  return NextResponse.json({ id: company.id }, { status: 201 });
}
