import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateAccountsDeadline, calculateCT600Deadline, calculateNextReminderDate } from "@/lib/utils";
import { canAddCompany } from "@/lib/subscription";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const activeCompanyCount = await prisma.company.count({
    where: { userId: session.user.id, deletedAt: null },
  });

  // Allow first company for new users (they pick a plan after)
  const isFirstCompany = activeCompanyCount === 0 && user.subscriptionTier === "none";

  if (!isFirstCompany && !canAddCompany(user.subscriptionTier, activeCompanyCount)) {
    return NextResponse.json(
      { error: "You have reached the company limit for your plan. Upgrade to add more companies." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { companyName, companyRegistrationNumber, uniqueTaxReference, accountingPeriodEnd, registeredForCorpTax } = body;

  if (!companyName || !companyRegistrationNumber || !accountingPeriodEnd) {
    return NextResponse.json({ error: "Company name, registration number, and accounting period are required" }, { status: 400 });
  }

  if (registeredForCorpTax && !uniqueTaxReference) {
    return NextResponse.json({ error: "UTR is required for companies registered for Corporation Tax" }, { status: 400 });
  }

  // Check for duplicate company
  const duplicate = await prisma.company.findFirst({
    where: {
      userId: session.user.id,
      companyRegistrationNumber: companyRegistrationNumber.trim(),
      deletedAt: null,
    },
  });

  if (duplicate) {
    return NextResponse.json(
      { error: "This company is already on your account." },
      { status: 409 }
    );
  }

  const periodEnd = new Date(accountingPeriodEnd);
  const now = new Date();
  const twoYearsAgo = new Date();
  twoYearsAgo.setUTCFullYear(twoYearsAgo.getUTCFullYear() - 2);

  if (periodEnd > now) {
    return NextResponse.json(
      { error: "Accounting period end date cannot be in the future." },
      { status: 400 }
    );
  }

  if (periodEnd < twoYearsAgo) {
    return NextResponse.json(
      { error: "Accounting period end date cannot be more than 2 years in the past." },
      { status: 400 }
    );
  }

  // Derive accountingPeriodStart: periodEnd - 1 year + 1 day
  const periodStart = new Date(periodEnd);
  periodStart.setUTCFullYear(periodStart.getUTCFullYear() - 1);
  periodStart.setUTCDate(periodStart.getUTCDate() + 1);

  const accountsDeadline = calculateAccountsDeadline(periodEnd);
  const accountsReminderAt = calculateNextReminderDate(accountsDeadline, 0);

  const reminderData: Array<{
    filingType: "accounts" | "ct600";
    filingDeadline: Date;
    remindersSent: number;
    nextReminderAt: Date | null;
  }> = [
    {
      filingType: "accounts",
      filingDeadline: accountsDeadline,
      remindersSent: 0,
      nextReminderAt: accountsReminderAt,
    },
  ];

  if (registeredForCorpTax) {
    const ct600Deadline = calculateCT600Deadline(periodEnd);
    const ct600ReminderAt = calculateNextReminderDate(ct600Deadline, 0);
    reminderData.push({
      filingType: "ct600",
      filingDeadline: ct600Deadline,
      remindersSent: 0,
      nextReminderAt: ct600ReminderAt,
    });
  }

  try {
    const company = await prisma.company.create({
      data: {
        userId: session.user.id,
        companyName,
        companyRegistrationNumber: companyRegistrationNumber.trim(),
        uniqueTaxReference: registeredForCorpTax ? uniqueTaxReference : null,
        registeredForCorpTax: !!registeredForCorpTax,
        accountingPeriodStart: periodStart,
        accountingPeriodEnd: periodEnd,
        reminders: {
          create: reminderData,
        },
      },
    });

    return NextResponse.json({ id: company.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This company is already on your account." },
        { status: 409 }
      );
    }
    throw error;
  }
}
