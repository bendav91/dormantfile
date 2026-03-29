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
  const { companyId, registeredForCorpTax, uniqueTaxReference, shareCapital } = body;

  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Case 0: Share capital update (can combine with other cases)
  if (typeof shareCapital === "number" && shareCapital >= 0) {
    await prisma.company.update({
      where: { id: companyId },
      data: { shareCapital: Math.round(shareCapital) },
    });
  }

  // Case 1: Disable Corp Tax (strict equality — only when explicitly false)
  if (registeredForCorpTax === false && company.registeredForCorpTax) {
    await prisma.$transaction([
      prisma.company.update({
        where: { id: companyId },
        data: { registeredForCorpTax: false, uniqueTaxReference: null },
      }),
      prisma.reminder.deleteMany({
        where: { companyId, filingType: "ct600" },
      }),
    ]);
    return NextResponse.json({ success: true });
  }

  // Case 2: Corp Tax already enabled — allow UTR update only
  if (company.registeredForCorpTax && uniqueTaxReference) {
    if (!validateUTR(uniqueTaxReference)) {
      return NextResponse.json({ error: "UTR must be exactly 10 digits" }, { status: 400 });
    }
    await prisma.company.update({
      where: { id: companyId },
      data: { uniqueTaxReference },
    });
    return NextResponse.json({ success: true });
  }

  // Case 3: Enable Corp Tax for the first time
  if (registeredForCorpTax === true && !company.registeredForCorpTax) {
    if (!uniqueTaxReference) {
      return NextResponse.json({ error: "UTR is required when enabling Corporation Tax" }, { status: 400 });
    }
    if (!validateUTR(uniqueTaxReference)) {
      return NextResponse.json({ error: "UTR must be exactly 10 digits" }, { status: 400 });
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

  // If only a share capital update was done, return success
  if (typeof shareCapital === "number") {
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "No changes to apply" }, { status: 400 });
}
