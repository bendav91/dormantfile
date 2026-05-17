import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => ({
  prisma: {
    filing: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
  },
}));

interface SentEmail {
  to: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}
const sendEmailMock = vi.fn<(arg: SentEmail) => Promise<unknown>>();
vi.mock("@/lib/email/client", () => ({
  sendEmail: (arg: SentEmail) => sendEmailMock(arg),
}));

vi.mock("@/lib/email/mute-token", () => ({
  generateMuteUrl: (userId: string) => `https://app.test/mute/${userId}`,
}));

import { prisma } from "@/lib/db";
import { GET } from "@/app/api/cron/reminders/route";
import { NextRequest } from "next/server";

function makeRequest(secret?: string): NextRequest {
  return new NextRequest("http://localhost/api/cron/reminders", {
    headers: secret ? { authorization: `Bearer ${secret}` } : {},
  });
}

// Mirrors the create-periods.test.ts idiom for reading mock-call args
// without fighting Prisma's deeply-optional where types in tests.
/* eslint-disable @typescript-eslint/no-explicit-any */
function callsOf(fn: unknown): any[][] {
  return (fn as unknown as ReturnType<typeof vi.fn>).mock.calls as any[][];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// Frozen "now". 25 days out (deadline = now + 25d) crosses the *_due_30 tier
// for both the reminder and lapsed tracks; 10 days overdue crosses *_overdue_7.
const NOW = new Date("2026-05-17T08:00:00.000Z");
const DEADLINE_DUE_30 = new Date(NOW.getTime() + 25 * 24 * 60 * 60 * 1000);
const DEADLINE_OVERDUE_7 = new Date(NOW.getTime() - 10 * 24 * 60 * 60 * 1000);

function filing(opts: {
  id: string;
  companyId: string;
  userId: string;
  email: string;
  name: string;
  subscriptionStatus: string;
  deadline: Date;
  companyDeleted?: boolean;
  status?: string;
  notifications?: { type: string }[];
}) {
  return {
    id: opts.id,
    companyId: opts.companyId,
    status: opts.status ?? "outstanding",
    deadline: opts.deadline,
    company: {
      companyName: `Co ${opts.companyId}`,
      deletedAt: opts.companyDeleted ? NOW : null,
      user: {
        id: opts.userId,
        email: opts.email,
        name: opts.name,
        subscriptionStatus: opts.subscriptionStatus,
      },
    },
    notifications: opts.notifications ?? [],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.stubEnv("CRON_SECRET", "test-secret");
  vi.stubEnv("NEXT_PUBLIC_FILING_LIVE", "true");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.test");
  sendEmailMock.mockResolvedValue({ data: { id: "msg_1" }, error: null });
  vi.mocked(prisma.notification.createMany).mockResolvedValue({ count: 0 } as never);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("GET /api/cron/reminders — auth & gating (unchanged)", () => {
  it("401 without a valid bearer token", async () => {
    const res = await GET(makeRequest("wrong"));
    expect(res.status).toBe(401);
    expect(prisma.filing.findMany).not.toHaveBeenCalled();
  });

  it("no-ops when filing is not live", async () => {
    vi.stubEnv("NEXT_PUBLIC_FILING_LIVE", "false");
    const res = await GET(makeRequest("test-secret"));
    expect(await res.json()).toEqual({ sent: 0, skipped: "filing not live" });
    expect(prisma.filing.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/reminders — Covered path UNCHANGED", () => {
  it("the query no longer hard-filters subscriptionStatus to active/cancelling (lapsed must be loadable), but still excludes deleted companies and muted users", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([] as never);
    await GET(makeRequest("test-secret"));

    const [arg] = callsOf(prisma.filing.findMany)[0];
    // Covered-only restriction is gone so Lapsed users surface...
    expect(arg.where.company.user.subscriptionStatus).toBeUndefined();
    // ...but the rest of the predicate that the Covered path relied on stays.
    expect(arg.where.status).toBe("outstanding");
    expect(arg.where.filingType).toBe("accounts");
    expect(arg.where.suppressedAt).toBeNull();
    expect(arg.where.company.deletedAt).toBeNull();
    expect(arg.where.company.user.remindersMuted).toBe(false);
  });

  it("an active (Covered) user crossing due_30 still gets the existing consolidated reminder, recorded as reminder_due_30", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-active",
        companyId: "c-active",
        userId: "u-active",
        email: "active@test.com",
        name: "Active User",
        subscriptionStatus: "active",
        deadline: DEADLINE_DUE_30,
      }),
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1 });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const emailArg = callsOf(sendEmailMock)[0][0];
    expect(emailArg.to).toBe("active@test.com");
    // Existing reminder copy (not the lapsed/win-back template).
    expect(emailArg.subject).toMatch(/Filing reminder/);
    expect(emailArg.html).not.toMatch(/subscription/i);

    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    const created = callsOf(prisma.notification.createMany)[0][0]
      .data as Array<{ type: string; filingId: string; companyId: string }>;
    expect(created).toEqual([
      { companyId: "c-active", filingId: "f-active", type: "reminder_due_30" },
    ]);
  });

  it("cancelling is Covered too — existing reminder path, reminder_* type", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-canc",
        companyId: "c-canc",
        userId: "u-canc",
        email: "canc@test.com",
        name: "Cancelling User",
        subscriptionStatus: "cancelling",
        deadline: DEADLINE_OVERDUE_7,
      }),
    ] as never);

    await GET(makeRequest("test-secret"));

    const created = callsOf(prisma.notification.createMany)[0][0]
      .data as Array<{ type: string }>;
    expect(created[0].type).toBe("reminder_overdue_7");
    expect(callsOf(sendEmailMock)[0][0].subject).toMatch(/overdue/i);
  });

  it("Covered user whose tier was already sent → no email (existing idempotency)", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-act2",
        companyId: "c-act2",
        userId: "u-act2",
        email: "act2@test.com",
        name: "Act2",
        subscriptionStatus: "active",
        deadline: DEADLINE_DUE_30,
        notifications: [{ type: "reminder_due_30" }],
      }),
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(await res.json()).toEqual({ sent: 0 });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/reminders — Lapsed win-back track", () => {
  it("a cancelled user crossing due_30 gets the honest reactivate-only template, recorded as lapsed_due_30", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-lap",
        companyId: "c-lap",
        userId: "u-lap",
        email: "lapsed@test.com",
        name: "Lapsed User",
        subscriptionStatus: "cancelled",
        deadline: DEADLINE_DUE_30,
      }),
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: 1 });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const emailArg = callsOf(sendEmailMock)[0][0];
    expect(emailArg.to).toBe("lapsed@test.com");
    // Honest, reactivate-only copy: says the plan ended & we're NOT filing,
    // with a reactivate CTA, and NEVER mentions WebFiling / free routes.
    expect(emailArg.html).toMatch(/not filing|won't be filed|will not be filed/i);
    expect(emailArg.html).toMatch(/reactivat/i);
    expect(emailArg.html).not.toMatch(/webfiling/i);

    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    const created = callsOf(prisma.notification.createMany)[0][0]
      .data as Array<{ type: string; filingId: string; companyId: string }>;
    expect(created).toEqual([
      { companyId: "c-lap", filingId: "f-lap", type: "lapsed_due_30" },
    ]);
  });

  it("past_due and none subscription statuses also get the lapsed track", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-pd",
        companyId: "c-pd",
        userId: "u-pd",
        email: "pd@test.com",
        name: "PastDue",
        subscriptionStatus: "past_due",
        deadline: DEADLINE_OVERDUE_7,
      }),
      filing({
        id: "f-none",
        companyId: "c-none",
        userId: "u-none",
        email: "none@test.com",
        name: "None",
        subscriptionStatus: "none",
        deadline: DEADLINE_DUE_30,
      }),
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(await res.json()).toEqual({ sent: 2 });

    const types = callsOf(prisma.notification.createMany).flatMap((c) =>
      (c[0].data as Array<{ type: string }>).map((d) => d.type),
    );
    expect(types).toContain("lapsed_overdue_7");
    expect(types).toContain("lapsed_due_30");
  });

  it("cap: a lapsed period with 3 prior lapsed_* notifications gets nothing", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-cap",
        companyId: "c-cap",
        userId: "u-cap",
        email: "cap@test.com",
        name: "Capped",
        subscriptionStatus: "cancelled",
        deadline: DEADLINE_OVERDUE_7,
        notifications: [
          { type: "lapsed_due_90" },
          { type: "lapsed_due_30" },
          { type: "lapsed_due_1" },
        ],
      }),
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(await res.json()).toEqual({ sent: 0 });
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it("30-day grace: a lapsed filing 90 days overdue gets nothing (never lapsed_overdue_90)", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-old",
        companyId: "c-old",
        userId: "u-old",
        email: "old@test.com",
        name: "Old",
        subscriptionStatus: "cancelled",
        deadline: new Date(NOW.getTime() - 90 * 24 * 60 * 60 * 1000),
      }),
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(await res.json()).toEqual({ sent: 0 });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("Stop: a soft-deleted company under a lapsed sub gets nothing", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-del",
        companyId: "c-del",
        userId: "u-del",
        email: "del@test.com",
        name: "Deleted",
        subscriptionStatus: "cancelled",
        deadline: DEADLINE_DUE_30,
        companyDeleted: true,
      }),
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(await res.json()).toEqual({ sent: 0 });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("muted lapsed user → cron sends nothing (mute enforced at the shared query predicate, so no lapsed_* email or notification)", async () => {
    // Mute is enforced by the single findMany predicate
    // (company.user.remindersMuted: false) that BOTH cohorts share, so a
    // cancelled/lapsed user who has muted reminders is filtered out before
    // cohort classification — the lapsed win-back track inherits the opt-out.
    // A muted user therefore never reaches the query result set.
    vi.mocked(prisma.filing.findMany).mockResolvedValue([] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(await res.json()).toEqual({ sent: 0 });

    // The query the cron issued must carry the mute guard for everyone.
    const [arg] = callsOf(prisma.filing.findMany)[0];
    expect(arg.where.company.user.remindersMuted).toBe(false);

    // No win-back email, no lapsed_* notification recorded.
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it("lapsed tier already sent → no re-send (per-tier idempotency, reuses notification history)", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-dup",
        companyId: "c-dup",
        userId: "u-dup",
        email: "dup@test.com",
        name: "Dup",
        subscriptionStatus: "cancelled",
        deadline: DEADLINE_DUE_30,
        notifications: [{ type: "lapsed_due_30" }],
      }),
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(await res.json()).toEqual({ sent: 0 });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("GET /api/cron/reminders — mixed cohorts in one run", () => {
  it("Covered gets the reminder template, Lapsed gets the win-back template, Stop gets nothing — independently", async () => {
    vi.mocked(prisma.filing.findMany).mockResolvedValue([
      filing({
        id: "f-cov",
        companyId: "c-cov",
        userId: "u-cov",
        email: "cov@test.com",
        name: "Cov",
        subscriptionStatus: "active",
        deadline: DEADLINE_DUE_30,
      }),
      filing({
        id: "f-lap",
        companyId: "c-lap",
        userId: "u-lap",
        email: "lap@test.com",
        name: "Lap",
        subscriptionStatus: "cancelled",
        deadline: DEADLINE_DUE_30,
      }),
      filing({
        id: "f-stop",
        companyId: "c-stop",
        userId: "u-stop",
        email: "stop@test.com",
        name: "Stop",
        subscriptionStatus: "none",
        deadline: DEADLINE_DUE_30,
        companyDeleted: true,
      }),
    ] as never);

    const res = await GET(makeRequest("test-secret"));
    expect(await res.json()).toEqual({ sent: 2 });

    const byTo = new Map(
      callsOf(sendEmailMock).map((c) => [c[0].to as string, c[0] as { html: string; subject: string }]),
    );
    expect(byTo.has("cov@test.com")).toBe(true);
    expect(byTo.has("lap@test.com")).toBe(true);
    expect(byTo.has("stop@test.com")).toBe(false);

    expect(byTo.get("cov@test.com")!.html).not.toMatch(/reactivat/i);
    expect(byTo.get("lap@test.com")!.html).toMatch(/reactivat/i);

    const allTypes = callsOf(prisma.notification.createMany).flatMap((c) =>
      (c[0].data as Array<{ type: string }>).map((d) => d.type),
    );
    expect(allTypes).toEqual(
      expect.arrayContaining(["reminder_due_30", "lapsed_due_30"]),
    );
    expect(allTypes).not.toContain("lapsed_due_30".replace("lapsed", "stop"));
  });
});
