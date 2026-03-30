import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyMuteToken } from "@/lib/email/mute-token";

/**
 * Validates the mute token and mutes the user's reminders.
 * Returns a NextResponse error on failure, or null on success.
 */
async function handleMute(req: NextRequest): Promise<NextResponse | null> {
  const uid = req.nextUrl.searchParams.get("uid");
  const exp = req.nextUrl.searchParams.get("exp");
  const sig = req.nextUrl.searchParams.get("sig");

  if (!uid || !exp || !sig) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const result = verifyMuteToken(uid, exp, sig);

  if (!result.valid) {
    const message = result.reason === "expired" ? "This link has expired" : "Invalid link";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: result.userId },
    data: { remindersMuted: true },
  });

  return null; // success
}

export async function GET(req: NextRequest) {
  const error = await handleMute(req);
  if (error) return error;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";
  return NextResponse.redirect(`${baseUrl}/settings?reminders=muted`);
}

export async function POST(req: NextRequest) {
  const error = await handleMute(req);
  if (error) return error;

  return NextResponse.json({ success: true });
}
