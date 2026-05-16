import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pollHmrc } from "@/lib/hmrc/submission-client";
import { pollCompaniesHouse } from "@/lib/companies-house/submission-client";
import { shouldFlagDocumentsNotFound } from "@/lib/companies-house/review-policy";
import type { VendorCredentials } from "@/lib/hmrc/types";
import { rollForwardPeriod } from "@/lib/roll-forward";

function getVendorCredentials(): VendorCredentials {
  const vendorId = process.env.HMRC_VENDOR_ID;
  const senderId = process.env.HMRC_SENDER_ID;
  const senderPassword = process.env.HMRC_SENDER_PASSWORD;

  if (!vendorId || !senderId || !senderPassword) {
    throw new Error("HMRC vendor credentials are not configured");
  }

  return { vendorId, senderId, senderPassword };
}

function getPresenterCredentials() {
  const presenterId = process.env.COMPANIES_HOUSE_PRESENTER_ID;
  const presenterAuth = process.env.COMPANIES_HOUSE_PRESENTER_AUTH;

  if (!presenterId || !presenterAuth) {
    throw new Error("Companies House presenter credentials are not configured");
  }

  return { presenterId, presenterAuth };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { filingId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { filingId } = body;

  if (!filingId) {
    return NextResponse.json({ error: "filingId is required" }, { status: 400 });
  }

  // Find filing, verify ownership
  const filing = await prisma.filing.findFirst({
    where: {
      id: filingId,
      company: { userId: session.user.id },
    },
    include: {
      company: {
        include: { user: true },
      },
    },
  });

  if (!filing) {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }

  if (filing.status !== "submitted") {
    return NextResponse.json({ error: "Filing is not awaiting a response" }, { status: 400 });
  }

  if (!filing.correlationId) {
    return NextResponse.json({ error: "No correlation ID found for this filing" }, { status: 400 });
  }

  // Dispatch to the correct polling function based on filing type
  let pollStatus: "accepted" | "rejected" | "processing" | "pending";
  let pollMessage: string | undefined;
  let pollResponsePayload: string | undefined;
  let chPendingReason: "documents_not_found" | undefined;

  try {
    if (filing.filingType === "ct600") {
      const vendor = getVendorCredentials();
      // Poll the ResponseEndPoint HMRC returned in the acknowledgement
      // (the /poll endpoint), not the /submission endpoint.
      const endpoint = filing.pollEndpoint ?? process.env.HMRC_ENDPOINT;
      if (!endpoint) {
        return NextResponse.json({ error: "HMRC_ENDPOINT is not configured" }, { status: 500 });
      }
      const result = await pollHmrc(filing.correlationId, endpoint, vendor);
      pollStatus = result.status;
      pollMessage = result.message;
      pollResponsePayload = result.responsePayload;
    } else {
      const credentials = getPresenterCredentials();
      const endpoint = process.env.COMPANIES_HOUSE_FILING_ENDPOINT;
      if (!endpoint) {
        return NextResponse.json(
          { error: "COMPANIES_HOUSE_FILING_ENDPOINT is not configured" },
          { status: 500 },
        );
      }
      // Poll by the presenter submission number we filed under (CH
      // GetSubmissionStatus matches on this, not the GovTalk correlationId);
      // fall back to correlationId for legacy rows predating submissionNumber.
      const chPollId = filing.submissionNumber ?? filing.correlationId;
      const result = await pollCompaniesHouse(chPollId, endpoint, credentials, process.env.CH_GATEWAY_TEST === "1");
      pollStatus = result.status;
      pollMessage = result.message;
      pollResponsePayload = result.responsePayload;
      chPendingReason = result.pendingReason;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to poll" },
      { status: 502 },
    );
  }

  if (pollStatus === "accepted") {
    await prisma.filing.update({
      where: { id: filing.id },
      data: {
        status: "accepted",
        confirmedAt: new Date(),
        responsePayload: pollResponsePayload,
        // Resolved — clear any prior "awaiting confirmation" flag.
        reviewFlaggedAt: null,
      },
    });

    const effectiveStart: Date = filing.startDate ?? filing.periodStart;
    const effectiveEnd: Date = filing.endDate ?? filing.periodEnd;

    await rollForwardPeriod(
      filing.companyId,
      effectiveEnd,
      filing.company.registeredForCorpTax,
      filing.filingType as "accounts" | "ct600",
      filing.company.user.email,
      filing.company.companyName,
      { startDate: effectiveStart, endDate: effectiveEnd },
    );

    return NextResponse.json({ status: "accepted", filingId: filing.id });
  }

  if (pollStatus === "rejected") {
    await prisma.filing.update({
      where: { id: filing.id },
      data: {
        status: "rejected",
        responsePayload: pollResponsePayload,
        // Resolved (rejected) — clear any prior "awaiting confirmation" flag.
        reviewFlaggedAt: null,
      },
    });

    return NextResponse.json({
      status: "rejected",
      filingId: filing.id,
      message: pollMessage,
    });
  }

  // CH error 8023 "EF documents not found": still pending. Keep the filing in
  // "submitted" so polling continues (it may yet resolve to accepted), but if
  // it has persisted past the grace window flag it for review so the user is
  // told it's unconfirmed instead of waiting silently forever.
  if (pollStatus === "pending" && chPendingReason === "documents_not_found") {
    const flagged =
      filing.reviewFlaggedAt != null ||
      shouldFlagDocumentsNotFound(filing.submittedAt, Date.now());

    if (flagged && filing.reviewFlaggedAt == null) {
      await prisma.filing.update({
        where: { id: filing.id },
        data: { reviewFlaggedAt: new Date() },
      });
    }

    return NextResponse.json({
      status: flagged ? "needs_attention" : "processing",
      filingId: filing.id,
    });
  }

  // Still processing
  return NextResponse.json({ status: "processing", filingId: filing.id });
}
