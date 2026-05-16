import { generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";

// Editor-lock set: periods the manual CT600 editor must show as non-editable.
// Intentionally {submitted, accepted, filed_elsewhere} — mirroring the IMMUTABLE set in
// src/app/api/company/ct600-periods/route.ts (the server-side save guard). Narrower than
// PROTECTED_STATUSES in ctap.ts (which adds "rejected"/"failed" to govern generator regeneration).
const IMMUTABLE_CT600 = new Set(["submitted", "accepted", "filed_elsewhere"]);

interface SeedFiling {
  filingType: string;
  periodStart: Date;
  periodEnd: Date;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  ctapUserEdited: boolean;
}

export interface Ct600EditorSeed {
  accountsPeriodStartISO: string;
  accountsPeriodEndISO: string;
  suggested: { startISO: string; endISO: string }[];
  immutable: { startISO: string; endISO: string; status: string }[];
}

const iso = (dt: Date) => dt.toISOString().split("T")[0];

/**
 * Picks the accounts period the manual CT600 editor should manage: the
 * earliest accounts-type Filing whose span does NOT already contain a
 * protected CT600 (submitted/accepted/etc. or user-edited); falls back to the
 * earliest accounts period. The suggested split comes from the shared
 * `generateCt600Ctaps` anchored at the accounts-period start (no ctapStartDate).
 * Returns null when the company has no accounts periods yet.
 */
export function deriveCt600EditorSeed(input: {
  filings: SeedFiling[];
}): Ct600EditorSeed | null {
  const { filings } = input;
  const accounts = filings
    .filter((f) => f.filingType === "accounts")
    .sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
  if (accounts.length === 0) return null;

  const ct600s = filings
    .filter((f) => f.filingType === "ct600")
    .map((f) => ({
      status: f.status,
      ctapUserEdited: f.ctapUserEdited,
      periodStart: f.startDate ?? f.periodStart,
      periodEnd: f.endDate ?? f.periodEnd,
    }));

  const target =
    accounts.find(
      (a) =>
        !spanHasProtectedCt600(
          { accountsPeriodStart: a.periodStart, accountsPeriodEnd: a.periodEnd },
          ct600s,
        ),
    ) ?? accounts[0];

  const accountsPeriodStart = target.periodStart;
  const accountsPeriodEnd = target.periodEnd;

  const suggested = generateCt600Ctaps({
    accountsPeriodStart,
    accountsPeriodEnd,
    anchor: null, // ctapStartDate removed — anchor on the accounts-period start
  }).map((c) => ({ startISO: iso(c.start), endISO: iso(c.end) }));

  const immutable = filings
    .filter((f) => f.filingType === "ct600")
    .filter((f) => {
      const fs = (f.startDate ?? f.periodStart).getTime();
      const fe = (f.endDate ?? f.periodEnd).getTime();
      return (
        fs >= accountsPeriodStart.getTime() &&
        fe <= accountsPeriodEnd.getTime() &&
        IMMUTABLE_CT600.has(f.status)
      );
    })
    .map((f) => ({
      startISO: iso(f.startDate ?? f.periodStart),
      endISO: iso(f.endDate ?? f.periodEnd),
      status: f.status,
    }));

  return {
    accountsPeriodStartISO: iso(accountsPeriodStart),
    accountsPeriodEndISO: iso(accountsPeriodEnd),
    suggested,
    immutable,
  };
}
