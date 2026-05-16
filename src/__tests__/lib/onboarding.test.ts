import { describe, it, expect } from "vitest";
import { getOnboardingState, type OnboardingStateInput } from "@/lib/onboarding";

function base(overrides: Partial<OnboardingStateInput> = {}): OnboardingStateInput {
  return {
    companyCount: 0,
    subscriptionStatus: "none",
    hasSubmittedFiling: false,
    dismissedAt: null,
    accountsFilingLive: true,
    ct600FilingLive: true,
    firstCompanyId: null,
    ...overrides,
  };
}

describe("getOnboardingState — step done conditions", () => {
  it("company step done only when companyCount > 0", () => {
    expect(getOnboardingState(base()).steps[0].done).toBe(false);
    expect(getOnboardingState(base({ companyCount: 1 })).steps[0].done).toBe(true);
  });

  it("plan step done for active or cancelling, not for none/past_due/cancelled", () => {
    const done = (s: OnboardingStateInput["subscriptionStatus"]) =>
      getOnboardingState(base({ subscriptionStatus: s })).steps[1].done;
    expect(done("active")).toBe(true);
    expect(done("cancelling")).toBe(true);
    expect(done("none")).toBe(false);
    expect(done("past_due")).toBe(false);
    expect(done("cancelled")).toBe(false);
  });

  it("file step done only when hasSubmittedFiling", () => {
    expect(getOnboardingState(base()).steps[2].done).toBe(false);
    expect(getOnboardingState(base({ hasSubmittedFiling: true })).steps[2].done).toBe(true);
  });
});

describe("getOnboardingState — activeStepKey", () => {
  it("is the first not-done, not-locked step", () => {
    expect(getOnboardingState(base()).activeStepKey).toBe("company");
    expect(getOnboardingState(base({ companyCount: 1 })).activeStepKey).toBe("plan");
    expect(
      getOnboardingState(base({ companyCount: 1, subscriptionStatus: "active" })).activeStepKey,
    ).toBe("file");
  });

  it("is null when all steps done", () => {
    expect(
      getOnboardingState(
        base({ companyCount: 1, subscriptionStatus: "active", hasSubmittedFiling: true }),
      ).activeStepKey,
    ).toBe(null);
  });

  it("is null when every not-done step is locked (pre-launch with company added)", () => {
    const s = getOnboardingState(
      base({ companyCount: 1, accountsFilingLive: false, ct600FilingLive: false }),
    );
    expect(s.activeStepKey).toBe(null);
    expect(s.visible).toBe(true);
    expect(s.steps[1].locked).toBe(true);
    expect(s.steps[2].locked).toBe(true);
  });
});

describe("getOnboardingState — complete & visible", () => {
  it("complete true when hasSubmittedFiling; visible false when complete", () => {
    const s = getOnboardingState(base({ hasSubmittedFiling: true }));
    expect(s.complete).toBe(true);
    expect(s.visible).toBe(false);
  });

  it("visible false when dismissedAt set and not complete", () => {
    const s = getOnboardingState(base({ dismissedAt: new Date() }));
    expect(s.visible).toBe(false);
    expect(s.complete).toBe(false);
  });

  it("dismissed stays dismissed: completing a filing does not resurrect the panel", () => {
    const s = getOnboardingState(base({ hasSubmittedFiling: true, dismissedAt: new Date() }));
    expect(s.complete).toBe(false);
    expect(s.visible).toBe(false);
  });

  it("visible true when not complete and not dismissed", () => {
    expect(getOnboardingState(base()).visible).toBe(true);
  });
});

describe("getOnboardingState — launch-flag matrix", () => {
  it("plan step locked + lockedNote when accounts filing not live", () => {
    const s = getOnboardingState(base({ accountsFilingLive: false }));
    expect(s.steps[1].locked).toBe(true);
    expect(s.steps[1].lockedNote).toBe("Opens soon — we'll email you.");
  });

  it("plan step unlocked, no lockedNote, when accounts filing live", () => {
    const s = getOnboardingState(base({ accountsFilingLive: true }));
    expect(s.steps[1].locked).toBe(false);
    expect(s.steps[1].lockedNote).toBeUndefined();
  });

  it("file step locked + lockedNote + no subLabel when neither path live", () => {
    const s = getOnboardingState(base({ accountsFilingLive: false, ct600FilingLive: false }));
    expect(s.steps[2].locked).toBe(true);
    expect(s.steps[2].subLabel).toBeUndefined();
    expect(s.steps[2].lockedNote).toBe(
      "Filing opens soon — we'll email you the moment it does.",
    );
  });

  it("file step subLabel: both paths live", () => {
    const s = getOnboardingState(base({ accountsFilingLive: true, ct600FilingLive: true }));
    expect(s.steps[2].locked).toBe(false);
    expect(s.steps[2].subLabel).toBe("Accounts or CT600 — whichever's due first.");
  });

  it("file step subLabel: accounts only", () => {
    const s = getOnboardingState(base({ accountsFilingLive: true, ct600FilingLive: false }));
    expect(s.steps[2].subLabel).toBe("File your dormant accounts.");
  });

  it("file step subLabel: CT600 only", () => {
    const s = getOnboardingState(base({ accountsFilingLive: false, ct600FilingLive: true }));
    expect(s.steps[2].subLabel).toBe("File your CT600.");
  });
});

describe("getOnboardingState — file step href", () => {
  it("links to company hub when firstCompanyId present", () => {
    expect(getOnboardingState(base({ firstCompanyId: "c1" })).steps[2].href).toBe(
      "/company/c1",
    );
  });

  it("falls back to /dashboard when firstCompanyId null", () => {
    expect(getOnboardingState(base()).steps[2].href).toBe("/dashboard");
  });
});
