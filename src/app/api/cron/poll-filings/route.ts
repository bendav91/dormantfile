import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { pollHmrc } from "@/lib/hmrc/submission-client";
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

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const filings = await prisma.filing.findMany({
    where: {
      status: "polling_timeout",
      hmrcCorrelationId: { not: null },
    },
    include: {
      company: {
        include: { user: true },
      },
    },
  });

  const total = filings.length;
  let resolved = 0;

  const endpoint = process.env.HMRC_ENDPOINT;

  let vendor: VendorCredentials;
  try {
    vendor = getVendorCredentials();
  } catch {
    return NextResponse.json(
      { error: "HMRC vendor credentials are not configured" },
      { status: 500 }
    );
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: "HMRC_ENDPOINT is not configured" },
      { status: 500 }
    );
  }

  for (const filing of filings) {
    try {
      const pollResult = await pollHmrc(
        filing.hmrcCorrelationId!,
        endpoint,
        vendor
      );

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
          filing.companyId,
          filing.company.accountingPeriodEnd,
          filing.company.registeredForCorpTax,
          filing.filingType as "accounts" | "ct600",
          filing.company.user.email,
          filing.company.companyName
        );

        resolved++;
      } else if (pollResult.status === "rejected") {
        await prisma.filing.update({
          where: { id: filing.id },
          data: {
            status: "rejected",
            hmrcResponsePayload: pollResult.responsePayload,
          },
        });

        resolved++;
      }
      // status === "processing": leave as polling_timeout, do nothing
    } catch {
      // Don't crash the cron — continue to next filing
    }
  }

  return NextResponse.json({ checked: total, resolved });
}
