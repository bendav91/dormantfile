import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canAddCompany } from "@/lib/subscription";
import { Prisma } from "@prisma/client";
import {
  fetchFilingHistory,
  detectAccountsGaps,
} from "@/lib/companies-house/filing-history";
import type { GapDetectionResult } from "@/lib/companies-house/filing-history";
import { materialiseFilings } from "@/lib/companies-house/materialise-filings";

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
      { status: 403 },
    );
  }

  const body = await req.json();
  const { companyRegistrationNumber, uniqueTaxReference, registeredForCorpTax, shareCapital } =
    body;

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
  let dateOfCreation: string | undefined;
  let accountsDueOn: string | undefined;
  let nextAccountsPeriodEndOn: string | undefined;
  let companyStatus: string | undefined;
  let companyType: string | undefined;
  let registeredAddress: string | undefined;
  let sicCodes: string | undefined;
  let ardMonth: number | null = null;
  let ardDay: number | null = null;
  let gapResult: GapDetectionResult | null = null;
  try {
    const chRes = await fetch(
      `${process.env.COMPANY_INFORMATION_API_ENDPOINT}/company/${encodeURIComponent(paddedNumber)}`,
      { headers: { Authorization: `Basic ${basicAuth}` } },
    );

    if (chRes.status === 404) {
      return NextResponse.json(
        { error: "No company found with that registration number" },
        { status: 400 },
      );
    }
    if (!chRes.ok) {
      return NextResponse.json(
        { error: "Failed to verify company with Companies House" },
        { status: 502 },
      );
    }

    const chData = await chRes.json();
    companyName = chData.company_name;
    companyStatus = chData.company_status;
    companyType = chData.type;
    dateOfCreation = chData.date_of_creation;

    // Build formatted address
    const addr = chData.registered_office_address;
    if (addr) {
      registeredAddress = [
        addr.address_line_1,
        addr.address_line_2,
        addr.locality,
        addr.region,
        addr.postal_code,
      ]
        .filter(Boolean)
        .join(", ");
    }

    // SIC codes as comma-separated string
    if (Array.isArray(chData.sic_codes) && chData.sic_codes.length > 0) {
      sicCodes = chData.sic_codes.join(",");
    }

    if (companyStatus === "dissolved" || companyStatus === "converted-closed") {
      return NextResponse.json(
        {
          error:
            "This company has been dissolved and cannot be added. DormantFile is for active dormant companies only.",
        },
        { status: 400 },
      );
    }

    const nextAccounts = chData.accounts?.next_accounts;
    accountsDueOn = nextAccounts?.due_on;
    nextAccountsPeriodEndOn = nextAccounts?.period_end_on;

    // Fetch filing history for gap detection (graceful degradation on failure)
    const filedPeriodEnds = await fetchFilingHistory(paddedNumber);

    // Parse accounting reference date (month/day)
    const ard = chData.accounts?.accounting_reference_date;
    if (ard?.month && ard?.day) {
      ardMonth = parseInt(ard.month, 10);
      ardDay = parseInt(ard.day, 10);
    } else if (nextAccounts?.period_end_on) {
      // Fallback: derive ARD from next_accounts period end
      const fallbackDate = new Date(nextAccounts.period_end_on);
      ardMonth = fallbackDate.getUTCMonth() + 1;
      ardDay = fallbackDate.getUTCDate();
    }

    // Attempt gap detection
    if (dateOfCreation && ardMonth && ardDay && !isNaN(ardMonth) && !isNaN(ardDay)) {
      gapResult = detectAccountsGaps(dateOfCreation, ardMonth, ardDay, filedPeriodEnds);
    }

    if (gapResult?.oldestUnfiledPeriodStart && gapResult.oldestUnfiledPeriodEnd) {
      // Gaps detected — use the true oldest unfiled period
      accountingPeriodStart = gapResult.oldestUnfiledPeriodStart.toISOString().split("T")[0];
      accountingPeriodEnd = gapResult.oldestUnfiledPeriodEnd.toISOString().split("T")[0];
    } else if (nextAccounts?.period_end_on) {
      // No gaps (or gap detection couldn't run) — use CH's next_accounts
      accountingPeriodStart = nextAccounts.period_start_on;
      accountingPeriodEnd = nextAccounts.period_end_on;
    } else {
      return NextResponse.json(
        {
          error:
            "Companies House has no upcoming accounting period for this company. It may already be filed or the company may be dissolved.",
        },
        { status: 400 },
      );
    }
  } catch {
    return NextResponse.json({ error: "Failed to connect to Companies House" }, { status: 502 });
  }

  if (registeredForCorpTax && !uniqueTaxReference) {
    return NextResponse.json(
      { error: "UTR is required for companies registered for Corporation Tax" },
      { status: 400 },
    );
  }

  // Check for duplicate active company
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
      { status: 409 },
    );
  }

  const periodEnd = new Date(accountingPeriodEnd);
  const periodStart = new Date(accountingPeriodStart);

  // Check if a soft-deleted record exists for this company — restore it instead of creating a new row
  // (the unique constraint on [userId, companyRegistrationNumber] prevents creating a second row)
  const softDeleted = await prisma.company.findFirst({
    where: {
      userId: session.user.id,
      companyRegistrationNumber: companyRegistrationNumber.trim(),
      deletedAt: { not: null },
    },
  });

  try {
    if (softDeleted) {
      // Delete old filings (seeded ones without correlationId) and outstanding ones
      await prisma.filing.deleteMany({
        where: {
          companyId: softDeleted.id,
          OR: [{ status: "accepted", correlationId: null }, { status: "outstanding" }],
        },
      });

      const company = await prisma.company.update({
        where: { id: softDeleted.id },
        data: {
          companyName,
          uniqueTaxReference: registeredForCorpTax ? uniqueTaxReference : null,
          registeredForCorpTax: !!registeredForCorpTax,
          shareCapital:
            typeof shareCapital === "number" && shareCapital >= 0 ? Math.round(shareCapital) : 0,
          accountingPeriodStart: periodStart,
          accountingPeriodEnd: periodEnd,
          dateOfCreation: dateOfCreation ? new Date(dateOfCreation) : null,
          accountsDueOn: accountsDueOn ? new Date(accountsDueOn) : null,
          companyStatus: companyStatus ?? null,
          companyType: companyType ?? null,
          registeredAddress: registeredAddress ?? null,
          sicCodes: sicCodes ?? null,
          ardMonth,
          ardDay,
          deletedAt: null,
        },
      });

      await materialiseFilings({
        companyId: softDeleted.id,
        dateOfCreation,
        gapResult,
        ardMonth,
        ardDay,
        registeredForCorpTax: !!registeredForCorpTax,
        accountsDueOn,
        nextAccountsPeriodEndOn,
        // Preserve the company's CT anchor across soft-delete restore so the
        // regenerated CTAP chain matches every other generator path.
        ctapStartDate: softDeleted.ctapStartDate,
      });

      return NextResponse.json({ id: company.id }, { status: 201 });
    }

    const company = await prisma.company.create({
      data: {
        userId: session.user.id,
        companyName,
        companyRegistrationNumber: companyRegistrationNumber.trim(),
        uniqueTaxReference: registeredForCorpTax ? uniqueTaxReference : null,
        registeredForCorpTax: !!registeredForCorpTax,
        shareCapital:
          typeof shareCapital === "number" && shareCapital >= 0 ? Math.round(shareCapital) : 0,
        accountingPeriodStart: periodStart,
        accountingPeriodEnd: periodEnd,
        dateOfCreation: dateOfCreation ? new Date(dateOfCreation) : null,
        accountsDueOn: accountsDueOn ? new Date(accountsDueOn) : null,
        companyStatus: companyStatus ?? null,
        companyType: companyType ?? null,
        registeredAddress: registeredAddress ?? null,
        sicCodes: sicCodes ?? null,
        ardMonth,
        ardDay,
      },
    });

    await materialiseFilings({
      companyId: company.id,
      dateOfCreation,
      gapResult,
      ardMonth,
      ardDay,
      registeredForCorpTax: !!registeredForCorpTax,
      accountsDueOn,
      nextAccountsPeriodEndOn,
      // Newly created company has no CT anchor yet (null) — pass the real
      // value so this path matches every other generator.
      ctapStartDate: company.ctapStartDate,
    });

    return NextResponse.json({ id: company.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "This company is already on your account." },
        { status: 409 },
      );
    }
    throw error;
  }
}
