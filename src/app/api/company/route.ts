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
  const { companyRegistrationNumber, uniqueTaxReference, registeredForCorpTax, shareCapital } = body;

  if (!companyRegistrationNumber) {
    return NextResponse.json({ error: "Registration number is required" }, { status: 400 });
  }

  // Fetch company details from Companies House (server-side verification)
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Company lookup is not configured" }, { status: 503 });
  }

  const paddedNumber = companyRegistrationNumber.trim().padStart(8, "0");
  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");

  let companyName: string;
  let accountingPeriodEnd: string;
  let accountingPeriodStart: string;
  try {
    const chRes = await fetch(
      `${process.env.COMPANY_INFORMATION_API_ENDPOINT}/company/${encodeURIComponent(paddedNumber)}`,
      { headers: { Authorization: `Basic ${basicAuth}` } }
    );

    if (chRes.status === 404) {
      return NextResponse.json({ error: "No company found with that registration number" }, { status: 400 });
    }
    if (!chRes.ok) {
      return NextResponse.json({ error: "Failed to verify company with Companies House" }, { status: 502 });
    }

    const chData = await chRes.json();
    companyName = chData.company_name;

    const nextAccounts = chData.accounts?.next_accounts;
    if (!nextAccounts?.period_end_on) {
      return NextResponse.json(
        { error: "Companies House has no upcoming accounting period for this company" },
        { status: 400 }
      );
    }

    accountingPeriodStart = nextAccounts.period_start_on;
    accountingPeriodEnd = nextAccounts.period_end_on;
  } catch {
    return NextResponse.json({ error: "Failed to connect to Companies House" }, { status: 502 });
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
  const periodStart = new Date(accountingPeriodStart);

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
        shareCapital: typeof shareCapital === "number" && shareCapital >= 0 ? Math.round(shareCapital) : 0,
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
