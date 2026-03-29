import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import { Resend } from "resend";
import { buildPasswordResetEmail } from "@/lib/email/templates";
import { rateLimit } from "@/lib/rate-limit";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const { success } = rateLimit(`forgot:${ip}`, 3, 60000);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a minute." },
      { status: 429 },
    );
  }

  const body = await request.json();
  const { email } = body;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Always return 200 to avoid revealing if email exists
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (user) {
    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
    const { subject, html } = buildPasswordResetEmail({ resetUrl });

    try {
      await resend.emails.send({
        from: "DormantFile <noreply@dormantfile.co.uk>",
        to: user.email,
        subject,
        html,
      });
    } catch {
      console.error("Failed to send password reset email");
    }
  }

  return NextResponse.json({
    message: "If an account exists with that email, we have sent a password reset link.",
  });
}
