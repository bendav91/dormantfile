import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => {
  resetRateLimits();
});

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    const result = rateLimit("test-ip", 3, 60000);
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests over the limit", () => {
    rateLimit("test-ip", 2, 60000);
    rateLimit("test-ip", 2, 60000);
    const result = rateLimit("test-ip", 2, 60000);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("tracks different keys independently", () => {
    rateLimit("ip-1", 1, 60000);
    const result = rateLimit("ip-2", 1, 60000);
    expect(result.success).toBe(true);
  });
});
