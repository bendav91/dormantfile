import { describe, it, expect } from "vitest";
import { generateDormantAccountsIxbrl } from "@/lib/ixbrl/dormant-accounts";
import type { IxbrlCompanyData } from "@/lib/ixbrl/types";

const data: IxbrlCompanyData = {
  companyName: "Test Dormant Ltd",
  companyRegistrationNumber: "12345678",
  periodStart: new Date("2024-01-01"),
  periodEnd: new Date("2024-12-31"),
  directorName: "Jane Smith",
};

describe("generateDormantAccountsIxbrl", () => {
  const html = generateDormantAccountsIxbrl(data);

  it("returns a well-formed HTML document", () => {
    expect(html).toContain("<?xml version");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes iXBRL namespaces", () => {
    expect(html).toContain("xmlns:ix=");
    expect(html).toContain("xmlns:xbrli=");
    expect(html).toContain("xmlns:uk-core=");
    expect(html).toContain("xmlns:uk-bus=");
  });

  it("includes ix:header with contexts and units", () => {
    expect(html).toContain("<ix:header>");
    expect(html).toContain('xbrli:context id="duration"');
    expect(html).toContain('xbrli:context id="instant-end"');
    expect(html).toContain('xbrli:context id="instant-start"');
    expect(html).toContain('xbrli:unit id="GBP"');
  });

  it("includes the company name and CRN", () => {
    expect(html).toContain("Test Dormant Ltd");
    expect(html).toContain("12345678");
  });

  it("includes period dates", () => {
    expect(html).toContain("2024-01-01");
    expect(html).toContain("2024-12-31");
  });

  it("includes FRC 2023 taxonomy schema reference", () => {
    expect(html).toContain("FRS-102/2023-01-01");
  });

  it("includes the entity identifier with CH scheme", () => {
    expect(html).toContain("http://www.companieshouse.gov.uk/");
  });

  it("tags financial figures with ix:nonFraction", () => {
    expect(html).toContain('ix:nonFraction name="uk-core:FixedAssets"');
    expect(html).toContain('ix:nonFraction name="uk-core:CurrentAssets"');
    expect(html).toContain('ix:nonFraction name="uk-core:NetAssetsLiabilities"');
    expect(html).toContain('ix:nonFraction name="uk-core:ShareholderFunds"');
  });

  it("includes dormant company statement", () => {
    expect(html).toContain("dormant within the meaning of section 1169");
  });

  it("includes the director name", () => {
    expect(html).toContain("Jane Smith");
  });

  it("includes section 480 exemption note", () => {
    expect(html).toContain("section 480 of the Companies Act 2006");
  });

  it("marks entity as dormant in hidden section", () => {
    expect(html).toContain("EntityDormantTruefalse");
  });

  it("escapes XML special characters in company name", () => {
    const result = generateDormantAccountsIxbrl({
      ...data,
      companyName: "Test & Co <Ltd>",
    });
    expect(result).toContain("Test &amp; Co &lt;Ltd&gt;");
    expect(result).not.toContain("Test & Co <Ltd>");
  });
});
