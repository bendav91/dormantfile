import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(),
}));

import { notifyAdmins } from "@/lib/email/admin-notifications";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifyAdmins", () => {
  it("sends to every admin", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { email: "a@example.com" },
      { email: "b@example.com" },
    ] as never);

    await notifyAdmins({
      kind: "signup",
      userEmail: "new@user.com",
      userName: "New User",
    });

    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "a@example.com" }),
    );
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "b@example.com" }),
    );
  });

  it("is a silent no-op when no admins exist", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await notifyAdmins({
      kind: "signup",
      userEmail: "new@user.com",
      userName: "New User",
    });

    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("swallows per-send errors so one failure doesn't block others", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([
      { email: "broken@example.com" },
      { email: "working@example.com" },
    ] as never);
    vi.mocked(sendEmail)
      .mockRejectedValueOnce(new Error("Resend rejected"))
      .mockResolvedValueOnce({} as never);

    await expect(
      notifyAdmins({
        kind: "signup",
        userEmail: "new@user.com",
        userName: "New User",
      }),
    ).resolves.not.toThrow();

    expect(sendEmail).toHaveBeenCalledTimes(2);
  });

  it("builds signup subject", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: "admin@x.com" }] as never);

    await notifyAdmins({
      kind: "signup",
      userEmail: "u@u.com",
      userName: "Jane Doe",
    });

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("Jane Doe"),
      }),
    );
  });

  it("builds tier_change subject with direction arrow", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: "admin@x.com" }] as never);

    await notifyAdmins({
      kind: "tier_change",
      userEmail: "u@u.com",
      userName: "Jane",
      fromTier: "basic",
      toTier: "multi",
      direction: "upgrade",
    });

    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect(call.subject).toContain("↑");
    expect(call.subject).toContain("upgraded");
  });

  it("builds payment_succeeded subject with formatted amount", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: "admin@x.com" }] as never);

    await notifyAdmins({
      kind: "payment_succeeded",
      userEmail: "u@u.com",
      userName: "Jane",
      amountPence: 3900,
      currency: "gbp",
      tier: "multi",
      isFirstPayment: true,
    });

    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect(call.subject).toContain("£39.00");
    expect(call.subject).toContain("First payment");
  });

  it("builds payment_failed subject", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: "admin@x.com" }] as never);

    await notifyAdmins({
      kind: "payment_failed",
      userEmail: "u@u.com",
      userName: "Jane",
      tier: "basic",
    });

    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect(call.subject).toContain("Payment failed");
    expect(call.subject).toContain("Jane");
  });

  it("builds subscription_cancelled subject with previous tier", async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([{ email: "admin@x.com" }] as never);

    await notifyAdmins({
      kind: "subscription_cancelled",
      userEmail: "u@u.com",
      userName: "Jane",
      previousTier: "agent",
    });

    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect(call.subject).toContain("Cancelled");
    expect(call.subject).toContain("Agent");
  });
});
