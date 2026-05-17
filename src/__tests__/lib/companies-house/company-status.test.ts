import { describe, it, expect } from "vitest";
import {
  classifyCompanyStatus,
  detectStatusTransition,
} from "@/lib/companies-house/company-status";

describe("classifyCompanyStatus", () => {
  it("treats explicit closure statuses as gone", () => {
    for (const s of [
      "dissolved",
      "liquidation",
      "receivership",
      "administration",
      "converted-closed",
      "removed",
      "DISSOLVED",
    ]) {
      expect(classifyCompanyStatus(s)).toBe("gone");
    }
  });

  it("treats active as active", () => {
    expect(classifyCompanyStatus("active")).toBe("active");
    expect(classifyCompanyStatus("ACTIVE")).toBe("active");
  });

  it("treats null / on-register-but-not-closed statuses as unknown", () => {
    expect(classifyCompanyStatus(null)).toBe("unknown");
    expect(classifyCompanyStatus(undefined)).toBe("unknown");
    // Still on the register — not a closure, but not the canonical 'active'.
    expect(classifyCompanyStatus("voluntary-arrangement")).toBe("unknown");
    expect(classifyCompanyStatus("insolvency-proceedings")).toBe("unknown");
  });
});

describe("detectStatusTransition", () => {
  it("flags an active company that has gone", () => {
    expect(detectStatusTransition(false, "dissolved")).toBe("became_gone");
  });

  it("does not re-flag an already-flagged company", () => {
    expect(detectStatusTransition(true, "dissolved")).toBeNull();
  });

  it("unflags a flagged company that is active again", () => {
    expect(detectStatusTransition(true, "active")).toBe("reinstated");
  });

  it("does not unflag on an unknown / ambiguous status", () => {
    // A flagged company whose status is null or a non-active register state
    // must stay flagged — only an explicit 'active' clears it.
    expect(detectStatusTransition(true, null)).toBeNull();
    expect(detectStatusTransition(true, "voluntary-arrangement")).toBeNull();
  });

  it("no transition when nothing changed", () => {
    expect(detectStatusTransition(false, "active")).toBeNull();
    expect(detectStatusTransition(false, null)).toBeNull();
  });
});
