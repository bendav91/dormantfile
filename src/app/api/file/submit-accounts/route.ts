import { authOptions } from "@/lib/auth";
import { submitToCompaniesHouse } from "@/lib/companies-house/submission-client";
import type { SubmissionConfig } from "@/lib/companies-house/xml-builder";
import { buildAccountsXml, mapCompanyType } from "@/lib/companies-house/xml-builder";
import { prisma } from "@/lib/db";
import { generateDormantAccountsIxbrl } from "@/lib/ixbrl/dormant-accounts";
import { FilingStatus } from "@prisma/client";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

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

  if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling") {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  let body: {
    companyId?: string;
    filingId?: string;
    companyAuthCode?: string;
    periodStart?: string;
    periodEnd?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { companyId, companyAuthCode } = body;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  if (!body.filingId && (!body.periodStart || !body.periodEnd)) {
    return NextResponse.json(
      { error: "Either filingId or periodStart and periodEnd are required" },
      { status: 400 },
    );
  }

  let targetPeriodStart: Date | undefined;
  let targetPeriodEnd: Date | undefined;

  if (body.periodStart && body.periodEnd) {
    targetPeriodStart = new Date(body.periodStart);
    targetPeriodEnd = new Date(body.periodEnd);

    if (isNaN(targetPeriodStart.getTime()) || isNaN(targetPeriodEnd.getTime())) {
      return NextResponse.json({ error: "Invalid period dates" }, { status: 400 });
    }
  }

  if (!companyAuthCode || !/^[A-Za-z0-9]{6,8}$/.test(companyAuthCode)) {
    return NextResponse.json(
      { error: "A valid 6-8 character company authentication code is required" },
      { status: 400 },
    );
  }

  // Find company
  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Validate the requested filing exists as outstanding.
  // Prefer filingId lookup (new path), fall back to period dates (backward compat).
  const outstandingFiling = body.filingId
    ? await prisma.filing.findFirst({
        where: {
          id: body.filingId,
          companyId,
          filingType: "accounts",
          status: "outstanding",
        },
      })
    : await prisma.filing.findFirst({
        where: {
          companyId,
          filingType: "accounts",
          periodStart: targetPeriodStart,
          periodEnd: targetPeriodEnd,
          status: "outstanding",
        },
      });
  if (!outstandingFiling) {
    return NextResponse.json({ error: "Invalid period for this company" }, { status: 400 });
  }

  // Resolve effective dates: prefer new columns, fall back to old
  const effectiveStart: Date = outstandingFiling.startDate ?? outstandingFiling.periodStart;
  const effectiveEnd: Date = outstandingFiling.endDate ?? outstandingFiling.periodEnd;

  const sixYearsAgo = new Date();
  sixYearsAgo.setUTCFullYear(sixYearsAgo.getUTCFullYear() - 6);
  if (effectiveEnd.getTime() <= sixYearsAgo.getTime()) {
    return NextResponse.json(
      {
        error:
          "This period is more than 6 years overdue. We recommend consulting an accountant or contacting HMRC and Companies House directly.",
      },
      { status: 400 },
    );
  }

  // Check company is still active at Companies House before filing
  const chApiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (chApiKey) {
    try {
      const chBasicAuth = Buffer.from(`${chApiKey}:`).toString("base64");
      const statusRes = await fetch(
        `${process.env.COMPANY_INFORMATION_API_ENDPOINT}/company/${encodeURIComponent(company.companyRegistrationNumber)}`,
        { headers: { Authorization: `Basic ${chBasicAuth}` } },
      );
      if (statusRes.ok) {
        const chData = await statusRes.json();
        if (chData.company_status === "dissolved" || chData.company_status === "converted-closed") {
          return NextResponse.json(
            {
              error:
                "This company has been dissolved at Companies House and can no longer file accounts.",
            },
            { status: 400 },
          );
        }
      }
    } catch {
      // Non-blocking: if the status check fails, allow the filing to proceed —
      // Companies House will reject it at submission if the company is dissolved.
    }
  }

  // Reset retryable filings back to outstanding so they can be resubmitted,
  // and reset stale pending filings (older than 5 minutes — never reached CH)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.filing.updateMany({
    where: {
      ...(body.filingId
        ? { id: body.filingId }
        : { periodStart: targetPeriodStart, periodEnd: targetPeriodEnd }),
      companyId,
      filingType: "accounts",
      OR: [
        { status: { in: [FilingStatus.failed, FilingStatus.rejected] } },
        { status: FilingStatus.pending, createdAt: { lt: fiveMinutesAgo } },
      ],
    },
    data: {
      status: "outstanding",
      correlationId: null,
      responsePayload: null,
      irmark: null,
      submittedAt: null,
      confirmedAt: null,
      submissionNumber: null,
    },
  });

  // Idempotency check
  const existingFiling = await prisma.filing.findFirst({
    where: {
      ...(body.filingId
        ? { id: body.filingId }
        : { periodStart: targetPeriodStart, periodEnd: targetPeriodEnd }),
      companyId,
      filingType: "accounts",
      status: {
        in: [FilingStatus.submitted, FilingStatus.accepted],
      },
    },
  });

  if (existingFiling) {
    return NextResponse.json(
      {
        error:
          "A filing for this period has already been submitted. Check your dashboard for the current status.",
      },
      { status: 409 },
    );
  }

  // Optimistic lock: transition outstanding -> pending atomically.
  // If count is 0 another request already claimed this filing.
  const lockResult = await prisma.filing.updateMany({
    where: { id: outstandingFiling.id, status: "outstanding" },
    data: { status: "pending" },
  });

  if (lockResult.count === 0) {
    return NextResponse.json({ error: "This filing is already being submitted" }, { status: 409 });
  }

  const filing = { ...outstandingFiling, status: "pending" as const };

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
      { status: 500 },
    );
  }

  // Generate submission number (6 chars, zero-padded, globally unique per presenter)
  let submissionNumber: string;
  try {
    submissionNumber = await prisma.$transaction(async (tx) => {
      const last = await tx.filing.findFirst({
        where: { submissionNumber: { not: null }, filingType: "accounts" },
        orderBy: { submissionNumber: "desc" },
        select: { submissionNumber: true },
      });
      const nextNum = last?.submissionNumber ? parseInt(last.submissionNumber, 10) + 1 : 1;
      return String(nextNum).padStart(6, "0");
    });
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate submission number" },
      { status: 500 },
    );
  }

  const submissionConfig: SubmissionConfig = {
    packageReference: process.env.CH_PACKAGE_REFERENCE ?? "0012",
    isTest: process.env.CH_GATEWAY_TEST === "1",
  };

  // Generate iXBRL accounts document
  const accountsIxbrl = generateDormantAccountsIxbrl({
    companyName: company.companyName,
    companyRegistrationNumber: company.companyRegistrationNumber,
    periodStart: effectiveStart,
    periodEnd: effectiveEnd,
    directorName: user.name,
    shareCapital: company.shareCapital,
  });

  // Build XML
  let accountsXml: string;
  try {
    accountsXml = buildAccountsXml(
      {
        companyName: company.companyName,
        companyRegistrationNumber: company.companyRegistrationNumber,
        companyType: mapCompanyType(company.companyType),
        periodEnd: effectiveEnd,
        companyAuthCode,
        accountsIxbrl,
        submissionNumber,
      },
      credentials,
      submissionConfig,
    );
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to build submission" },
      { status: 500 },
    );
  }

  // Submit to Companies House
  try {
    const submissionResult = await submitToCompaniesHouse(accountsXml, endpoint);

    await prisma.filing.update({
      where: { id: filing.id },
      data: {
        status: "submitted",
        correlationId: submissionResult.submissionId,
        submissionNumber,
        pollInterval: submissionResult.pollInterval,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({
      status: "submitted",
      filingId: filing.id,
      message:
        "Filing submitted to Companies House. They typically process filings within 24 hours — we'll email you when it's confirmed.",
    });
  } catch (err) {
    console.error("[CH submit-accounts] Submission failed:", err instanceof Error ? err.message : err);
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit to Companies House" },
      { status: 502 },
    );
  }
}
