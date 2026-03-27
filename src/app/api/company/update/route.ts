import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateCT600Deadline, calculateNextReminderDate, validateUTR } from "@/lib/utils";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { companyId, registeredForCorpTax, uniqueTaxReference } = body;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  if (registeredForCorpTax && !uniqueTaxReference) {
    return NextResponse.json({ error: "UTR is required when enabling Corporation Tax" }, { status: 400 });
  }

  if (registeredForCorpTax && !validateUTR(uniqueTaxReference)) {
    return NextResponse.json({ error: "UTR must be exactly 10 digits" }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (company.registeredForCorpTax) {
    return NextResponse.json({ error: "Corporation Tax is already enabled for this company" }, { status: 409 });
  }

  const ct600Deadline = calculateCT600Deadline(company.accountingPeriodEnd);
  const ct600ReminderAt = calculateNextReminderDate(ct600Deadline, 0);

  await prisma.$transaction([
    prisma.company.update({
      where: { id: companyId },
      data: {
        registeredForCorpTax: true,
        uniqueTaxReference: uniqueTaxReference,
      },
    }),
    prisma.reminder.create({
      data: {
        companyId,
        filingType: "ct600",
        filingDeadline: ct600Deadline,
        remindersSent: 0,
        nextReminderAt: ct600ReminderAt,
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
