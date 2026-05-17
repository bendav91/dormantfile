import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    notification: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    filing: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(),
}));

import {
  sendFilingConfirmation,
  drainPendingFilingConfirmations,
} from "@/lib/filing-confirmation";
import { rollForwardPeriod } from "@/lib/roll-forward";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";

/**
 * In-memory Notification store helper. Models the real semantics: dedupe is
 * by querying existing rows of a given type for a filing (no unique
 * constraint). `findFirst` returns the first matching row, `findMany`
 * returns all matches, `count` counts matches, `create` appends.
 */
function makeNotificationStore(
  seed: Array<{ companyId: string; filingId: string; type: string }> = [],
) {
  const store = seed.map((r) => ({ ...r }));
  vi.mocked(prisma.notification.findFirst).mockImplementation((async (args: {
    where: { filingId: string; type: string };
  }) =>
    store.find(
      (r) =>
        r.filingId === args.where.filingId && r.type === args.where.type,
    ) ?? null) as never);
  vi.mocked(prisma.notification.findMany).mockImplementation((async (args: {
    where: { filingId?: string; type?: string };
  }) =>
    store.filter(
      (r) =>
        (args.where.filingId === undefined ||
          r.filingId === args.where.filingId) &&
        (args.where.type === undefined || r.type === args.where.type),
    )) as never);
  vi.mocked(prisma.notification.count).mockImplementation((async (args: {
    where: { filingId: string; type: string };
  }) =>
    store.filter(
      (r) =>
        r.filingId === args.where.filingId && r.type === args.where.type,
    ).length) as never);
  vi.mocked(prisma.notification.create).mockImplementation((async (args: {
    data: { companyId: string; filingId: string; type: string };
  }) => {
    store.push({ ...args.data });
    return args.data as never;
  }) as never);
  return store;
}

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
    // Unit A superset: a durable `filing_confirmation_pending` marker is now
    // written before the send (Task D durability) so a crash right after
    // acceptance is recoverable. Unit A's outward contract is unchanged: at
    // most one email, `filing_confirmation` is THE success/idempotency key,
    // written exactly once. Drive off the in-memory store so the new pending
    // write and the success write coexist with correct dedupe semantics.
    makeNotificationStore();
    vi.mocked(sendEmail).mockResolvedValue({} as never);

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
    // The success/idempotency/audit key is written exactly once.
    const successCreates = vi
      .mocked(prisma.notification.create)
      .mock.calls.filter(
        (c) => (c[0] as { data: { type: string } }).data.type ===
          "filing_confirmation",
      );
    expect(successCreates).toHaveLength(1);
    expect(successCreates[0][0]).toEqual({
      data: {
        companyId: "comp-1",
        filingId: "filing-1",
        type: "filing_confirmation",
      },
    });
    // Durable pending marker written before the send (superset behaviour).
    const pendingCreates = vi
      .mocked(prisma.notification.create)
      .mock.calls.filter(
        (c) => (c[0] as { data: { type: string } }).data.type ===
          "filing_confirmation_pending",
      );
    expect(pendingCreates).toHaveLength(1);
  });

  it("is idempotent: if a filing_confirmation Notification already exists, sends no email and writes no new filing_confirmation row", async () => {
    // Unit A superset: outward contract preserved (no email, no duplicate
    // success row when already confirmed). Seed the store with the existing
    // success marker so the early-return short-circuits.
    makeNotificationStore([
      { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation" },
    ]);

    await sendFilingConfirmation(baseArgs);

    expect(sendEmail).not.toHaveBeenCalled();
    const successCreates = vi
      .mocked(prisma.notification.create)
      .mock.calls.filter(
        (c) => (c[0] as { data: { type: string } }).data.type ===
          "filing_confirmation",
      );
    expect(successCreates).toHaveLength(0);
  });

  it("already confirmed but NO pending row exists: writes no _pending/_attempt/filing_confirmation row, sends no email, does not throw", async () => {
    // Regression guard (Unit D review fix #1): pre-Unit-D filings were
    // confirmed by the old inline path and so have a `filing_confirmation`
    // row but NO `filing_confirmation_pending` row. Every later
    // rollForwardPeriod re-entry (manual check-status + cron) reaches the
    // accepted filing and used to write a fresh dead `_pending` row forever
    // (unbounded junk-row accumulation on a hot path). `sendFilingConfirmation`
    // must short-circuit on the confirmed row BEFORE writing `_pending`.
    makeNotificationStore([
      { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation" },
    ]);

    await expect(sendFilingConfirmation(baseArgs)).resolves.not.toThrow();

    expect(sendEmail).not.toHaveBeenCalled();
    // No notification row of ANY type is created on the already-confirmed
    // re-entry path.
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it("on email transport failure: does not throw, writes NO filing_confirmation row, logs structured error", async () => {
    // Unit A superset: still no success row, still no throw, still the same
    // structured log. Task D additionally appends a `filing_confirmation_attempt`
    // row to track durability — that is the legitimate added behaviour.
    makeNotificationStore();
    vi.mocked(sendEmail).mockRejectedValue(new Error("Resend exploded"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendFilingConfirmation(baseArgs)).resolves.not.toThrow();

    const successCreates = vi
      .mocked(prisma.notification.create)
      .mock.calls.filter(
        (c) => (c[0] as { data: { type: string } }).data.type ===
          "filing_confirmation",
      );
    expect(successCreates).toHaveLength(0);
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
  it("check-status then poll-filings on the same accepted filing: exactly one email, one filing_confirmation, second pass emits none", async () => {
    // Drive findFirst/create off an in-memory store so pass 2 genuinely
    // observes the rows pass 1 wrote (and matching on the same where-clause
    // catches a `type`-string divergence regression).
    makeNotificationStore();
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
    // The success/idempotency/audit key is written exactly once across both
    // passes (Unit A outward contract preserved; pending marker is the
    // superset addition and is also written at most once).
    const successCreates = vi
      .mocked(prisma.notification.create)
      .mock.calls.filter(
        (c) => (c[0] as { data: { type: string } }).data.type ===
          "filing_confirmation",
      );
    expect(successCreates).toHaveLength(1);
    expect(successCreates[0][0]).toEqual({
      data: { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation" },
    });
    const pendingCreates = vi
      .mocked(prisma.notification.create)
      .mock.calls.filter(
        (c) => (c[0] as { data: { type: string } }).data.type ===
          "filing_confirmation_pending",
      );
    expect(pendingCreates).toHaveLength(1);
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

/**
 * A Filing row as the drain reads it (mirrors poll-filings' include shape):
 * the durable email content lives on the Filing + Company + User, not on the
 * Notification, so the drain reconstructs the confirmation from there.
 */
function filingRow(
  id: string,
  companyId: string,
  email = "owner@example.com",
) {
  return {
    id,
    companyId,
    filingType: "accounts",
    periodStart: new Date("2024-09-01"),
    periodEnd: new Date("2025-08-31"),
    startDate: new Date("2024-09-01"),
    endDate: new Date("2025-08-31"),
    company: {
      companyName: "ACME LIMITED",
      user: { email },
    },
  };
}

describe("drainPendingFilingConfirmations", () => {
  it("(i) retries a confirmation whose inline send failed (pending, no success, 1 attempt) on the next drain", async () => {
    const store = makeNotificationStore([
      { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation_pending" },
      { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation_attempt" },
    ]);
    vi.mocked(prisma.filing.findUnique).mockResolvedValue(
      filingRow("filing-1", "comp-1") as never,
    );
    vi.mocked(sendEmail).mockResolvedValue({} as never);

    const stuck = await drainPendingFilingConfirmations();

    // One more send attempt was made and it succeeded -> success row written.
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "owner@example.com",
        idempotencyKey: "filing_confirmation-filing-1",
      }),
    );
    expect(
      store.some((r) => r.type === "filing_confirmation" && r.filingId === "filing-1"),
    ).toBe(true);
    expect(stuck).toEqual([]);
  });

  it("(ii) after the 3rd failed attempt writes filing_confirmation_failed, returns it as stuck, and never retries again", async () => {
    // 2 prior failed attempts + pending; this drain makes the 3rd failed
    // attempt -> cap reached -> failed marker + stuck.
    const store = makeNotificationStore([
      { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation_pending" },
      { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation_attempt" },
      { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation_attempt" },
    ]);
    vi.mocked(prisma.filing.findUnique).mockResolvedValue(
      filingRow("filing-1", "comp-1") as never,
    );
    vi.mocked(sendEmail).mockRejectedValue(new Error("Resend down"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const stuck1 = await drainPendingFilingConfirmations();

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(
      store.filter((r) => r.type === "filing_confirmation_attempt").length,
    ).toBe(3);
    expect(
      store.some((r) => r.type === "filing_confirmation_failed"),
    ).toBe(true);
    expect(stuck1).toEqual([
      { filingId: "filing-1", companyId: "comp-1", attempts: 3 },
    ]);

    // Second drain: item now has a `failed` marker -> no longer owed, not
    // retried, not re-reported.
    vi.mocked(sendEmail).mockClear();
    const stuck2 = await drainPendingFilingConfirmations();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(stuck2).toEqual([]);

    errSpy.mockRestore();
  });

  it("(iii) never retries or re-sends an already-succeeded item (filing_confirmation present)", async () => {
    makeNotificationStore([
      { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation_pending" },
      { companyId: "comp-1", filingId: "filing-1", type: "filing_confirmation" },
    ]);
    vi.mocked(prisma.filing.findUnique).mockResolvedValue(
      filingRow("filing-1", "comp-1") as never,
    );
    vi.mocked(sendEmail).mockResolvedValue({} as never);

    const stuck = await drainPendingFilingConfirmations();

    expect(sendEmail).not.toHaveBeenCalled();
    expect(stuck).toEqual([]);
  });

  it("(iv) a pending item that succeeds on a drain attempt writes filing_confirmation and drops out of owed", async () => {
    const store = makeNotificationStore([
      { companyId: "comp-2", filingId: "filing-2", type: "filing_confirmation_pending" },
    ]);
    vi.mocked(prisma.filing.findUnique).mockResolvedValue(
      filingRow("filing-2", "comp-2") as never,
    );
    vi.mocked(sendEmail).mockResolvedValue({} as never);

    const stuck1 = await drainPendingFilingConfirmations();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(
      store.some((r) => r.type === "filing_confirmation" && r.filingId === "filing-2"),
    ).toBe(true);
    expect(stuck1).toEqual([]);

    // Next drain: success row present -> no longer owed.
    vi.mocked(sendEmail).mockClear();
    const stuck2 = await drainPendingFilingConfirmations();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(stuck2).toEqual([]);
  });

  it("(vi) one failing item in the drain does not prevent other items being processed", async () => {
    const store = makeNotificationStore([
      { companyId: "comp-1", filingId: "filing-bad", type: "filing_confirmation_pending" },
      { companyId: "comp-2", filingId: "filing-good", type: "filing_confirmation_pending" },
    ]);
    // The bad item's Filing lookup throws; the good item resolves normally.
    vi.mocked(prisma.filing.findUnique).mockImplementation((async (args: {
      where: { id: string };
    }) => {
      if (args.where.id === "filing-bad") throw new Error("DB blew up");
      return filingRow("filing-good", "comp-2") as never;
    }) as never);
    vi.mocked(sendEmail).mockResolvedValue({} as never);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const stuck = await drainPendingFilingConfirmations();

    // The good item still got sent + recorded despite the bad item throwing.
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "filing_confirmation-filing-good" }),
    );
    expect(
      store.some((r) => r.type === "filing_confirmation" && r.filingId === "filing-good"),
    ).toBe(true);
    expect(stuck).toEqual([]);

    errSpy.mockRestore();
  });
});
