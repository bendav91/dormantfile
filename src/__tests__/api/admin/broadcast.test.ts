import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    broadcastEmail: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(),
}));

import { POST } from "@/app/api/admin/broadcast/route";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";

const adminSession = { user: { id: "admin-1" } } as never;

function makeRequest(body: unknown): Request {
  return new Request("http://test/api/admin/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/admin/broadcast", () => {
  it("rejects non-admin caller (401)", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(null);
    const res = await POST(
      makeRequest({ mode: "send", subject: "x", bodyMarkdown: "y" }) as never,
    );
    expect(res.status).toBe(401);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("validates mode", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(adminSession);
    const res = await POST(
      makeRequest({ mode: "garbage", subject: "x", bodyMarkdown: "y" }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("validates subject is non-empty", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(adminSession);
    const res = await POST(
      makeRequest({ mode: "send", subject: "  ", bodyMarkdown: "y" }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("validates body is non-empty", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(adminSession);
    const res = await POST(
      makeRequest({ mode: "send", subject: "Hello", bodyMarkdown: "" }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("preview mode sends to admin only and does NOT create audit row", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(adminSession);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      email: "admin@example.com",
    } as never);
    vi.mocked(sendEmail).mockResolvedValue({} as never);

    const res = await POST(
      makeRequest({
        mode: "preview",
        subject: "Test",
        bodyMarkdown: "Hello **world**",
      }) as never,
    );

    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect(call.to).toBe("admin@example.com");
    expect(call.subject).toBe("[Preview] Test");
    expect(prisma.broadcastEmail.create).not.toHaveBeenCalled();
  });

  it("send mode sends to all verified users and creates audit row", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(adminSession);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", email: "a@x.com" },
      { id: "u2", email: "b@x.com" },
      { id: "u3", email: "c@x.com" },
    ] as never);
    vi.mocked(sendEmail).mockResolvedValue({} as never);
    vi.mocked(prisma.broadcastEmail.create).mockResolvedValue({ id: "b1" } as never);

    const res = await POST(
      makeRequest({
        mode: "send",
        subject: "Service notice",
        bodyMarkdown: "Body text",
      }) as never,
    );

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(3);
    expect(prisma.broadcastEmail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sentByUserId: "admin-1",
        subject: "Service notice",
        recipientCount: 3,
        sendErrors: 0,
      }),
      select: { id: true },
    });
    expect(json).toEqual({
      ok: true,
      recipientCount: 3,
      sendErrors: 0,
      broadcastId: "b1",
    });
  });

  it("counts and surfaces sendErrors when some sends fail", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(adminSession);
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { id: "u1", email: "a@x.com" },
      { id: "u2", email: "b@x.com" },
    ] as never);
    vi.mocked(sendEmail)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error("Resend rejected"));
    vi.mocked(prisma.broadcastEmail.create).mockResolvedValue({ id: "b1" } as never);

    const res = await POST(
      makeRequest({
        mode: "send",
        subject: "Hi",
        bodyMarkdown: "Hi all",
      }) as never,
    );

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.sendErrors).toBe(1);
    expect(json.recipientCount).toBe(2);
    expect(prisma.broadcastEmail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ sendErrors: 1, recipientCount: 2 }),
      select: { id: true },
    });
  });

  it("rejects subject over 200 chars", async () => {
    vi.mocked(requireAdmin).mockResolvedValue(adminSession);
    const res = await POST(
      makeRequest({
        mode: "send",
        subject: "x".repeat(201),
        bodyMarkdown: "ok",
      }) as never,
    );
    expect(res.status).toBe(400);
  });
});
