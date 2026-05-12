import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { buildBroadcastEmail } from "@/lib/email/templates";
import { renderMarkdownForEmail } from "@/lib/email/render-markdown";

export const maxDuration = 300;

const MAX_SUBJECT = 200;
const MAX_BODY = 50_000;

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { mode?: string; subject?: string; bodyMarkdown?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { mode, subject, bodyMarkdown } = body;

  if (mode !== "preview" && mode !== "send") {
    return NextResponse.json({ error: "mode must be 'preview' or 'send'" }, { status: 400 });
  }
  if (!subject || typeof subject !== "string" || subject.trim().length === 0) {
    return NextResponse.json({ error: "Subject is required" }, { status: 400 });
  }
  if (subject.length > MAX_SUBJECT) {
    return NextResponse.json(
      { error: `Subject must be ${MAX_SUBJECT} characters or less` },
      { status: 400 },
    );
  }
  if (!bodyMarkdown || typeof bodyMarkdown !== "string" || bodyMarkdown.trim().length === 0) {
    return NextResponse.json({ error: "Body is required" }, { status: 400 });
  }
  if (bodyMarkdown.length > MAX_BODY) {
    return NextResponse.json(
      { error: `Body must be ${MAX_BODY} characters or less` },
      { status: 400 },
    );
  }

  const bodyHtml = renderMarkdownForEmail(bodyMarkdown);
  const { subject: finalSubject, html } = buildBroadcastEmail({
    subject: subject.trim(),
    bodyHtml,
  });

  if (mode === "preview") {
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true },
    });
    if (!admin) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    try {
      await sendEmail({
        to: admin.email,
        subject: `[Preview] ${finalSubject}`,
        html,
      });
    } catch (err) {
      console.error("Broadcast preview failed:", err);
      return NextResponse.json({ error: "Failed to send preview" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, recipient: admin.email });
  }

  const recipients = await prisma.user.findMany({
    where: { emailVerified: { not: null } },
    select: { id: true, email: true },
  });

  let sendErrors = 0;
  let firstError: unknown = null;

  await Promise.all(
    recipients.map(async (recipient) => {
      try {
        await sendEmail({ to: recipient.email, subject: finalSubject, html });
      } catch (err) {
        sendErrors++;
        if (!firstError) firstError = err;
      }
    }),
  );

  if (firstError) {
    console.error(`Broadcast send: ${sendErrors}/${recipients.length} failed. First error:`, firstError);
  }

  const broadcast = await prisma.broadcastEmail.create({
    data: {
      sentByUserId: session.user.id,
      subject: finalSubject,
      bodyMarkdown,
      bodyHtml,
      recipientCount: recipients.length,
      sendErrors,
    },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    recipientCount: recipients.length,
    sendErrors,
    broadcastId: broadcast.id,
  });
}
