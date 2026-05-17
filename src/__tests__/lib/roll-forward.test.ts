import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/filing-confirmation", () => ({
  sendFilingConfirmation: vi.fn(),
}));

import { rollForwardPeriod } from "@/lib/roll-forward";
import { sendFilingConfirmation } from "@/lib/filing-confirmation";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rollForwardPeriod — confirmation rewire", () => {
  it("invokes sendFilingConfirmation with threaded filing identity + content on the genuine-acceptance path", async () => {
    await rollForwardPeriod(
      "comp-1",
      new Date("2025-08-31"),
      false,
      "accounts",
      "owner@example.com",
      "ACME LIMITED",
      {
        filingId: "filing-1",
        startDate: new Date("2024-09-01"),
        endDate: new Date("2025-08-31"),
      },
    );

    expect(sendFilingConfirmation).toHaveBeenCalledTimes(1);
    expect(sendFilingConfirmation).toHaveBeenCalledWith({
      filingId: "filing-1",
      companyId: "comp-1",
      recipient: "owner@example.com",
      companyName: "ACME LIMITED",
      periodStart: new Date("2024-09-01"),
      periodEnd: new Date("2025-08-31"),
      filingType: "accounts",
    });
  });

  it("never throws even if sendFilingConfirmation rejects (must not block acceptance)", async () => {
    vi.mocked(sendFilingConfirmation).mockRejectedValue(new Error("boom"));

    await expect(
      rollForwardPeriod(
        "comp-1",
        new Date("2025-08-31"),
        false,
        "accounts",
        "owner@example.com",
        "ACME LIMITED",
        { filingId: "filing-1" },
      ),
    ).resolves.not.toThrow();
  });

  it("skipEmail path (mark-filed / filed_elsewhere) emits NOTHING — no confirmation, no email", async () => {
    await rollForwardPeriod(
      "comp-1",
      new Date("2025-08-31"),
      false,
      "accounts",
      "owner@example.com",
      "ACME LIMITED",
      { skipEmail: true, startDate: new Date("2024-09-01"), endDate: new Date("2025-08-31") },
    );

    expect(sendFilingConfirmation).not.toHaveBeenCalled();
  });
});
