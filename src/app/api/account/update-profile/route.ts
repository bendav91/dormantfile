import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { sendEmail } from "@/lib/email/client";
import { buildEmailChangeEmail, buildEmailChangeNotificationEmail } from "@/lib/email/templates";

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, remindersMuted } = body;

  // Handle remindersMuted-only update
  if (remindersMuted !== undefined && name === undefined && email === undefined) {
    if (typeof remindersMuted !== "boolean") {
      return NextResponse.json({ error: "remindersMuted must be a boolean" }, { status: 400 });
    }
    await prisma.user.update({
      where: { id: session.user.id },
      data: { remindersMuted },
    });
    return NextResponse.json({ success: true });
  }

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  // Name always updates immediately
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: trimmedName,
      ...(typeof remindersMuted === "boolean" ? { remindersMuted } : {}),
    },
  });

  // Email change: verify-before-swap
  if (trimmedEmail !== session.user.email) {
    // Check email isn't taken
    const existing = await prisma.user.findUnique({ where: { email: trimmedEmail } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    // Delete any existing pending change, create new one
    await prisma.pendingEmailChange.deleteMany({ where: { userId: session.user.id } });

    const rawToken = randomBytes(32).toString("hex");
    const hashedToken = createHash("sha256").update(rawToken).digest("hex");

    await prisma.pendingEmailChange.create({
      data: {
        userId: session.user.id,
        newEmail: trimmedEmail,
        token: hashedToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/verify-email-change?token=${rawToken}`;

    // Send verification to new address, notification to old address
    try {
      const changeEmail = buildEmailChangeEmail({ verifyUrl, newEmail: trimmedEmail });
      const notifyEmail = buildEmailChangeNotificationEmail({ newEmail: trimmedEmail });

      await Promise.all([
        sendEmail({ to: trimmedEmail, subject: changeEmail.subject, html: changeEmail.html }),
        sendEmail({
          to: session.user.email!,
          subject: notifyEmail.subject,
          html: notifyEmail.html,
        }),
      ]);
    } catch (err) {
      console.error("Failed to send email change emails:", err);
    }

    return NextResponse.json({ success: true, pendingEmail: trimmedEmail });
  }

  return NextResponse.json({ success: true });
}
