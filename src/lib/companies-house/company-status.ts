/**
 * Companies House company-status classification for the dissolution guard.
 *
 * The daily resync compares the previously stored status against the freshly
 * fetched one and flags companies that have left the register so filing is
 * disabled and they're dropped from filing-related email — and unflags them
 * (notifying the customer) if Companies House later restores them.
 */

/**
 * Statuses meaning the company has left the register and can no longer file.
 * Deliberately the clear-closure set only — a CVA ("voluntary-arrangement")
 * or "insolvency-proceedings" company is still on the register and can still
 * have filing obligations, so those are NOT treated as gone.
 */
export const GONE_STATUSES = new Set([
  "dissolved",
  "liquidation",
  "receivership",
  "administration",
  "converted-closed",
  "removed",
]);

export type CompanyStatusKind = "gone" | "active" | "unknown";

/**
 * Classify a raw Companies House `company_status` value.
 *
 * - `gone` — an explicit closure status (see GONE_STATUSES).
 * - `active` — the canonical live status.
 * - `unknown` — anything else, or null. Unknown never transitions a company
 *   in either direction: we only flag on an explicit closure and only unflag
 *   on an explicit return to "active".
 */
export function classifyCompanyStatus(status: string | null | undefined): CompanyStatusKind {
  if (!status) return "unknown";
  const s = status.toLowerCase();
  if (GONE_STATUSES.has(s)) return "gone";
  if (s === "active") return "active";
  return "unknown";
}

export type StatusTransition = "became_gone" | "reinstated" | null;

/**
 * Decide what (if anything) changed for a company given its current flag
 * state and the freshly fetched status.
 *
 * @param wasGone   whether `companyGoneAt` is currently set
 * @param newStatus the raw `company_status` from the latest CH profile
 */
export function detectStatusTransition(
  wasGone: boolean,
  newStatus: string | null | undefined,
): StatusTransition {
  const kind = classifyCompanyStatus(newStatus);
  if (kind === "gone" && !wasGone) return "became_gone";
  if (kind === "active" && wasGone) return "reinstated";
  return null;
}
