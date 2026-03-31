import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { ids } = await req.json();

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No filing IDs provided" }, { status: 400 });
  }

  const result = await prisma.filing.updateMany({
    where: {
      id: { in: ids },
      status: "polling_timeout",
    },
    data: { status: "submitted", responsePayload: null },
  });

  return NextResponse.json({ updated: result.count });
}
