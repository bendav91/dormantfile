import { describe, it, expect } from "vitest";
import { buildGovTalkMessage, buildPollMessage } from "@/lib/hmrc/xml-builder";
import type { CT600Data, HmrcCredentials, VendorCredentials } from "@/lib/hmrc/types";

const ct600: CT600Data = {
  companyName: "Test Dormant Ltd",
  uniqueTaxReference: "1234567890",
  periodStart: new Date("2024-01-01"),
  periodEnd: new Date("2024-12-31"),
  declarantName: "John Smith",
  declarantStatus: "Director",
};

const credentials: HmrcCredentials = {
  gatewayUsername: "testuser",
  gatewayPassword: "testpass",
};

const vendor: VendorCredentials = {
  vendorId: "vendor123",
  senderId: "sender456",
  senderPassword: "senderpass",
};

describe("buildGovTalkMessage", () => {
  let xml: string;

  beforeEach(() => {
    xml = buildGovTalkMessage(ct600, credentials, vendor);
  });

  it("produces a valid XML document with declaration", () => {
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<GovTalkMessage");
  });

  it("includes the correct HMRC submission class", () => {
    expect(xml).toContain("HMRC-CT-CT600-TIL");
  });

  it("includes gateway credentials", () => {
    expect(xml).toContain("testuser");
    expect(xml).toContain("testpass");
  });

  it("includes vendor credentials", () => {
    expect(xml).toContain("vendor123");
  });

  it("includes company name", () => {
    expect(xml).toContain("Test Dormant Ltd");
  });

  it("includes the UTR", () => {
    expect(xml).toContain("1234567890");
  });

  it("includes zero financial values for nil return", () => {
    expect(xml).toContain("<Turnover>0</Turnover>");
    expect(xml).toContain("<TaxPayable>0</TaxPayable>");
  });

  it("includes an IRmark element", () => {
    expect(xml).toContain("IRmark");
  });

  it("includes declarant name and status", () => {
    expect(xml).toContain("John Smith");
    expect(xml).toContain("Director");
  });

  it("includes accounting period dates", () => {
    expect(xml).toContain("2024-01-01");
    expect(xml).toContain("2024-12-31");
  });
});

describe("buildPollMessage", () => {
  const correlationId = "abc-correlation-123";

  it("produces valid XML", () => {
    const xml = buildPollMessage(correlationId, vendor);
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<GovTalkMessage");
  });

  it("includes the correlation ID", () => {
    const xml = buildPollMessage(correlationId, vendor);
    expect(xml).toContain("abc-correlation-123");
  });

  it("includes vendor credentials", () => {
    const xml = buildPollMessage(correlationId, vendor);
    expect(xml).toContain("vendor123");
  });
});
