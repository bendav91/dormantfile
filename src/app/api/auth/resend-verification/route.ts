import { randomBytes, createHash } from "crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { resend } from "@/lib/email/client";
import { buildVerificationEmail } from "@/lib/email/templates";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = rateLimit(`resend-verification:${session.user.id}`, 1, 60_000);
  if (!success) {
    return NextResponse.json({ error: "Please wait before requesting another email." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerified: true },
  });

  if (!user || user.emailVerified) {
    return NextResponse.json({ error: "Email already verified" }, { status: 400 });
  }

  // Delete old tokens for this user
  await prisma.emailVerificationToken.deleteMany({
    where: { userId: session.user.id, usedAt: null },
  });

  const rawToken = randomBytes(32).toString("hex");
  const hashedToken = createHash("sha256").update(rawToken).digest("hex");

  await prisma.emailVerificationToken.create({
    data: {
      userId: session.user.id,
      token: hashedToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/verify-email?token=${rawToken}`;
  const { subject, html } = buildVerificationEmail({ verifyUrl });

  try {
    await resend.emails.send({
      from: "DormantFile <noreply@dormantfile.co.uk>",
      to: user.email,
      subject,
      html,
    });
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }

  return NextResponse.json({ success: true });
}
