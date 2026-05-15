import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

describe("jwt callback — start impersonation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("admin starting impersonation swaps identity and sets impersonatorId", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isAdmin: true } as never) // admin lookup
      .mockResolvedValueOnce({
        id: "cust1",
        name: "Acme Ltd",
        email: "owner@acme.test",
        emailVerified: null,
      } as never); // target lookup

    const token: Record<string, unknown> = { id: "admin1", emailVerified: new Date() };
    const result = await jwt({
      token,
      trigger: "update",
      session: { impersonate: "cust1" },
    });

    expect(result.impersonatorId).toBe("admin1");
    expect(result.id).toBe("cust1");
    expect(result.email).toBe("owner@acme.test");
    expect(result.name).toBe("Acme Ltd");
    expect(result.emailVerified).toBeNull();
    expect(result.impersonatedName).toBe("Acme Ltd");
  });

  it("non-admin attempting to impersonate is a no-op", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ isAdmin: false } as never);

    const token: Record<string, unknown> = { id: "user1" };
    const result = await jwt({
      token,
      trigger: "update",
      session: { impersonate: "cust1" },
    });

    expect(result.impersonatorId).toBeUndefined();
    expect(result.id).toBe("user1");
  });

  it("admin impersonating a nonexistent target is a no-op", async () => {
    vi.mocked(prisma.user.findUnique)
      .mockResolvedValueOnce({ isAdmin: true } as never)
      .mockResolvedValueOnce(null as never);

    const token: Record<string, unknown> = { id: "admin1" };
    const result = await jwt({
      token,
      trigger: "update",
      session: { impersonate: "ghost" },
    });

    expect(result.impersonatorId).toBeUndefined();
    expect(result.id).toBe("admin1");
  });

  it("already impersonating: a second start is blocked (no nested impersonation)", async () => {
    const token: Record<string, unknown> = {
      id: "cust1",
      impersonatorId: "admin1",
      impersonatedName: "Acme Ltd",
    };
    const result = await jwt({
      token,
      trigger: "update",
      session: { impersonate: "cust2" },
    });

    expect(result.id).toBe("cust1");
    expect(result.impersonatorId).toBe("admin1");
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe("jwt callback — stop impersonation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stop restores the original admin identity and clears impersonation fields", async () => {
    const verified = new Date("2024-01-01");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      name: "Admin User",
      email: "admin@dormantfile.test",
      emailVerified: verified,
    } as never);

    const token: Record<string, unknown> = {
      id: "cust1",
      email: "owner@acme.test",
      name: "Acme Ltd",
      emailVerified: null,
      impersonatorId: "admin1",
      impersonatedName: "Acme Ltd",
    };
    const result = await jwt({
      token,
      trigger: "update",
      session: { stopImpersonating: true },
    });

    expect(result.id).toBe("admin1");
    expect(result.email).toBe("admin@dormantfile.test");
    expect(result.name).toBe("Admin User");
    expect(result.emailVerified).toEqual(verified);
    expect(result.impersonatorId).toBeUndefined();
    expect(result.impersonatedName).toBeUndefined();
  });

  it("stopImpersonating with no active impersonation falls through to normal refresh", async () => {
    const verified = new Date("2024-02-02");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      emailVerified: verified,
    } as never);

    const token: Record<string, unknown> = { id: "u1", emailVerified: null };
    const result = await jwt({
      token,
      trigger: "update",
      session: { stopImpersonating: true },
    });

    expect(result.id).toBe("u1");
    expect(result.emailVerified).toEqual(verified);
    expect(result.impersonatorId).toBeUndefined();
  });

  it("regression: a normal update still refreshes emailVerified", async () => {
    const verified = new Date("2024-03-03");
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
      emailVerified: verified,
    } as never);

    const token: Record<string, unknown> = { id: "u1", emailVerified: null };
    const result = await jwt({ token, trigger: "update", session: {} });

    expect(result.emailVerified).toEqual(verified);
  });
});
