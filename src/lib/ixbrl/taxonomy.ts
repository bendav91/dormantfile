/**
 * FRC 2023 taxonomy namespace URIs and element names for iXBRL tagging.
 * These are used to tag dormant company accounts for both Companies House
 * and HMRC CT600 submissions.
 */

export const NS = {
  ix: "http://www.xbrl.org/2013/inlineXBRL",
  xbrli: "http://www.xbrl.org/2003/instance",
  xbrldi: "http://xbrl.org/2006/xbrldi",
  link: "http://www.xbrl.org/2003/linkbase",
  xlink: "http://www.w3.org/1999/xlink",
  iso4217: "http://www.xbrl.org/2003/iso4217",

  // FRC 2023 taxonomy modules
  "uk-bus": "http://xbrl.frc.org.uk/fr/2023-01-01/business",
  "uk-core": "http://xbrl.frc.org.uk/fr/2023-01-01/core",
  "uk-direp": "http://xbrl.frc.org.uk/fr/2023-01-01/direp",
  "uk-aurep": "http://xbrl.frc.org.uk/fr/2023-01-01/aurep",

  // HMRC computation taxonomy
  "uk-tax-comp": "http://www.hmrc.gov.uk/schemas/ct/comp/2024-01-01",
  "uk-tax-dpl": "http://www.hmrc.gov.uk/schemas/ct/dpl/2024-01-01",
} as const;

/** Schema references for the iXBRL header */
export const SCHEMA_REFS = {
  frc2023Core:
    "https://xbrl.frc.org.uk/FRS-102/2023-01-01/FRS-102-2023-01-01.xsd",
  hmrcComp:
    "https://www.hmrc.gov.uk/schemas/ct/comp/2024-01-01/ct-comp-2024-01-01.xsd",
} as const;
