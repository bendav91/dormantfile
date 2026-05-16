import { calculateAccountsDeadline } from "@/lib/utils";
import { computeFirstPeriodEnd } from "@/lib/companies-house/filing-history";
import type { GapDetectionResult } from "@/lib/companies-house/filing-history";

export interface MaterialiseFilingsInput {
  companyId: string;
  dateOfCreation: string | undefined;
  gapResult: GapDetectionResult | null;
  ardMonth: number | null;
  ardDay: number | null;
  accountsDueOn: string | undefined;
  nextAccountsPeriodEndOn: string | undefined;
}

export interface FilingData {
  companyId: string;
  filingType: "accounts" | "ct600";
  periodStart: Date;
  periodEnd: Date;
  status: "accepted" | "outstanding";
  confirmedAt: Date | null;
  startDate: Date;
  endDate: Date;
  deadline: Date;
  ctapUserEdited: boolean;
}

/**
 * Creates `accounts` Filing records for all periods from incorporation to present:
 * - Filed periods (from CH gap detection) → status: "accepted"
 * - Unfiled periods (gaps) → status: "outstanding" with computed deadlines
 *
 * Uses `skipDuplicates` so existing rows (e.g. already-accepted filings)
 * are preserved on re-run. Only `accounts` rows are written; CT600 rows are
 * never created here. Safe to call as part of a resync.
 */
export async function materialiseFilings(input: MaterialiseFilingsInput): Promise<void> {
  const {
    companyId,
    dateOfCreation,
    gapResult,
    ardMonth,
    ardDay,
    accountsDueOn,
    nextAccountsPeriodEndOn,
  } = input;

  const incDate = dateOfCreation ? new Date(dateOfCreation) : null;
  const now = new Date();

  let firstPeriodEnd: Date | null = null;
  if (incDate && ardMonth && ardDay) {
    firstPeriodEnd = computeFirstPeriodEnd(incDate, ardMonth, ardDay);
  }

  const filedPeriodEndSet = new Set<number>();
  if (gapResult) {
    for (const periodEnd of gapResult.filedPeriodEnds.values()) {
      filedPeriodEndSet.add(periodEnd.getTime());
    }
  }

  if (!firstPeriodEnd || !incDate) return;

  const filingData: FilingData[] = [];

  let pEnd = new Date(firstPeriodEnd);
  let pStart = new Date(incDate);

  while (pEnd.getTime() <= now.getTime()) {
    const isFiled = filedPeriodEndSet.has(pEnd.getTime());
    const isFirstPeriod = pStart.getTime() === incDate.getTime();

    const accountsDeadline = isFirstPeriod
      ? calculateAccountsDeadline(pEnd, incDate)
      : calculateAccountsDeadline(pEnd);

    const matchesCHNextAccounts =
      nextAccountsPeriodEndOn &&
      pEnd.getTime() === new Date(nextAccountsPeriodEndOn).getTime();
    const finalAccountsDeadline =
      matchesCHNextAccounts && accountsDueOn ? new Date(accountsDueOn) : accountsDeadline;

    filingData.push({
      companyId,
      filingType: "accounts",
      periodStart: new Date(pStart),
      periodEnd: new Date(pEnd),
      status: isFiled ? "accepted" : "outstanding",
      confirmedAt: isFiled ? new Date() : null,
      startDate: new Date(pStart),
      endDate: new Date(pEnd),
      deadline: finalAccountsDeadline,
      ctapUserEdited: false,
    });

    const nextStart = new Date(pEnd);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    const nextEnd = new Date(pEnd);
    nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);
    pStart = nextStart;
    pEnd = nextEnd;
  }

  const { prisma } = await import("@/lib/db");

  if (filingData.length > 0) {
    await prisma.filing.createMany({
      data: filingData,
      skipDuplicates: true,
    });
  }
}
