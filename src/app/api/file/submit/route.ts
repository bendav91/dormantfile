import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildGovTalkMessage } from "@/lib/hmrc/xml-builder";
import { submitToHmrc, pollHmrc } from "@/lib/hmrc/submission-client";
import { rollForwardPeriod } from "@/lib/roll-forward";
import { generateDormantAccountsIxbrl } from "@/lib/ixbrl/dormant-accounts";
import { generateDormantTaxComputationsIxbrl } from "@/lib/ixbrl/tax-computations";
import type { VendorCredentials } from "@/lib/hmrc/types";
import { FilingStatus } from "@prisma/client";

const POLL_TIMEOUT_MS = 120_000;
const DEFAULT_POLL_INTERVAL_MS = 5_000;

function getVendorCredentials(): VendorCredentials {
  const vendorId = process.env.HMRC_VENDOR_ID;
  const senderId = process.env.HMRC_SENDER_ID;
  const senderPassword = process.env.HMRC_SENDER_PASSWORD;

  if (!vendorId || !senderId || !senderPassword) {
    throw new Error("HMRC vendor credentials are not configured");
  }

  return { vendorId, senderId, senderPassword };
}

function getHmrcEndpoint(): string {
  const endpoint = process.env.HMRC_ENDPOINT;
  if (!endpoint) {
    throw new Error("HMRC_ENDPOINT is not configured");
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
    periodStart?: string;
    periodEnd?: string;
    gatewayUsername?: string;
    gatewayPassword?: string;
    agentGatewayId?: string;
    agentGatewayPassword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { companyId, gatewayUsername, gatewayPassword, agentGatewayId, agentGatewayPassword } =
    body;
  const isAgentFiling = !!(agentGatewayId && agentGatewayPassword);

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

  if (isAgentFiling) {
    if (user.subscriptionTier !== "agent" || !user.filingAsAgent) {
      return NextResponse.json(
        { error: "Agent filing requires an Agent plan with agent mode enabled" },
        { status: 403 },
      );
    }
  } else if (!gatewayUsername || !gatewayPassword) {
    return NextResponse.json(
      { error: "gatewayUsername and gatewayPassword are required" },
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

  if (!company.registeredForCorpTax) {
    return NextResponse.json(
      { error: "This company is not registered for Corporation Tax" },
      { status: 400 },
    );
  }

  // Validate the requested filing exists as outstanding.
  // Prefer filingId lookup (new path), fall back to period dates (backward compat).
  const outstandingFiling = body.filingId
    ? await prisma.filing.findFirst({
        where: {
          id: body.filingId,
          companyId,
          filingType: "ct600",
          status: "outstanding",
        },
      })
    : await prisma.filing.findFirst({
        where: {
          companyId,
          filingType: "ct600",
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
                "This company has been dissolved at Companies House and can no longer file returns.",
            },
            { status: 400 },
          );
        }
      }
    } catch {
      // Non-blocking: if the status check fails, allow the filing to proceed —
      // HMRC will reject it if the company is dissolved.
    }
  }

  // Reset retryable filings back to outstanding so they can be resubmitted,
  // and reset stale pending filings (older than 5 minutes — never reached HMRC)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.filing.updateMany({
    where: {
      ...(body.filingId
        ? { id: body.filingId }
        : { periodStart: targetPeriodStart, periodEnd: targetPeriodEnd }),
      companyId,
      filingType: "ct600",
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
    },
  });

  // Idempotency check
  const existingFiling = await prisma.filing.findFirst({
    where: {
      ...(body.filingId
        ? { id: body.filingId }
        : { periodStart: targetPeriodStart, periodEnd: targetPeriodEnd }),
      companyId,
      filingType: "ct600",
      status: {
        in: [FilingStatus.submitted, FilingStatus.polling_timeout, FilingStatus.accepted],
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
    return NextResponse.json(
      { error: "This filing is already being submitted" },
      { status: 409 },
    );
  }

  const filing = { ...outstandingFiling, status: "pending" as const };

  let vendor: VendorCredentials;
  let endpoint: string;

  try {
    vendor = getVendorCredentials();
    endpoint = getHmrcEndpoint();
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

  // Generate iXBRL documents
  const accountsIxbrl = generateDormantAccountsIxbrl({
    companyName: company.companyName,
    companyRegistrationNumber: company.companyRegistrationNumber,
    periodStart: effectiveStart,
    periodEnd: effectiveEnd,
    directorName: user.name,
  });

  const computationsIxbrl = generateDormantTaxComputationsIxbrl({
    companyName: company.companyName,
    companyRegistrationNumber: company.companyRegistrationNumber,
    uniqueTaxReference: company.uniqueTaxReference!,
    periodStart: effectiveStart,
    periodEnd: effectiveEnd,
  });

  const isTest = endpoint.includes("test");

  // Build XML
  let govTalkXml: string;
  let irmarkValue: string | undefined;
  try {
    govTalkXml = await buildGovTalkMessage({
      ct600: {
        companyName: company.companyName,
        companyRegistrationNumber: company.companyRegistrationNumber,
        uniqueTaxReference: company.uniqueTaxReference!,
        periodStart: effectiveStart,
        periodEnd: effectiveEnd,
        declarantName: user.name,
        declarantStatus: isAgentFiling ? "Agent" : "Director",
      },
      credentials: { gatewayUsername: gatewayUsername!, gatewayPassword: gatewayPassword! },
      vendor,
      accountsIxbrl,
      computationsIxbrl,
      isTest,
      agent: isAgentFiling
        ? { agentGatewayId: agentGatewayId!, agentGatewayPassword: agentGatewayPassword! }
        : undefined,
    });
    // Extract IRmark from the built XML for permanent storage
    const irmarkMatch = govTalkXml.match(/<IRmark[^>]*>([^<]+)<\/IRmark>/);
    if (irmarkMatch) irmarkValue = irmarkMatch[1];
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

  // Submit to HMRC
  let correlationId: string;
  let pollEndpoint: string;
  let hmrcPollInterval = DEFAULT_POLL_INTERVAL_MS;

  try {
    const submissionResult = await submitToHmrc(govTalkXml, endpoint);
    correlationId = submissionResult.correlationId;
    pollEndpoint = submissionResult.endpoint;
    hmrcPollInterval = submissionResult.pollInterval * 1000;
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit to HMRC" },
      { status: 502 },
    );
  }

  // Credentials no longer referenced after this point

  await prisma.filing.update({
    where: { id: filing.id },
    data: {
      status: "submitted",
      correlationId: correlationId,
      irmark: irmarkValue,
      pollInterval: Math.round(hmrcPollInterval / 1000),
      submittedAt: new Date(),
    },
  });

  // Poll for response using interval from HMRC
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, hmrcPollInterval));

    let pollResult: Awaited<ReturnType<typeof pollHmrc>>;

    try {
      pollResult = await pollHmrc(correlationId, pollEndpoint, vendor);
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
        effectiveEnd,
        company.registeredForCorpTax,
        "ct600",
        user.email,
        company.companyName,
        { startDate: effectiveStart, endDate: effectiveEnd },
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

  return NextResponse.json({ status: "polling_timeout", filingId: filing.id });
}
