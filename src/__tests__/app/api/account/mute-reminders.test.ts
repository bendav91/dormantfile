import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { generateMuteUrl } from "@/lib/email/mute-token";

const TEST_SECRET = "test-secret-for-hmac";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}));

describe("mute-reminders route", () => {
  beforeEach(() => {
    vi.stubEnv("NEXTAUTH_SECRET", TEST_SECRET);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://example.com");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("GET with valid token returns redirect", async () => {
    const { GET } = await import("@/app/api/account/mute-reminders/route");
    const url = generateMuteUrl("user-123");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(new Request(url, { method: "GET" }));

    const response = await GET(nextReq);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/settings?reminders=muted");
  });

  it("POST with valid token returns 200 JSON", async () => {
    const { POST } = await import("@/app/api/account/mute-reminders/route");
    const url = generateMuteUrl("user-456");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(new Request(url, { method: "POST" }));

    const response = await POST(nextReq);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("rejects missing parameters with 400", async () => {
    const { GET } = await import("@/app/api/account/mute-reminders/route");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(
      new Request("https://example.com/api/account/mute-reminders", { method: "GET" }),
    );

    const response = await GET(nextReq);
    expect(response.status).toBe(400);
  });

  it("rejects tampered signature with 400", async () => {
    const { GET } = await import("@/app/api/account/mute-reminders/route");
    const url = generateMuteUrl("user-789");
    const tampered = url.replace(/sig=[^&]+/, "sig=tampered");
    const { NextRequest } = await import("next/server");
    const nextReq = new NextRequest(new Request(tampered, { method: "GET" }));

    const response = await GET(nextReq);
    expect(response.status).toBe(400);
  });
});
