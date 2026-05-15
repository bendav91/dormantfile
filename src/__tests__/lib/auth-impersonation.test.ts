import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { authOptions } from "@/lib/auth";

// Helpers to call the inline callbacks directly.
const jwt = (args: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (authOptions.callbacks!.jwt as any)(args);
const sessionCb = (args: Record<string, unknown>) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (authOptions.callbacks!.session as any)(args);

describe("session callback — impersonation exposure", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does NOT set impersonating when token has no impersonatorId", async () => {
    const session = { user: {} };
    const result = await sessionCb({ session, token: { id: "u1" } });
    expect(result.impersonating).toBeUndefined();
    expect(result.user.id).toBe("u1");
  });

  it("sets impersonating + impersonatedName when token.impersonatorId present", async () => {
    const session = { user: {} };
    const result = await sessionCb({
      session,
      token: { id: "customer1", impersonatorId: "admin1", impersonatedName: "Acme Ltd" },
    });
    expect(result.impersonating).toBe(true);
    expect(result.impersonatedName).toBe("Acme Ltd");
    expect(result.user.id).toBe("customer1");
  });

  it("sets impersonatedName to null when token.impersonatedName missing", async () => {
    const session = { user: {} };
    const result = await sessionCb({
      session,
      token: { id: "customer1", impersonatorId: "admin1" },
    });
    expect(result.impersonating).toBe(true);
    expect(result.impersonatedName).toBeNull();
  });
});
