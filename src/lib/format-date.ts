/**
 * Customer-facing date formatting.
 *
 * Every DormantFile customer is a UK company filing to UK authorities, so
 * there are two — and only two — categories of date, and they format
 * differently:
 *
 * 1. Statutory calendar dates — accounting period start/end, accounts-due
 *    date, ARD, made-up date, incorporation date. These are NOT instants:
 *    "31 August 2025" has no time and no timezone. They are stored as
 *    `YYYY-MM-DDT00:00:00.000Z` purely as an encoding. They must render
 *    *verbatim* (UTC reading) so they always match Companies House / HMRC
 *    exactly, on any server or device. Use formatCivilDate(Short).
 *
 * 2. Event instants — confirmedAt, submittedAt, createdAt: real moments in
 *    time. A UK customer cares when these happened in *UK civil time*, so
 *    they render in Europe/London (auto GMT/BST). Use formatUkDate(Short).
 *
 * Never use bare `toLocaleDateString` (runtime timezone — wrong on UTC
 * servers and on non-UK devices) for either category.
 *
 * Internal/admin/observability surfaces are deliberately out of scope: those
 * stay UTC/ISO for cross-system forensics. This module is customer-facing
 * only. The iXBRL/GovTalk builders keep their own ISO wire-format helpers.
 */

const UK_TIME_ZONE = "Europe/London";

// ── Event instants → UK civil time ──────────────────────────────────────

/** Instant → UK calendar day, full month. e.g. "16 May 2026". */
export function formatUkDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: UK_TIME_ZONE,
  });
}

/** Instant → UK calendar day, abbreviated month. e.g. "16 May 2026". */
export function formatUkDateShort(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: UK_TIME_ZONE,
  });
}

// ── Statutory calendar dates → verbatim (no timezone shift) ──────────────

/** Stored civil date, rendered exactly as stored. e.g. "31 August 2025". */
export function formatCivilDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Stored civil date, abbreviated month. e.g. "31 Aug 2025". */
export function formatCivilDateShort(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
