export function isFilingLive(): boolean {
  return process.env.NEXT_PUBLIC_FILING_LIVE === "true";
}

export function isTaxFilingLive(): boolean {
  return process.env.NEXT_PUBLIC_TAX_FILING_LIVE === "true";
}
