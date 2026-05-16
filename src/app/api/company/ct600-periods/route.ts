import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateCtapChain } from "@/lib/ctap";
import { calculateCT600Deadline } from "@/lib/utils";

const IMMUTABLE = new Set(["submitted", "accepted", "filed_elsewhere"]);

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { companyId?: string; accountsPeriodStartISO?: string; accountsPeriodEndISO?: string;
    periods?: { startISO: string; endISO: string }[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const { companyId, accountsPeriodStartISO, accountsPeriodEndISO, periods } = body;
  if (!companyId || !accountsPeriodStartISO || !accountsPeriodEndISO || !Array.isArray(periods))
    return NextResponse.json({ error: "companyId, accounts period and periods are required" }, { status: 400 });

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
    include: { filings: { where: { filingType: "ct600" } } },
  });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const accountsPeriodStart = new Date(accountsPeriodStartISO);
  const accountsPeriodEnd = new Date(accountsPeriodEndISO);
  const parsed = periods.map((p) => ({ start: new Date(p.startISO), end: new Date(p.endISO) }));
  if ([accountsPeriodStart, accountsPeriodEnd, ...parsed.flatMap((p) => [p.start, p.end])]
        .some((x) => isNaN(x.getTime())))
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });

  const errors = validateCtapChain({ accountsPeriodStart, accountsPeriodEnd, periods: parsed });
  if (errors.length) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const inSpan = (f: { periodStart: Date; periodEnd: Date }) =>
    f.periodStart.getTime() >= accountsPeriodStart.getTime() &&
    f.periodEnd.getTime() <= accountsPeriodEnd.getTime();
  const spanFilings = company.filings.filter(inSpan);
  if (spanFilings.some((f) => IMMUTABLE.has(f.status)))
    return NextResponse.json(
      { error: "A period in this span has already been filed. Reopen to refresh." },
      { status: 409 },
    );

  const deadline = calculateCT600Deadline(accountsPeriodEnd);
  const editableIds = spanFilings.filter((f) => !IMMUTABLE.has(f.status)).map((f) => f.id);

  await prisma.$transaction([
    prisma.filing.deleteMany({ where: { id: { in: editableIds } } }),
    prisma.filing.createMany({
      data: parsed.map((p) => ({
        companyId, filingType: "ct600" as const,
        periodStart: p.start, periodEnd: p.end, startDate: p.start, endDate: p.end,
        status: "outstanding" as const, deadline, ctapUserEdited: true,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true, count: parsed.length });
}

const REMOVABLE = new Set(["outstanding", "failed", "rejected"]);

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { companyId?: string; filingId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const { companyId, filingId } = body;
  if (!companyId || !filingId)
    return NextResponse.json({ error: "companyId and filingId are required" }, { status: 400 });

  const company = await prisma.company.findFirst({
    where: { id: companyId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

  const filing = await prisma.filing.findFirst({
    where: { id: filingId, companyId, filingType: "ct600" },
    select: { id: true, status: true },
  });
  if (!filing) return NextResponse.json({ error: "Filing not found" }, { status: 404 });

  if (!REMOVABLE.has(filing.status))
    return NextResponse.json(
      { error: "This CT600 has been submitted or filed and cannot be removed." },
      { status: 409 },
    );

  await prisma.filing.delete({ where: { id: filing.id } });
  return NextResponse.json({ ok: true });
}
