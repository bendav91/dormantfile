import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.subscriptionTier !== "agent") {
    return NextResponse.json(
      { error: "Agent filing is only available on the Agent plan" },
      { status: 403 },
    );
  }

  let body: { filingAsAgent?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof body.filingAsAgent !== "boolean") {
    return NextResponse.json({ error: "filingAsAgent must be a boolean" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { filingAsAgent: body.filingAsAgent },
  });

  return NextResponse.json({ success: true, filingAsAgent: body.filingAsAgent });
}
