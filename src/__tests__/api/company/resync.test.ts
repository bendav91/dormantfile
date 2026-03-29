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
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(),
}));

vi.mock("@/lib/companies-house/resync", () => ({
  resyncFromCompaniesHouse: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { resyncFromCompaniesHouse } from "@/lib/companies-house/resync";
import { POST } from "@/app/api/company/resync/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest("http://localhost/api/company/resync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const mockUser = { id: "user-1", subscriptionStatus: "active" };
const mockCompany = { id: "comp-1", userId: "user-1", deletedAt: null };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
  vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as never);
  vi.mocked(prisma.company.findFirst).mockResolvedValue(mockCompany as never);
  vi.mocked(rateLimit).mockReturnValue({ success: true, remaining: 4 });
  vi.mocked(resyncFromCompaniesHouse).mockResolvedValue({ newFilingsCount: 0 });
});

describe("POST /api/company/resync", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await POST(makeRequest({ companyId: "comp-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when subscription is not active", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      subscriptionStatus: "expired",
    } as never);

    const res = await POST(makeRequest({ companyId: "comp-1" }));
    expect(res.status).toBe(403);
  });

  it("allows cancelling subscription status", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: "user-1",
      subscriptionStatus: "cancelling",
    } as never);

    const res = await POST(makeRequest({ companyId: "comp-1" }));
    expect(res.status).toBe(200);
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(rateLimit).mockReturnValue({ success: false, remaining: 0 });

    const res = await POST(makeRequest({ companyId: "comp-1" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when companyId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when company not found or not owned by user", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValue(null);

    const res = await POST(makeRequest({ companyId: "comp-unknown" }));
    expect(res.status).toBe(404);
  });

  it("calls resyncFromCompaniesHouse and returns result", async () => {
    vi.mocked(resyncFromCompaniesHouse).mockResolvedValue({ newFilingsCount: 2 });

    const res = await POST(makeRequest({ companyId: "comp-1" }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ newFilingsCount: 2 });
    expect(resyncFromCompaniesHouse).toHaveBeenCalledWith("comp-1");
  });

  it("returns 502 when CH API fails", async () => {
    vi.mocked(resyncFromCompaniesHouse).mockResolvedValue({
      newFilingsCount: 0,
      error: "CH API returned 500",
    });

    const res = await POST(makeRequest({ companyId: "comp-1" }));
    expect(res.status).toBe(502);

    const data = await res.json();
    expect(data.error).toBe("CH API returned 500");
  });

  it("verifies company belongs to authenticated user", async () => {
    await POST(makeRequest({ companyId: "comp-1" }));

    expect(prisma.company.findFirst).toHaveBeenCalledWith({
      where: { id: "comp-1", userId: "user-1", deletedAt: null },
    });
  });

  it("rate limits by user id", async () => {
    await POST(makeRequest({ companyId: "comp-1" }));

    expect(rateLimit).toHaveBeenCalledWith("resync:user-1", 5, 60_000);
  });
});
