import { describe, it, expect } from "vitest";
import {
  CH_DOCS_NOT_FOUND_GRACE_MS,
  shouldFlagDocumentsNotFound,
} from "@/lib/companies-house/review-policy";

const HOUR = 60 * 60 * 1000;

describe("shouldFlagDocumentsNotFound", () => {
  it("grace window is 48 hours", () => {
    expect(CH_DOCS_NOT_FOUND_GRACE_MS).toBe(48 * HOUR);
  });

  it("does not flag a freshly submitted filing (within grace)", () => {
    const submittedAt = new Date("2026-05-16T12:00:00Z");
    const now = new Date("2026-05-16T13:00:00Z").getTime(); // 1h later
    expect(shouldFlagDocumentsNotFound(submittedAt, now)).toBe(false);
  });

  it("does not flag just before the window elapses (47h59m)", () => {
    const submittedAt = new Date("2026-05-16T12:00:00Z");
    const now = submittedAt.getTime() + CH_DOCS_NOT_FOUND_GRACE_MS - 60 * 1000;
    expect(shouldFlagDocumentsNotFound(submittedAt, now)).toBe(false);
  });

  it("flags exactly at the window boundary (48h)", () => {
    const submittedAt = new Date("2026-05-16T12:00:00Z");
    const now = submittedAt.getTime() + CH_DOCS_NOT_FOUND_GRACE_MS;
    expect(shouldFlagDocumentsNotFound(submittedAt, now)).toBe(true);
  });

  it("flags well beyond the window", () => {
    const submittedAt = new Date("2026-05-14T12:00:00Z");
    const now = new Date("2026-05-16T18:00:00Z").getTime(); // > 48h later
    expect(shouldFlagDocumentsNotFound(submittedAt, now)).toBe(true);
  });

  it("never flags when submittedAt is null (cannot age it — keep polling)", () => {
    const now = new Date("2026-05-16T13:00:00Z").getTime();
    expect(shouldFlagDocumentsNotFound(null, now)).toBe(false);
  });

  it("honours an explicit custom grace window", () => {
    const submittedAt = new Date("2026-05-16T12:00:00Z");
    const now = submittedAt.getTime() + 2 * HOUR;
    expect(shouldFlagDocumentsNotFound(submittedAt, now, 1 * HOUR)).toBe(true);
    expect(shouldFlagDocumentsNotFound(submittedAt, now, 3 * HOUR)).toBe(false);
  });
});
