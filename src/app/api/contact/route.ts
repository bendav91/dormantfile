import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/client";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const { name, email, message } = await request.json();

  if (!name || !email || !message) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  try {
    await Promise.all([
      sendEmail({
        to: "hello@dormantfile.co.uk",
        replyTo: email,
        subject: `Contact form: ${name}`,
        text: `From: ${name} (${email})\n\n${message}`,
      }),
      prisma.contactMessage.create({
        data: { name, email, message },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
