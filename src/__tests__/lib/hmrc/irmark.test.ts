import { describe, it, expect } from "vitest";
import { calculateIRmark } from "@/lib/hmrc/irmark";

describe("calculateIRmark", () => {
  const sampleBodyXml = `<Body><IRenvelope><IRheader><Keys><Key Type="UTR">1234567890</Key></Keys></IRheader></IRenvelope></Body>`;

  it("returns a base64-encoded string", async () => {
    const result = await calculateIRmark(sampleBodyXml);
    expect(result).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });

  it("returns a non-empty string", async () => {
    const result = await calculateIRmark(sampleBodyXml);
    expect(result.length).toBeGreaterThan(0);
  });

  it("is deterministic — same input produces same output", async () => {
    const result1 = await calculateIRmark(sampleBodyXml);
    const result2 = await calculateIRmark(sampleBodyXml);
    expect(result1).toBe(result2);
  });

  it("produces different output for different input", async () => {
    const otherBodyXml = `<Body><IRenvelope><IRheader><Keys><Key Type="UTR">9999999999</Key></Keys></IRheader></IRenvelope></Body>`;
    const result1 = await calculateIRmark(sampleBodyXml);
    const result2 = await calculateIRmark(otherBodyXml);
    expect(result1).not.toBe(result2);
  });

  it("excludes any existing IRmark element from the hash input", async () => {
    const withIRmark = `<Body><IRenvelope><IRheader><Keys><Key Type="UTR">1234567890</Key></Keys></IRheader></IRenvelope><IRmark Type="generic">SOMEHASH==</IRmark></Body>`;
    const withoutIRmark = `<Body><IRenvelope><IRheader><Keys><Key Type="UTR">1234567890</Key></Keys></IRheader></IRenvelope></Body>`;

    const hashWith = await calculateIRmark(withIRmark);
    const hashWithout = await calculateIRmark(withoutIRmark);

    expect(hashWith).toBe(hashWithout);
  });

  it("produces a SHA-1 length hash (28 chars base64)", async () => {
    const result = await calculateIRmark(sampleBodyXml);
    // SHA-1 produces 20 bytes = 28 base64 characters
    expect(result.length).toBe(28);
  });
});
