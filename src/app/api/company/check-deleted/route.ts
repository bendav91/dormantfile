import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const number = req.nextUrl.searchParams.get("number");
  if (!number || number.length < 6 || number.length > 8) {
    return NextResponse.json(
      { error: "Provide a valid company number (6-8 characters)." },
      { status: 400 },
    );
  }

  const paddedNumber = number.padStart(8, "0");

  const company = await prisma.company.findFirst({
    where: {
      userId: session.user.id,
      companyRegistrationNumber: paddedNumber,
      deletedAt: { not: null },
    },
  });

  if (company) {
    return NextResponse.json({
      hasDeleted: true,
      companyName: company.companyName,
      deletedAt: company.deletedAt!.toISOString(),
    });
  }

  return NextResponse.json({ hasDeleted: false });
}
