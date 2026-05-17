import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    company: { findFirst: vi.fn() },
    filing: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/companies-house/submission-client", () => ({
  submitToCompaniesHouse: vi.fn(),
}));

vi.mock("@/lib/ixbrl/dormant-accounts", () => ({
  generateDormantAccountsIxbrl: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { submitToCompaniesHouse } from "@/lib/companies-house/submission-client";
import { generateDormantAccountsIxbrl } from "@/lib/ixbrl/dormant-accounts";
import { POST } from "@/app/api/file/submit-accounts/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/file/submit-accounts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({
    user: { id: "user-1" },
  } as never);
});

describe("POST /api/file/submit-accounts — subscription gate (Risk 1: filing stays gated)", () => {
  it("blocks a past_due user with 403 'Active subscription required' and never attempts submission", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      subscriptionStatus: "past_due",
    } as never);

    const res = await POST(
      makeRequest({ companyId: "comp-1", companyAuthCode: "AUTH123" }),
    );

    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data).toEqual({ error: "Active subscription required" });

    // The gate must short-circuit BEFORE any filing work happens.
    expect(generateDormantAccountsIxbrl).not.toHaveBeenCalled();
    expect(submitToCompaniesHouse).not.toHaveBeenCalled();
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
  });

  it.each(["cancelled", "none"] as const)(
    "also blocks a %s user with 403 and no submission attempt",
    async (status) => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user-1",
        subscriptionStatus: status,
      } as never);

      const res = await POST(
        makeRequest({ companyId: "comp-1", companyAuthCode: "AUTH123" }),
      );

      expect(res.status).toBe(403);
      expect(submitToCompaniesHouse).not.toHaveBeenCalled();
    },
  );

  it("guard: an active user passes the subscription gate (does not 403 here)", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      subscriptionStatus: "active",
    } as never);

    const res = await POST(makeRequest({ companyId: "comp-1" }));

    // Past the gate — fails later for unrelated reasons, but never 403 here.
    expect(res.status).not.toBe(403);
  });
});
