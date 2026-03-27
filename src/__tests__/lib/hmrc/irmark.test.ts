import { describe, it, expect } from "vitest";
import { calculateIRmark } from "@/lib/hmrc/irmark";

describe("calculateIRmark", () => {
  const sampleBodyXml = `<Body><IRenvelope><IRheader><Keys><Key Type="UTR">1234567890</Key></Keys></IRheader></IRenvelope></Body>`;

  it("returns a base64-encoded string", () => {
    const result = calculateIRmark(sampleBodyXml);
    expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("returns a non-empty string", () => {
    const result = calculateIRmark(sampleBodyXml);
    expect(result.length).toBeGreaterThan(0);
  });

  it("is deterministic — same input produces same output", () => {
    const result1 = calculateIRmark(sampleBodyXml);
    const result2 = calculateIRmark(sampleBodyXml);
    expect(result1).toBe(result2);
  });

  it("produces different output for different input", () => {
    const otherBodyXml = `<Body><IRenvelope><IRheader><Keys><Key Type="UTR">9999999999</Key></Keys></IRheader></IRenvelope></Body>`;
    const result1 = calculateIRmark(sampleBodyXml);
    const result2 = calculateIRmark(otherBodyXml);
    expect(result1).not.toBe(result2);
  });

  it("excludes any existing IRmark element from the hash input", () => {
    const withIRmark = `<Body><IRenvelope><IRheader><Keys><Key Type="UTR">1234567890</Key></Keys></IRheader></IRenvelope><IRmark Type="generic">SOMEHASH==</IRmark></Body>`;
    const withoutIRmark = `<Body><IRenvelope><IRheader><Keys><Key Type="UTR">1234567890</Key></Keys></IRheader></IRenvelope></Body>`;

    const hashWith = calculateIRmark(withIRmark);
    const hashWithout = calculateIRmark(withoutIRmark);

    // Both should produce the same hash since IRmark is excluded
    expect(hashWith).toBe(hashWithout);
  });
});
