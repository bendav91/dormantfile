import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { randomBytes } from "crypto";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = randomBytes(32).toString("hex");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { calendarFeedToken: token },
  });

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";

  return NextResponse.json({
    token,
    url: `${baseUrl}/api/calendar/feed?token=${token}`,
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { calendarFeedToken: null },
  });

  return NextResponse.json({ ok: true });
}
