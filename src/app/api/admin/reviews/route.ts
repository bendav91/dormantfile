import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ reviews });
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { id, action } = body;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Review ID is required." }, { status: 400 });
  }

  if (!["approve", "hide", "unhide"].includes(action)) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    return NextResponse.json({ error: "Review not found." }, { status: 404 });
  }

  const updated = await prisma.review.update({
    where: { id },
    data:
      action === "approve"
        ? { approved: true }
        : action === "hide"
          ? { hiddenAt: new Date() }
          : { hiddenAt: null },
  });

  return NextResponse.json({ review: updated });
}
