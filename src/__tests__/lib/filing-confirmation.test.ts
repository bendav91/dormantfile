import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(),
}));

import { sendFilingConfirmation } from "@/lib/filing-confirmation";
import { rollForwardPeriod } from "@/lib/roll-forward";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";

const baseArgs = {
  filingId: "filing-1",
  companyId: "comp-1",
  recipient: "owner@example.com",
  companyName: "ACME LIMITED",
  periodStart: new Date("2024-09-01"),
  periodEnd: new Date("2025-08-31"),
  filingType: "accounts" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendFilingConfirmation", () => {
  it("sends the email once and writes exactly one filing_confirmation Notification when none exists", async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);
    vi.mocked(sendEmail).mockResolvedValue({} as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    await sendFilingConfirmation(baseArgs);

    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { filingId: "filing-1", type: "filing_confirmation" },
    });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        idempotencyKey: "filing_confirmation-filing-1",
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: {
        companyId: "comp-1",
        filingId: "filing-1",
        type: "filing_confirmation",
      },
    });
  });

  it("is idempotent: if a filing_confirmation Notification already exists, sends no email and creates no row", async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValue({
      id: "notif-1",
      companyId: "comp-1",
      filingId: "filing-1",
      type: "filing_confirmation",
      sentAt: new Date(),
    } as never);

    await sendFilingConfirmation(baseArgs);

    expect(sendEmail).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("on email transport failure: does not throw, writes NO Notification row, logs structured error", async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);
    vi.mocked(sendEmail).mockRejectedValue(new Error("Resend exploded"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendFilingConfirmation(baseArgs)).resolves.not.toThrow();

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(errSpy).toHaveBeenCalledWith(
      "[filing-confirmation] send failed",
      expect.objectContaining({
        filingId: "filing-1",
        companyId: "comp-1",
        recipient: "owner@example.com",
      }),
    );

    errSpy.mockRestore();
  });

  it("builds the confirmation email from the supplied content fields", async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(null);
    vi.mocked(sendEmail).mockResolvedValue({} as never);
    vi.mocked(prisma.notification.create).mockResolvedValue({} as never);

    await sendFilingConfirmation({ ...baseArgs, filingType: "ct600" });

    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect(call.subject).toContain("ACME LIMITED");
    expect(call.html).toBeTruthy();
  });
});

describe("rollForwardPeriod → sendFilingConfirmation (double-send & skipEmail seam)", () => {
  it("check-status then poll-filings on the same accepted filing: exactly one email, one Notification, second pass emits none", async () => {
    // Drive findFirst off an in-memory store that create() pushes to, so
    // pass 2 genuinely observes the row pass 1 wrote (and matching on the
    // same where-clause catches a `type`-string divergence regression).
    const store: Array<{
      companyId: string;
      filingId: string;
      type: string;
    }> = [];
    vi.mocked(prisma.notification.findFirst).mockImplementation((async (args: {
      where: { filingId: string; type: string };
    }) =>
      store.find(
        (r) =>
          r.filingId === args.where.filingId && r.type === args.where.type,
      ) ?? null) as never);
    vi.mocked(prisma.notification.create).mockImplementation((async (args: {
      data: { companyId: string; filingId: string; type: string };
    }) => {
      store.push(args.data);
      return args.data as never;
    }) as never);
    vi.mocked(sendEmail).mockResolvedValue({} as never);

    // First pass (e.g. manual check-status): no prior row -> send + record.
    await rollForwardPeriod(
      "comp-1",
      new Date("2025-08-31"),
      false,
      "accounts",
      "owner@example.com",
      "ACME LIMITED",
      { filingId: "filing-1", startDate: new Date("2024-09-01"), endDate: new Date("2025-08-31") },
    );

    // Second pass (e.g. cron poll-filings) sees the row written by pass 1.
    await rollForwardPeriod(
      "comp-1",
      new Date("2025-08-31"),
      false,
      "accounts",
      "owner@example.com",
      "ACME LIMITED",
      { filingId: "filing-1", startDate: new Date("2024-09-01"), endDate: new Date("2025-08-31") },
    );

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation" },
    });
  });

  it("mark-filed / filed_elsewhere (skipEmail:true) emits no filing_confirmation and no email", async () => {
    await rollForwardPeriod(
      "comp-1",
      new Date("2025-08-31"),
      false,
      "accounts",
      "owner@example.com",
      "ACME LIMITED",
      { skipEmail: true, startDate: new Date("2024-09-01"), endDate: new Date("2025-08-31") },
    );

    expect(prisma.notification.findFirst).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});
