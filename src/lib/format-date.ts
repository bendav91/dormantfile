/**
 * Customer-facing date formatting.
 *
 * Every DormantFile customer is a UK company and cares about UK statutory
 * dates (Companies House / HMRC deadlines, confirmation dates). Dates must
 * therefore always render in UK civil time — `Europe/London`, which tracks
 * GMT/BST automatically — regardless of where the code runs (Vercel servers
 * are UTC) or the viewer's machine timezone.
 *
 * Do NOT format customer-facing dates with bare `toLocaleDateString` (uses the
 * runtime timezone) or a hard-coded `"UTC"` (an hour out, hence a day out near
 * midnight, for ~7 months a year under BST). Use these helpers.
 *
 * Note: the iXBRL/GovTalk builders have their own ISO `formatDate` for filing
 * payloads — that is a wire format, not display, and must stay as-is.
 */

const UK_TIME_ZONE = "Europe/London";

/** e.g. "1 September 2024" — full month name, UK time. */
export function formatUkDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: UK_TIME_ZONE,
  });
}

/** e.g. "1 Sep 2024" — abbreviated month, UK time. */
export function formatUkDateShort(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: UK_TIME_ZONE,
  });
}
