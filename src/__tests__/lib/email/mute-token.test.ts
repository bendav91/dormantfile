import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateMuteUrl, verifyMuteToken } from "@/lib/email/mute-token";

const TEST_SECRET = "test-secret-for-hmac";

describe("generateMuteUrl", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("generates a URL with uid, exp, and sig params", () => {
    const url = generateMuteUrl("user-123");
    const parsed = new URL(url);
    expect(parsed.searchParams.get("uid")).toBe("user-123");
    expect(parsed.searchParams.get("exp")).toBeTruthy();
    expect(parsed.searchParams.get("sig")).toBeTruthy();
    expect(parsed.pathname).toBe("/api/account/mute-reminders");
  });

  it("expiry is approximately 7 days from now", () => {
    const url = generateMuteUrl("user-123");
    const parsed = new URL(url);
    const exp = parseInt(parsed.searchParams.get("exp")!);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(exp).toBeGreaterThan(Date.now());
    expect(exp).toBeLessThanOrEqual(Date.now() + sevenDaysMs + 1000);
  });
});

describe("verifyMuteToken", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("returns userId for a valid token", () => {
    const url = generateMuteUrl("user-456");
    const parsed = new URL(url);
    const result = verifyMuteToken(
      parsed.searchParams.get("uid")!,
      parsed.searchParams.get("exp")!,
      parsed.searchParams.get("sig")!,
    );
    expect(result).toEqual({ valid: true, userId: "user-456" });
  });

  it("rejects an expired token", () => {
    const url = generateMuteUrl("user-456");
    const parsed = new URL(url);
    const result = verifyMuteToken(
      parsed.searchParams.get("uid")!,
      "1000000000000",
      parsed.searchParams.get("sig")!,
    );
    expect(result).toEqual({ valid: false, reason: "expired" });
  });

  it("rejects a tampered signature", () => {
    const url = generateMuteUrl("user-789");
    const parsed = new URL(url);
    const result = verifyMuteToken(
      parsed.searchParams.get("uid")!,
      parsed.searchParams.get("exp")!,
      "tampered-signature",
    );
    expect(result).toEqual({ valid: false, reason: "invalid" });
  });

  it("rejects a tampered userId", () => {
    const url = generateMuteUrl("user-original");
    const parsed = new URL(url);
    const result = verifyMuteToken(
      "user-attacker",
      parsed.searchParams.get("exp")!,
      parsed.searchParams.get("sig")!,
    );
    expect(result).toEqual({ valid: false, reason: "invalid" });
  });
});
