export function isFilingLive(): boolean {
  return process.env.NEXT_PUBLIC_FILING_LIVE === 'true'
}
