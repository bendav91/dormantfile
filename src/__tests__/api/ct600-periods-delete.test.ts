import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    company: { findFirst: vi.fn() },
    filing: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { DELETE } from "@/app/api/company/ct600-periods/route";
import { NextRequest } from "next/server";

function makeRequest(body: Record<string, unknown> | string = {}): NextRequest {
  return new NextRequest("http://localhost/api/company/ct600-periods", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const mockCompany = { id: "comp-1" };

function validBody() {
  return { companyId: "comp-1", filingId: "filing-1" };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } } as never);
  vi.mocked(prisma.company.findFirst).mockResolvedValue(mockCompany as never);
  vi.mocked(prisma.filing.findFirst).mockResolvedValue({
    id: "filing-1",
    status: "outstanding",
  } as never);
  vi.mocked(prisma.filing.delete).mockResolvedValue({} as never);
});

describe("DELETE /api/company/ct600-periods", () => {
  it("1. returns 401 when there is no session", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as never);

    const res = await DELETE(makeRequest(validBody()));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(prisma.company.findFirst).not.toHaveBeenCalled();
  });

  it("2. returns 404 when company is not owned by session user", async () => {
    vi.mocked(prisma.company.findFirst).mockResolvedValue(null as never);

    const res = await DELETE(makeRequest(validBody()));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Company not found" });
    expect(prisma.filing.findFirst).not.toHaveBeenCalled();
  });

  it("3. returns 404 when filingId is not a ct600 of that company", async () => {
    vi.mocked(prisma.filing.findFirst).mockResolvedValue(null as never);

    const res = await DELETE(makeRequest(validBody()));

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Filing not found" });
    expect(prisma.filing.delete).not.toHaveBeenCalled();
  });

  it.each(["submitted", "accepted", "filed_elsewhere", "pending"])(
    "4. returns 409 and does NOT delete when status is '%s'",
    async (status) => {
      vi.mocked(prisma.filing.findFirst).mockResolvedValue({
        id: "filing-1",
        status,
      } as never);

      const res = await DELETE(makeRequest(validBody()));

      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error).toMatch(/submitted or filed/i);
      expect(prisma.filing.delete).not.toHaveBeenCalled();
    },
  );

  it("5. status 'outstanding' → deletes and returns 200 { ok: true }", async () => {
    vi.mocked(prisma.filing.findFirst).mockResolvedValue({
      id: "filing-1",
      status: "outstanding",
    } as never);

    const res = await DELETE(makeRequest(validBody()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.filing.delete).toHaveBeenCalledWith({ where: { id: "filing-1" } });
  });

  it("6. status 'failed' → deletes and returns 200 { ok: true }", async () => {
    vi.mocked(prisma.filing.findFirst).mockResolvedValue({
      id: "filing-1",
      status: "failed",
    } as never);

    const res = await DELETE(makeRequest(validBody()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.filing.delete).toHaveBeenCalledWith({ where: { id: "filing-1" } });
  });

  it("7. status 'rejected' → deletes and returns 200 { ok: true }", async () => {
    vi.mocked(prisma.filing.findFirst).mockResolvedValue({
      id: "filing-1",
      status: "rejected",
    } as never);

    const res = await DELETE(makeRequest(validBody()));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(prisma.filing.delete).toHaveBeenCalledWith({ where: { id: "filing-1" } });
  });
});
