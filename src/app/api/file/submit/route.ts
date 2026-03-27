import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildGovTalkMessage } from "@/lib/hmrc/xml-builder";
import { submitToHmrc, pollHmrc } from "@/lib/hmrc/submission-client";
import { getCompanyLimit } from "@/lib/subscription";
import { rollForwardPeriod } from "@/lib/roll-forward";
import type { VendorCredentials } from "@/lib/hmrc/types";

const POLL_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 5_000;

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

  let body: { companyId?: string; gatewayUsername?: string; gatewayPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { companyId, gatewayUsername, gatewayPassword } = body;

  if (!companyId || !gatewayUsername || !gatewayPassword) {
    return NextResponse.json(
      { error: "companyId, gatewayUsername, and gatewayPassword are required" },
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

  if (!company.registeredForCorpTax) {
    return NextResponse.json({ error: "This company is not registered for Corporation Tax" }, { status: 400 });
  }

  // Clean up retryable filings (failed/rejected are terminal — safe to replace)
  // and stale pending filings (older than 5 minutes — never reached HMRC)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  await prisma.filing.deleteMany({
    where: {
      companyId,
      filingType: "ct600",
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
      filingType: "ct600",
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
      filingType: "ct600",
      periodStart: company.accountingPeriodStart,
      periodEnd: company.accountingPeriodEnd,
      status: "pending",
    },
  });

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
      { status: 500 }
    );
  }

  // Build XML
  let govTalkXml: string;
  try {
    govTalkXml = buildGovTalkMessage(
      {
        companyName: company.companyName,
        uniqueTaxReference: company.uniqueTaxReference!,
        periodStart: company.accountingPeriodStart,
        periodEnd: company.accountingPeriodEnd,
        declarantName: user.name,
        declarantStatus: "Director",
      },
      { gatewayUsername, gatewayPassword },
      vendor
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

  // Submit to HMRC
  let correlationId: string;
  let pollEndpoint: string;

  try {
    const submissionResult = await submitToHmrc(govTalkXml, endpoint);
    correlationId = submissionResult.correlationId;
    pollEndpoint = submissionResult.endpoint;
  } catch (err) {
    await prisma.filing.update({
      where: { id: filing.id },
      data: { status: "failed" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit to HMRC" },
      { status: 502 }
    );
  }

  // Credentials no longer referenced after this point

  await prisma.filing.update({
    where: { id: filing.id },
    data: {
      status: "submitted",
      hmrcCorrelationId: correlationId,
      submittedAt: new Date(),
    },
  });

  // Poll for response
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

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
          hmrcResponsePayload: pollResult.responsePayload,
        },
      });

      await rollForwardPeriod(
        companyId,
        company.accountingPeriodEnd,
        company.registeredForCorpTax,
        "ct600",
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
