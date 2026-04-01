import type {
  AccountsSubmissionData,
  PresenterCredentials,
  SubmissionConfig,
} from "@/lib/companies-house/xml-builder";
import {
  buildAccountsXml,
  buildPollXml,
  mapCompanyType,
  md5,
} from "@/lib/companies-house/xml-builder";
import { beforeEach, describe, expect, it } from "vitest";

const credentials: PresenterCredentials = {
  presenterId: "66666548000",
  presenterAuth: "EH442O954TU",
};

const config: SubmissionConfig = {
  packageReference: "0012",
  isTest: true,
};

const prodConfig: SubmissionConfig = {
  packageReference: "PROD001",
  isTest: false,
};

const data: AccountsSubmissionData = {
  companyName: "TEST DORMANT LTD",
  companyRegistrationNumber: "12345678",
  companyType: "EW",
  periodEnd: new Date("2025-12-31"),
  companyAuthCode: "ABC123",
  accountsIxbrl: "<html><body>Dormant accounts iXBRL</body></html>",
  submissionNumber: "000001",
  transactionId: "1",
  contactName: "Ben Davies",
};

describe("md5", () => {
  it("produces a lowercase 32-char hex string", () => {
    const hash = md5("test");
    expect(hash).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toBe("098f6bcd4621d373cade4e832627b4f6");
  });
});

describe("mapCompanyType", () => {
  it("maps ltd to EW", () => {
    expect(mapCompanyType("ltd")).toBe("EW");
  });

  it("maps plc to EW", () => {
    expect(mapCompanyType("plc")).toBe("EW");
  });

  it("maps scottish-company to SC", () => {
    expect(mapCompanyType("scottish-company")).toBe("SC");
  });

  it("maps northern-ireland-company to NI", () => {
    expect(mapCompanyType("northern-ireland-company")).toBe("NI");
  });

  it("maps llp to LLP", () => {
    expect(mapCompanyType("llp")).toBe("LLP");
  });

  it("defaults to EW for unknown types", () => {
    expect(mapCompanyType("unknown")).toBe("EW");
    expect(mapCompanyType(null)).toBe("EW");
    expect(mapCompanyType(undefined)).toBe("EW");
  });
});

describe("buildAccountsXml", () => {
  let xml: string;

  beforeEach(() => {
    xml = buildAccountsXml(data, credentials, config);
  });

  it("produces valid XML with declaration", () => {
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<GovTalkMessage");
  });

  it("includes EnvelopeVersion 2.0", () => {
    expect(xml).toContain("<EnvelopeVersion>2.0</EnvelopeVersion>");
  });

  it("uses Class AA for accounts", () => {
    expect(xml).toContain("<Class>AA</Class>");
  });

  it("includes Qualifier request", () => {
    expect(xml).toContain("<Qualifier>request</Qualifier>");
  });

  it("does not include Function element", () => {
    expect(xml).not.toContain("<Function>");
  });

  it("includes TransactionID", () => {
    expect(xml).toContain("<TransactionID>1</TransactionID>");
  });

  it("hashes SenderID with MD5", () => {
    const expectedSenderId = md5("66666548000");
    expect(xml).toContain(`<SenderID>${expectedSenderId}</SenderID>`);
  });

  it("hashes auth Value with MD5", () => {
    const expectedAuthValue = md5("EH442O954TU");
    expect(xml).toContain(`<Value>${expectedAuthValue}</Value>`);
  });

  it("uses Method clear (not CHMD5)", () => {
    expect(xml).toContain("<Method>clear</Method>");
    expect(xml).not.toContain("CHMD5");
  });

  it("includes GatewayTest element when isTest is true", () => {
    expect(xml).toContain("<GatewayTest>1</GatewayTest>");
  });

  it("omits GatewayTest element when isTest is false", () => {
    const prodXml = buildAccountsXml(data, credentials, prodConfig);
    expect(prodXml).not.toContain("GatewayTest");
  });

  it("includes FormSubmission body with correct namespace", () => {
    expect(xml).toContain('<FormSubmission xmlns="http://xmlgw.companieshouse.gov.uk/Header"');
  });

  it("includes FormHeader with all required fields", () => {
    expect(xml).toContain("<CompanyNumber>12345678</CompanyNumber>");
    expect(xml).toContain("<CompanyType>EW</CompanyType>");
    expect(xml).toContain("<CompanyName>TEST DORMANT LTD</CompanyName>");
    expect(xml).toContain("<CompanyAuthenticationCode>ABC123</CompanyAuthenticationCode>");
    expect(xml).toContain("<PackageReference>0012</PackageReference>");
    expect(xml).toContain("<FormIdentifier>AA</FormIdentifier>");
  });

  it("includes SubmissionNumber exactly 6 chars", () => {
    expect(xml).toContain("<SubmissionNumber>000001</SubmissionNumber>");
  });

  it("includes ContactName when provided", () => {
    expect(xml).toContain("<ContactName>Ben Davies</ContactName>");
  });

  it("omits ContactName when not provided", () => {
    const noContact = { ...data, contactName: undefined };
    const noContactXml = buildAccountsXml(noContact, credentials, config);
    expect(noContactXml).not.toContain("<ContactName>");
  });

  it("includes DateSigned as today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(xml).toContain(`<DateSigned>${today}</DateSigned>`);
  });

  it("includes empty Form element", () => {
    expect(xml).toContain("<Form/>");
  });

  it("includes Document with base64 iXBRL", () => {
    const expectedBase64 = Buffer.from(data.accountsIxbrl).toString("base64");
    expect(xml).toContain(`<Data>${expectedBase64}</Data>`);
    expect(xml).toContain("<Filename>accounts.html</Filename>");
    expect(xml).toContain("<ContentType>application/xml</ContentType>");
    expect(xml).toContain("<Category>ACCOUNTS</Category>");
  });

  it("escapes XML special characters in company name", () => {
    const specialData = { ...data, companyName: "A & B <LTD>" };
    const specialXml = buildAccountsXml(specialData, credentials, config);
    expect(specialXml).toContain("A &amp; B &lt;LTD&gt;");
  });
});

describe("buildPollXml", () => {
  it("produces valid XML", () => {
    const xml = buildPollXml("000001", credentials);
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain("<GovTalkMessage");
  });

  it("uses GetSubmissionStatus class", () => {
    const xml = buildPollXml("000001", credentials);
    expect(xml).toContain("<Class>GetSubmissionStatus</Class>");
  });

  it("includes hashed SenderID and auth Value", () => {
    const xml = buildPollXml("000001", credentials);
    expect(xml).toContain(`<SenderID>${md5("66666548000")}</SenderID>`);
    expect(xml).toContain(`<Value>${md5("EH442O954TU")}</Value>`);
  });

  it("uses Method clear", () => {
    const xml = buildPollXml("000001", credentials);
    expect(xml).toContain("<Method>clear</Method>");
  });

  it("includes presenter ID and submission number in body", () => {
    const xml = buildPollXml("000001", credentials);
    expect(xml).toContain("<PresenterID>66666548000</PresenterID>");
    expect(xml).toContain("<SubmissionNumber>000001</SubmissionNumber>");
  });
});
