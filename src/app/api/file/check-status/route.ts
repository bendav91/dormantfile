import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pollHmrc } from "@/lib/hmrc/submission-client";
import { pollCompaniesHouse } from "@/lib/companies-house/submission-client";
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

  if (filing.status !== "polling_timeout") {
    return NextResponse.json(
      { error: "Filing is not in polling_timeout status" },
      { status: 400 }
    );
  }

  if (!filing.correlationId) {
    return NextResponse.json(
      { error: "No correlation ID found for this filing" },
      { status: 400 }
    );
  }

  // Dispatch to the correct polling function based on filing type
  let pollStatus: "accepted" | "rejected" | "processing" | "pending";
  let pollMessage: string | undefined;
  let pollResponsePayload: string | undefined;

  try {
    if (filing.filingType === "ct600") {
      const vendor = getVendorCredentials();
      const endpoint = process.env.HMRC_ENDPOINT;
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
        return NextResponse.json({ error: "COMPANIES_HOUSE_FILING_ENDPOINT is not configured" }, { status: 500 });
      }
      const result = await pollCompaniesHouse(filing.correlationId, endpoint, credentials);
      pollStatus = result.status;
      pollMessage = result.message;
      pollResponsePayload = result.responsePayload;
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to poll" },
      { status: 502 }
    );
  }

  if (pollStatus === "accepted") {
    await prisma.filing.update({
      where: { id: filing.id },
      data: {
        status: "accepted",
        confirmedAt: new Date(),
        responsePayload: pollResponsePayload,
      },
    });

    await rollForwardPeriod(
      filing.companyId,
      filing.company.accountingPeriodEnd,
      filing.company.registeredForCorpTax,
      filing.filingType as "accounts" | "ct600",
      filing.company.user.email,
      filing.company.companyName
    );

    return NextResponse.json({ status: "accepted", filingId: filing.id });
  }

  if (pollStatus === "rejected") {
    await prisma.filing.update({
      where: { id: filing.id },
      data: {
        status: "rejected",
        responsePayload: pollResponsePayload,
      },
    });

    return NextResponse.json({
      status: "rejected",
      filingId: filing.id,
      message: pollMessage,
    });
  }

  // Still processing
  return NextResponse.json({ status: "processing", filingId: filing.id });
}
