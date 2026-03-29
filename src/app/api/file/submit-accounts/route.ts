import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildAccountsXml } from "@/lib/companies-house/xml-builder";
import {
  submitToCompaniesHouse,
  pollCompaniesHouse,
} from "@/lib/companies-house/submission-client";
import { rollForwardPeriod } from "@/lib/roll-forward";
import { generateDormantAccountsIxbrl } from "@/lib/ixbrl/dormant-accounts";

// CH typically processes within 24h, so keep inline polling brief
const POLL_TIMEOUT_MS = 30_000;
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

  if (user.subscriptionStatus !== "active" && user.subscriptionStatus !== "cancelling") {
    return NextResponse.json({ error: "Active subscription required" }, { status: 403 });
  }

  let body: {
    companyId?: string;
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

  if (!body.periodStart || !body.periodEnd) {
    return NextResponse.json({ error: "periodStart and periodEnd are required" }, { status: 400 });
  }

  const targetPeriodStart = new Date(body.periodStart);
  const targetPeriodEnd = new Date(body.periodEnd);

  if (isNaN(targetPeriodStart.getTime()) || isNaN(targetPeriodEnd.getTime())) {
    return NextResponse.json({ error: "Invalid period dates" }, { status: 400 });
  }

  if (!companyAuthCode || !/^[A-Za-z0-9]{6}$/.test(companyAuthCode)) {
    return NextResponse.json(
      { error: "A valid 6-character company authentication code is required" },
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

  // Validate the requested period exists as an outstanding Filing
  const outstandingFiling = await prisma.filing.findFirst({
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

  const sixYearsAgo = new Date();
  sixYearsAgo.setUTCFullYear(sixYearsAgo.getUTCFullYear() - 6);
  if (targetPeriodEnd.getTime() <= sixYearsAgo.getTime()) {
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

  // Clean up retryable filings (failed/rejected are terminal — safe to replace)
  // and stale pending filings (older than 5 minutes — never reached CH)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.filing.deleteMany({
    where: {
      companyId,
      filingType: "accounts",
      periodStart: targetPeriodStart,
      periodEnd: targetPeriodEnd,
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
      periodStart: targetPeriodStart,
      periodEnd: targetPeriodEnd,
      status: { in: ["submitted", "polling_timeout", "accepted"] },
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

  // Create filing record with "pending" status
  const filing = await prisma.filing.create({
    data: {
      companyId,
      filingType: "accounts",
      periodStart: targetPeriodStart,
      periodEnd: targetPeriodEnd,
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
      { status: 500 },
    );
  }

  // Generate iXBRL accounts document
  const accountsIxbrl = generateDormantAccountsIxbrl({
    companyName: company.companyName,
    companyRegistrationNumber: company.companyRegistrationNumber,
    periodStart: targetPeriodStart,
    periodEnd: targetPeriodEnd,
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
        periodStart: targetPeriodStart,
        periodEnd: targetPeriodEnd,
        companyAuthCode,
        accountsIxbrl,
      },
      credentials,
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
      { status: 502 },
    );
  }

  await prisma.filing.update({
    where: { id: filing.id },
    data: {
      status: "submitted",
      correlationId: submissionId,
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
          responsePayload: pollResult.responsePayload,
        },
      });

      await rollForwardPeriod(
        companyId,
        targetPeriodEnd,
        company.registeredForCorpTax,
        "accounts",
        user.email,
        company.companyName,
      );

      return NextResponse.json({ status: "accepted", filingId: filing.id });
    }

    if (pollResult.status === "rejected") {
      await prisma.filing.update({
        where: { id: filing.id },
        data: {
          status: "rejected",
          responsePayload: pollResult.responsePayload,
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

  return NextResponse.json({
    status: "polling_timeout",
    filingId: filing.id,
    message:
      "Companies House typically processes filings within 24 hours. We'll email you when it's confirmed.",
  });
}
