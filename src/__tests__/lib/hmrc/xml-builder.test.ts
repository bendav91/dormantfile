import { describe, it, expect, beforeEach } from "vitest";
import { XMLParser } from "fast-xml-parser";
import { buildGovTalkMessage, buildPollMessage } from "@/lib/hmrc/xml-builder";
import type { CT600Data, HmrcCredentials, VendorCredentials } from "@/lib/hmrc/types";

const ct600: CT600Data = {
  companyName: "Test Dormant Ltd",
  companyRegistrationNumber: "12345678",
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

const accountsIxbrl = "<html><body>Accounts iXBRL</body></html>";
const computationsIxbrl = "<html><body>Tax Computations iXBRL</body></html>";

describe("buildGovTalkMessage", () => {
  let xml: string;

  beforeEach(async () => {
    xml = await buildGovTalkMessage({
      ct600,
      credentials,
      vendor,
      accountsIxbrl,
      computationsIxbrl,
    });
  });

  it("produces a valid XML document with declaration", () => {
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<GovTalkMessage");
  });

  it("includes EnvelopeVersion 2.0", () => {
    expect(xml).toContain("<EnvelopeVersion>2.0</EnvelopeVersion>");
  });

  it("includes the correct HMRC submission class", () => {
    expect(xml).toContain("HMRC-CT-CT600-TIL");
  });

  it("includes gateway credentials", () => {
    expect(xml).toContain("testuser");
    expect(xml).toContain("testpass");
  });

  it("includes vendor credentials in ChannelRouting", () => {
    expect(xml).toContain("vendor123");
  });

  it("includes company name", () => {
    expect(xml).toContain("Test Dormant Ltd");
  });

  it("includes the UTR", () => {
    expect(xml).toContain("1234567890");
  });

  it("includes the company registration number", () => {
    expect(xml).toContain("<RegistrationNumber>12345678</RegistrationNumber>");
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

  it("includes base64-encoded iXBRL accounts attachment", () => {
    const accountsBase64 = Buffer.from(accountsIxbrl).toString("base64");
    expect(xml).toContain(accountsBase64);
    expect(xml).toContain('Description="Annual Accounts"');
  });

  it("includes base64-encoded iXBRL computations attachment", () => {
    const computationsBase64 = Buffer.from(computationsIxbrl).toString("base64");
    expect(xml).toContain(computationsBase64);
    expect(xml).toContain('Description="Tax Computation"');
  });

  it("sets GatewayTest to 0 by default (live mode)", () => {
    expect(xml).toContain("<GatewayTest>0</GatewayTest>");
  });

  it("sets GatewayTest to 1 when isTest is true", async () => {
    const testXml = await buildGovTalkMessage({
      ct600,
      credentials,
      vendor,
      accountsIxbrl,
      computationsIxbrl,
      isTest: true,
    });
    expect(testXml).toContain("<GatewayTest>1</GatewayTest>");
  });
});

describe("buildGovTalkMessage — special-character credential escaping", () => {
  // HMRC test password [2] — exercises < > & £ ' ; ] and a space in <Value>.
  const specialPassword = "doo;w<x.h&bn>p 67J&EE£t'n-w;ld123]w";

  it("XML-escapes a special-character gateway password inside <Value>", async () => {
    const xml = await buildGovTalkMessage({
      ct600,
      credentials: { gatewayUsername: "CTUser100", gatewayPassword: specialPassword },
      vendor,
      accountsIxbrl,
      computationsIxbrl,
      isTest: true,
    });

    // Escaping happened, and the raw unescaped password fragment is absent.
    expect(xml).toContain("&lt;");
    expect(xml).toContain("&gt;");
    expect(xml).toContain("&amp;");
    expect(xml).not.toContain("doo;w<x.h&bn>p");

    // Round-trips losslessly: parsed <Value> equals the original password.
    const parsed = new XMLParser().parse(xml);
    const value =
      parsed.GovTalkMessage.Header.SenderDetails.IDAuthentication.Authentication.Value;
    expect(value).toBe(specialPassword);
  });

  it("does not change the IRmark when only the password changes (password is in Header, not Body)", async () => {
    const irmarkOf = (x: string) => x.match(/<IRmark[^>]*>([^<]+)<\/IRmark>/)?.[1];

    const plain = await buildGovTalkMessage({
      ct600,
      credentials,
      vendor,
      accountsIxbrl,
      computationsIxbrl,
    });
    const special = await buildGovTalkMessage({
      ct600,
      credentials: { gatewayUsername: "CTUser100", gatewayPassword: specialPassword },
      vendor,
      accountsIxbrl,
      computationsIxbrl,
    });

    expect(irmarkOf(plain)).toBeTruthy();
    expect(irmarkOf(special)).toBe(irmarkOf(plain));
  });
});

describe("GovTalk envelope structure (HMRC envelope schema)", () => {
  const p = () => new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

  it("places ChannelRouting in GovTalkDetails (sibling of Header), never inside Header", async () => {
    const xml = await buildGovTalkMessage({
      ct600,
      credentials,
      vendor,
      accountsIxbrl,
      computationsIxbrl,
      isTest: true,
    });
    const msg = p().parse(xml).GovTalkMessage;

    expect(msg.Header.MessageDetails).toBeTruthy();
    expect(msg.Header.SenderDetails).toBeTruthy();
    expect(msg.Header.ChannelRouting).toBeUndefined();

    expect(msg.GovTalkDetails).toBeTruthy();
    expect(msg.GovTalkDetails.ChannelRouting.Channel.URI).toBe("urn:software:vendor:vendor123");
    // GovTalk Channel content model is URI, Product?, Version? — no <Name> child.
    expect(msg.GovTalkDetails.ChannelRouting.Channel.Name).toBeUndefined();
    expect(xml).toContain("<Version>1.0</Version>");
    expect(xml).toContain('<Keys><Key Type="UTR">1234567890</Key></Keys>');

    const h = xml.indexOf("</Header>");
    const g = xml.indexOf("<GovTalkDetails>");
    const b = xml.indexOf("<Body");
    expect(h).toBeGreaterThan(-1);
    expect(g).toBeGreaterThan(h);
    expect(b).toBeGreaterThan(g);
  });

  it("poll message also puts ChannelRouting in GovTalkDetails, not Header", () => {
    const xml = buildPollMessage("corr-123", vendor);
    const msg = p().parse(xml).GovTalkMessage;
    expect(msg.Header.ChannelRouting).toBeUndefined();
    expect(msg.GovTalkDetails.ChannelRouting.Channel.URI).toBe("urn:software:vendor:vendor123");
  });
});

describe("buildPollMessage", () => {
  const correlationId = "abc-correlation-123";

  it("produces valid XML with EnvelopeVersion", () => {
    const xml = buildPollMessage(correlationId, vendor);
    expect(xml).toContain("<?xml");
    expect(xml).toContain("<GovTalkMessage");
    expect(xml).toContain("<EnvelopeVersion>2.0</EnvelopeVersion>");
  });

  it("includes the correlation ID", () => {
    const xml = buildPollMessage(correlationId, vendor);
    expect(xml).toContain("abc-correlation-123");
  });

  it("includes vendor credentials", () => {
    const xml = buildPollMessage(correlationId, vendor);
    expect(xml).toContain("vendor123");
  });

  it("defaults GatewayTest to 0 (live)", () => {
    expect(buildPollMessage(correlationId, vendor)).toContain("<GatewayTest>0</GatewayTest>");
  });

  it("sets GatewayTest to 1 when polling the test service (must match the submission)", () => {
    expect(buildPollMessage(correlationId, vendor, true)).toContain(
      "<GatewayTest>1</GatewayTest>",
    );
  });
});
