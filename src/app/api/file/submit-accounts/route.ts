import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildAccountsXml } from "@/lib/companies-house/xml-builder";
import { submitToCompaniesHouse, pollCompaniesHouse } from "@/lib/companies-house/submission-client";
import { getCompanyLimit } from "@/lib/subscription";
import { rollForwardPeriod } from "@/lib/roll-forward";

const POLL_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 5_000;

function getPresenterCredentials() {
  const presenterId = process.env.COMPANIES_HOUSE_PRESENTER_ID;
  const presenterAuth = process.env.COMPANIES_HOUSE_PRESENTER_AUTH;

  if (!presenterId || !presenterAuth) {
    throw new Error("Companies House presenter credentials are not configured");
  }

  return { presenterId, presenterAuth };
}

function getFilingEndpoint(): string {
  const endpoint = process.env.COMPANIES_HOUSE_FILING_ENDPOINT;
  if (!endpoint) {
    throw new Error("COMPANIES_HOUSE_FILING_ENDPOINT is not configured");
  }
  return endpoint;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check subscription
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.subscriptionStatus !== "active") {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  // Count unique companies filed for in the current billing period
  const periodStart = user.subscriptionPeriodStart ?? user.createdAt;
  const filedCompanyIds = await prisma.filing.findMany({
    where: {
      company: { userId: session.user.id },
      status: { in: ["submitted", "polling_timeout", "accepted"] },
      createdAt: { gte: periodStart },
    },
    select: { companyId: true },
    distinct: ["companyId"],
  });
  const filingLimit = getCompanyLimit(user.subscriptionTier);
  const filingsUsed = filedCompanyIds.length;

  if (filingsUsed >= filingLimit) {
    return NextResponse.json(
      { error: `You have used all ${filingLimit} filing${filingLimit === 1 ? "" : "s"} for this billing period. Upgrade your plan to file for more companies.` },
      { status: 403 }
    );
  }

  let body: { companyId?: string; companyAuthCode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { companyId, companyAuthCode } = body;

  if (!companyId) {
    return NextResponse.json(
      { error: "companyId is required" },
      { status: 400 }
    );
  }

  if (!companyAuthCode || !/^[A-Za-z0-9]{6}$/.test(companyAuthCode)) {
    return NextResponse.json(
      { error: "A valid 6-character company authentication code is required" },
      { status: 400 }
    );
  }

  // Find company
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Clean up retryable filings (failed/rejected are terminal — safe to replace)
  // and stale pending filings (older than 5 minutes — never reached CH)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.filing.deleteMany({
    where: {
      companyId,
      filingType: "accounts",
      periodStart: company.accountingPeriodStart,
      periodEnd: company.accountingPeriodEnd,
      OR: [
        { status: { in: ["failed", "rejected"] } },
        { status: "pending", createdAt: { lt: fiveMinutesAgo } },
      ],
    },
  });

  // Idempotency check
  const existingFiling = await prisma.filing.findFirst({
    where: {
      companyId,
      filingType: "accounts",
      periodStart: company.accountingPeriodStart,
      periodEnd: company.accountingPeriodEnd,
      status: { in: ["submitted", "polling_timeout", "accepted"] },
    },
  });

  if (existingFiling) {
    return NextResponse.json(
      { error: "A filing for this period has already been submitted. Check your dashboard for the current status." },
      { status: 409 }
    );
  }

  // Create filing record with "pending" status
  const filing = await prisma.filing.create({
    data: {
      companyId,
      filingType: "accounts",
      periodStart: company.accountingPeriodStart,
      periodEnd: company.accountingPeriodEnd,
      status: "pending",
    },
  });

  let credentials: ReturnType<typeof getPresenterCredentials>;
  let endpoint: string;

  try {
    credentials = getPresenterCredentials();
    endpoint = getFilingEndpoint();
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server configuration error" },
      { status: 500 }
    );
  }

  // Build XML
  let accountsXml: string;
  try {
    accountsXml = buildAccountsXml(
      {
        companyName: company.companyName,
        companyRegistrationNumber: company.companyRegistrationNumber,
        periodStart: company.accountingPeriodStart,
        periodEnd: company.accountingPeriodEnd,
        companyAuthCode,
      },
      credentials
    );
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build submission" },
      { status: 500 }
    );
  }

  // Submit to Companies House
  let submissionId: string;
  let pollEndpoint: string;

  try {
    const submissionResult = await submitToCompaniesHouse(accountsXml, endpoint, credentials);
    submissionId = submissionResult.submissionId;
    pollEndpoint = submissionResult.pollEndpoint;
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit to Companies House" },
      { status: 502 }
    );
  }

  await prisma.filing.update({
    where: { id: filing.id },
    data: {
      status: "submitted",
      hmrcCorrelationId: submissionId,
      submittedAt: new Date(),
    },
  });

  // Poll for response
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    let pollResult: Awaited<ReturnType<typeof pollCompaniesHouse>>;

    try {
      pollResult = await pollCompaniesHouse(submissionId, pollEndpoint, credentials);
    } catch {
      // Transient poll error — keep trying until timeout
      continue;
    }

    if (pollResult.status === "accepted") {
      await prisma.filing.update({
        where: { id: filing.id },
        data: {
          status: "accepted",
          confirmedAt: new Date(),
          hmrcResponsePayload: pollResult.responsePayload,
        },
      });

      await rollForwardPeriod(
        companyId,
        company.accountingPeriodEnd,
        company.registeredForCorpTax,
        "accounts",
        user.email,
        company.companyName
      );

      return NextResponse.json({ status: "accepted", filingId: filing.id });
    }

    if (pollResult.status === "rejected") {
      await prisma.filing.update({
        where: { id: filing.id },
        data: {
          status: "rejected",
          hmrcResponsePayload: pollResult.responsePayload,
        },
      });

      return NextResponse.json({
        status: "rejected",
        filingId: filing.id,
        message: pollResult.message,
      });
    }

    // still processing — continue loop
  }

  // Timed out
  await prisma.filing.update({
    where: { id: filing.id },
    data: { status: "polling_timeout" },
  });

  return NextResponse.json({ status: "polling_timeout", filingId: filing.id });
}
