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

  const res = await fetch(
    `https://api.company-information.service.gov.uk/company/${encodeURIComponent(paddedNumber)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
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

  return NextResponse.json({
    companyName: data.company_name,
    companyNumber: data.company_number,
    companyStatus: data.company_status,
    dateOfCreation: data.date_of_creation,
  });
}
