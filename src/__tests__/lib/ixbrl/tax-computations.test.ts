import { describe, it, expect } from "vitest";
import { generateDormantTaxComputationsIxbrl } from "@/lib/ixbrl/tax-computations";
import type { IxbrlTaxComputationData } from "@/lib/ixbrl/types";

const data: IxbrlTaxComputationData = {
  companyName: "Test Dormant Ltd",
  companyRegistrationNumber: "12345678",
  uniqueTaxReference: "1234567890",
  periodStart: new Date("2024-01-01"),
  periodEnd: new Date("2024-12-31"),
};

describe("generateDormantTaxComputationsIxbrl", () => {
  const html = generateDormantTaxComputationsIxbrl(data);

  it("returns a well-formed HTML document", () => {
    expect(html).toContain("<?xml version");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes iXBRL namespaces for HMRC taxonomy", () => {
    expect(html).toContain("xmlns:ix=");
    expect(html).toContain("xmlns:xbrli=");
    expect(html).toContain("xmlns:uk-tax-comp=");
    expect(html).toContain("xmlns:uk-tax-dpl=");
  });

  it("includes HMRC computation schema reference", () => {
    expect(html).toContain("hmrc.gov.uk/schemas/ct/comp");
  });

  it("includes the company name, CRN, and UTR", () => {
    expect(html).toContain("Test Dormant Ltd");
    expect(html).toContain("12345678");
    expect(html).toContain("1234567890");
  });

  it("uses HMRC entity identifier scheme", () => {
    expect(html).toContain("http://www.hmrc.gov.uk/");
  });

  it("tags computation figures with ix:nonFraction", () => {
    expect(html).toContain('ix:nonFraction name="uk-tax-dpl:Turnover"');
    expect(html).toContain('ix:nonFraction name="uk-tax-dpl:GrossProfit"');
    expect(html).toContain('ix:nonFraction name="uk-tax-comp:TaxableProfitLoss"');
    expect(html).toContain('ix:nonFraction name="uk-tax-comp:CorporationTaxChargeable"');
  });

  it("includes dormant statement in computation notes", () => {
    expect(html).toContain("dormant throughout the period");
  });

  it("includes period dates", () => {
    expect(html).toContain("2024-01-01");
    expect(html).toContain("2024-12-31");
  });
});
