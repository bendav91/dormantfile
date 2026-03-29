import { createHash } from "crypto";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`verify-email-change:${ip}`, 5, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Too many attempts. Please wait." }, { status: 429 });
  }

  const body = await req.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const record = await prisma.pendingEmailChange.findUnique({
    where: { token: hashedToken },
  });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
  }

  // Re-check email uniqueness at confirmation time
  const existing = await prisma.user.findUnique({
    where: { email: record.newEmail.trim().toLowerCase() },
  });
  if (existing && existing.id !== record.userId) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: {
        email: record.newEmail.trim().toLowerCase(),
        emailVerified: new Date(),
      },
    }),
    prisma.pendingEmailChange.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ success: true });
}
