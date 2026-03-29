import { NextResponse } from "next/server";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { validatePassword } from "@/lib/utils";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`reset:${ip}`, 5, 60000);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { token, newPassword } = body;

  if (!token || !newPassword) {
    return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
  }

  if (!validatePassword(newPassword)) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters with at least one letter and one number" },
      { status: 400 },
    );
  }

  const hashedToken = createHash("sha256").update(token).digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token: hashedToken },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Please request a new one." },
      { status: 400 },
    );
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return NextResponse.json({ message: "Password has been reset. You can now sign in." });
}
