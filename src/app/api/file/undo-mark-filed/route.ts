import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { filingId } = body as { filingId?: string };

  if (!filingId) {
    return NextResponse.json({ error: "Missing filingId" }, { status: 400 });
  }

  const filing = await prisma.filing.findFirst({
    where: { id: filingId },
    include: { company: { select: { userId: true, deletedAt: true } } },
  });

  if (!filing || filing.company.userId !== session.user.id || filing.company.deletedAt) {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }

  // Only allow undoing filings that were marked as filed elsewhere (no submittedAt)
  if (filing.submittedAt) {
    return NextResponse.json({ error: "Cannot undo a filing submitted through DormantFile" }, { status: 400 });
  }

  if (filing.status !== "filed_elsewhere") {
    return NextResponse.json({ error: "Filing was not marked as filed elsewhere" }, { status: 400 });
  }

  // Revert to outstanding — keep periodId and new columns intact so the
  // filing stays linked to its Period, but clear confirmedAt.
  await prisma.filing.update({
    where: { id: filingId },
    data: { status: "outstanding", confirmedAt: null },
  });

  return NextResponse.json({ success: true });
}
