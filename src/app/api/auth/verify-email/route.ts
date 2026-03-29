import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`verify-email:${ip}`, 5, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
  }

  const body = await req.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const record = await prisma.emailVerificationToken.findUnique({
    where: { token: hashedToken },
  });

  if (!record || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  // Token already used — check if the user's email is already verified
  if (record.usedAt) {
    const user = await prisma.user.findUnique({
      where: { id: record.userId },
      select: { emailVerified: true },
    });
    if (user?.emailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { emailVerified: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
