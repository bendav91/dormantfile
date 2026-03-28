import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const number = req.nextUrl.searchParams.get("number");
  if (!number || number.length < 6 || number.length > 8) {
    return NextResponse.json(
      { error: "Provide a valid company number (6-8 characters)." },
      { status: 400 }
    );
  }

  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Company lookup is not configured." },
      { status: 503 }
    );
  }

  const paddedNumber = number.padStart(8, "0");

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");

  
  const res = await fetch(
    `${process.env.COMPANY_INFORMATION_API_ENDPOINT}/company/${encodeURIComponent(paddedNumber)}`,
    {
      headers: {
        Authorization: `Basic ${basicAuth}`,
      },
    }
  );

  if (res.status === 404) {
    return NextResponse.json(
      { error: "No company found with that number." },
      { status: 404 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: "Failed to look up company. Try again later." },
      { status: 502 }
    );
  }

  const data = await res.json();

  const nextAccounts = data.accounts?.next_accounts;

  // Extract total share capital in pence from the CH API confirmation statement capital array.
  // The API returns an array of capital objects with currency and value fields.
  let shareCapitalPence: number | null = null;
  const capitalEntries = data.confirmation_statement?.statement_of_capital?.capital;
  if (Array.isArray(capitalEntries)) {
    const gbpEntry = capitalEntries.find(
      (c: { currency?: string }) => c.currency === "GBP",
    );
    if (gbpEntry?.total_amount_unpaid != null || gbpEntry?.total_number_of_shares != null) {
      // total_amount is the total nominal value in pounds (e.g. "1" for £1)
      const pounds = parseFloat(gbpEntry.total_amount ?? "0");
      if (!isNaN(pounds) && pounds >= 0) {
        shareCapitalPence = Math.round(pounds * 100);
      }
    }
  }

  return NextResponse.json({
    companyName: data.company_name,
    companyNumber: data.company_number,
    companyStatus: data.company_status,
    dateOfCreation: data.date_of_creation,
    periodStartOn: nextAccounts?.period_start_on ?? null,
    periodEndOn: nextAccounts?.period_end_on ?? null,
    accountsDueOn: nextAccounts?.due_on ?? null,
    accountsOverdue: nextAccounts?.overdue ?? false,
    shareCapitalPence,
  });
}
