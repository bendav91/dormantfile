import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, getFilingsList } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;

  const result = await getFilingsList({
    status: searchParams.get("status") || undefined,
    type: searchParams.get("type") || undefined,
    deadline: searchParams.get("deadline") || undefined,
    page: Number(searchParams.get("page")) || 1,
    sort: searchParams.get("sort") || undefined,
    order: (searchParams.get("order") as "asc" | "desc") || undefined,
  });

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, action } = await req.json();

  if (!id || !["retry", "reset"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const filing = await prisma.filing.findUnique({ where: { id } });
  if (!filing) {
    return NextResponse.json({ error: "Filing not found" }, { status: 404 });
  }

  if (action === "retry") {
    // Set back to submitted so the cron picks it up on next run
    if (filing.status !== "polling_timeout" && filing.status !== "failed") {
      return NextResponse.json({ error: "Can only retry polling_timeout or failed filings" }, { status: 400 });
    }
    await prisma.filing.update({
      where: { id },
      data: { status: "submitted", responsePayload: null },
    });
  } else if (action === "reset") {
    if (filing.status !== "rejected" && filing.status !== "failed") {
      return NextResponse.json({ error: "Can only reset rejected or failed filings" }, { status: 400 });
    }
    await prisma.filing.update({
      where: { id },
      data: {
        status: "outstanding",
        correlationId: null,
        responsePayload: null,
        irmark: null,
        pollInterval: null,
        submittedAt: null,
        confirmedAt: null,
      },
    });
  }

  return NextResponse.json({ success: true });
}
