import { NextRequest, NextResponse } from "next/server";
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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filings = await prisma.filing.findMany({
    where: {
      status: "submitted",
      correlationId: { not: null },
    },
    include: {
      company: {
        include: { user: true },
      },
    },
  });

  const total = filings.length;
  let resolved = 0;

  let vendor: VendorCredentials | undefined;
  try {
    vendor = getVendorCredentials();
  } catch {
    // HMRC creds may not be configured -- skip CT600 polling
  }

  let presenterCreds: ReturnType<typeof getPresenterCredentials> | undefined;
  try {
    presenterCreds = getPresenterCredentials();
  } catch {
    // CH creds may not be configured -- skip accounts polling
  }

  for (const filing of filings) {
    try {
      let pollStatus: "accepted" | "rejected" | "processing" | "pending";
      let pollResponsePayload: string | undefined;
      let chPendingReason: "documents_not_found" | undefined;

      if (filing.filingType === "ct600") {
        if (!vendor) continue;
        const endpoint = filing.pollEndpoint ?? process.env.HMRC_ENDPOINT;
        if (!endpoint) continue;
        const result = await pollHmrc(filing.correlationId!, endpoint, vendor);
        pollStatus = result.status;
        pollResponsePayload = result.responsePayload;
      } else {
        if (!presenterCreds) continue;
        const endpoint = process.env.COMPANIES_HOUSE_FILING_ENDPOINT;
        if (!endpoint) continue;
        // CH GetSubmissionStatus matches on the presenter submission number
        // we filed under (sent as <TransactionID>), NOT the GovTalk
        // correlationId CH returns in the acknowledgement. Polling with the
        // correlationId yields a permanent 8026 "documents not found".
        // Fall back to correlationId only for legacy rows predating
        // submissionNumber.
        const chPollId = filing.submissionNumber ?? filing.correlationId!;
        const result = await pollCompaniesHouse(chPollId, endpoint, presenterCreds, process.env.CH_GATEWAY_TEST === "1");
        pollStatus = result.status;
        pollResponsePayload = result.responsePayload;
        chPendingReason = result.pendingReason;
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

        await rollForwardPeriod(
          filing.companyId,
          filing.periodEnd,
          filing.company.registeredForCorpTax,
          filing.filingType as "accounts" | "ct600",
          filing.company.user.email,
          filing.company.companyName,
          {
            startDate: filing.startDate ?? filing.periodStart,
            endDate: filing.endDate ?? filing.periodEnd,
          },
        );

        resolved++;
      } else if (pollStatus === "rejected") {
        await prisma.filing.update({
          where: { id: filing.id },
          data: {
            status: "rejected",
            responsePayload: pollResponsePayload,
            // Resolved (rejected) — clear any prior flag.
            reviewFlaggedAt: null,
          },
        });

        resolved++;
      } else if (
        pollStatus === "pending" &&
        chPendingReason === "documents_not_found" &&
        filing.reviewFlaggedAt == null &&
        shouldFlagDocumentsNotFound(filing.submittedAt, Date.now())
      ) {
        // CH 8023 "EF documents not found" has persisted past the grace
        // window. Keep status "submitted" so polling continues (it may still
        // resolve to accepted), but flag it so the user is told it's
        // unconfirmed rather than waiting silently forever.
        await prisma.filing.update({
          where: { id: filing.id },
          data: { reviewFlaggedAt: new Date() },
        });
      }
      // processing/pending (within grace, or 8026): leave as submitted, retry next run
    } catch {
      // Don't crash the cron -- continue to next filing
    }
  }

  return NextResponse.json({ checked: total, resolved });
}
