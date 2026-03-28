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

  describe("with zero share capital (default)", () => {
    it("shows zero for all balance sheet figures", () => {
      const result = generateDormantAccountsIxbrl({ ...data, shareCapital: 0 });
      // CalledUpShareCapital should be 0
      expect(result).toMatch(/CalledUpShareCapital[^>]*>0</);
      // ShareholderFunds should be 0
      expect(result).toMatch(/ShareholderFunds[^>]*>0</);
      // CurrentAssets should be 0
      expect(result).toMatch(/CurrentAssets[^>]*>0</);
      // NetAssetsLiabilities should be 0
      expect(result).toMatch(/NetAssetsLiabilities[^>]*>0</);
    });
  });

  describe("with share capital of £1 (100 pence)", () => {
    const withShareCapital = generateDormantAccountsIxbrl({ ...data, shareCapital: 100 });

    it("shows 1 for current assets", () => {
      expect(withShareCapital).toMatch(/CurrentAssets[^>]*>1</);
    });

    it("shows 1 for net assets", () => {
      expect(withShareCapital).toMatch(/NetAssetsLiabilities[^>]*>1</);
    });

    it("shows 1 for called up share capital", () => {
      expect(withShareCapital).toMatch(/CalledUpShareCapital"[^>]*>1</);
    });

    it("shows 1 for shareholders funds", () => {
      expect(withShareCapital).toMatch(/ShareholderFunds[^>]*>1</);
    });

    it("keeps fixed assets at zero", () => {
      expect(withShareCapital).toMatch(/FixedAssets[^>]*>0</);
    });

    it("keeps creditors at zero", () => {
      expect(withShareCapital).toMatch(/Creditors-AmountsFallingDueWithinOneYear[^>]*>0</);
    });

    it("keeps profit and loss at zero", () => {
      expect(withShareCapital).toMatch(/ProfitLossAccountReserve[^>]*>0</);
    });
  });

  describe("with share capital of £100 (10000 pence)", () => {
    const withLargerCapital = generateDormantAccountsIxbrl({ ...data, shareCapital: 10000 });

    it("shows 100 for current assets and share capital", () => {
      expect(withLargerCapital).toMatch(/CurrentAssets[^>]*>100</);
      expect(withLargerCapital).toMatch(/CalledUpShareCapital"[^>]*>100</);
      expect(withLargerCapital).toMatch(/ShareholderFunds[^>]*>100</);
      expect(withLargerCapital).toMatch(/NetAssetsLiabilities[^>]*>100</);
    });
  });

  describe("with no share capital specified", () => {
    it("defaults to zero (same as shareCapital: 0)", () => {
      const withoutProp = generateDormantAccountsIxbrl(data);
      expect(withoutProp).toMatch(/CalledUpShareCapital[^>]*>0</);
      expect(withoutProp).toMatch(/ShareholderFunds[^>]*>0</);
    });
  });
});
