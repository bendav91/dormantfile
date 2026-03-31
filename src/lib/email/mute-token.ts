import { createHmac, timingSafeEqual } from "crypto";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for mute tokens");
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("hex");
}

export function generateMuteUrl(userId: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://dormantfile.co.uk";
  const exp = (Date.now() + SEVEN_DAYS_MS).toString();
  const sig = sign(`${userId}:mute-reminders:${exp}`);
  return `${baseUrl}/api/account/mute-reminders?uid=${encodeURIComponent(userId)}&exp=${exp}&sig=${sig}`;
}

type VerifyResult =
  | { valid: true; userId: string }
  | { valid: false; reason: "expired" | "invalid" };

export function verifyMuteToken(uid: string, exp: string, sig: string): VerifyResult {
  const expiry = parseInt(exp, 10);
  if (isNaN(expiry) || expiry < Date.now()) {
    return { valid: false, reason: "expired" };
  }

  const expected = sign(`${uid}:mute-reminders:${exp}`);
  const sigBuffer = Buffer.from(sig, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");

  if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
    return { valid: false, reason: "invalid" };
  }

  return { valid: true, userId: uid };
}
