import { calculateAccountsDeadline } from "@/lib/utils";
import { generateCt600Ctaps, spanHasProtectedCt600 } from "@/lib/ctap";
import { computeFirstPeriodEnd } from "@/lib/companies-house/filing-history";
import type { GapDetectionResult } from "@/lib/companies-house/filing-history";

export interface MaterialiseFilingsInput {
  companyId: string;
  dateOfCreation: string | undefined;
  gapResult: GapDetectionResult | null;
  ardMonth: number | null;
  ardDay: number | null;
  registeredForCorpTax: boolean;
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
 * Pure (no Prisma) builder for CT600 Filing rows.
 *
 * For each accounts period, when the company is registered for CT, the
 * accounts period is NOT filed at Companies House (gap detection), and the
 * span does not already contain a protected CT600 (submitted/accepted/etc.
 * or user-edited), generate one CT600 `FilingData` per split CTAP via
 * `generateCt600Ctaps`. Every CTAP in a period shares the same deadline
 * (12 months after the accounts-period end) and is created as outstanding
 * and not user-edited.
 */
export function buildCt600FilingData(input: {
  registeredForCorpTax: boolean;
  ctapStartDate: Date | null;
  accountsPeriods: { start: Date; end: Date; isFiled: boolean }[];
  existingCt600s: {
    status: string;
    ctapUserEdited: boolean;
    periodStart: Date;
    periodEnd: Date;
  }[];
}): Omit<FilingData, "companyId">[] {
  const { registeredForCorpTax, ctapStartDate, accountsPeriods, existingCt600s } = input;

  const rows: Omit<FilingData, "companyId">[] = [];
  if (!registeredForCorpTax) return rows;

  for (const { start, end, isFiled } of accountsPeriods) {
    if (isFiled) continue;
    if (
      spanHasProtectedCt600(
        { accountsPeriodStart: start, accountsPeriodEnd: end },
        existingCt600s,
      )
    ) {
      continue;
    }

    const ctaps = generateCt600Ctaps({
      accountsPeriodStart: start,
      accountsPeriodEnd: end,
      anchor: ctapStartDate ?? null,
    });

    for (const ctap of ctaps) {
      rows.push({
        filingType: "ct600",
        periodStart: new Date(ctap.start),
        periodEnd: new Date(ctap.end),
        status: "outstanding",
        confirmedAt: null,
        startDate: new Date(ctap.start),
        endDate: new Date(ctap.end),
        deadline: new Date(ctap.deadline),
        ctapUserEdited: false,
      });
    }
  }

  return rows;
}

/**
 * Creates Filing records for all periods from incorporation to present:
 * - Filed periods (from CH gap detection) → status: "accepted"
 * - Unfiled periods (gaps) → status: "outstanding" with computed deadlines
 *
 * Uses `skipDuplicates` so existing rows (e.g. already-accepted filings)
 * are preserved on re-run. Safe to call as part of a resync.
 */
export async function materialiseFilings(input: MaterialiseFilingsInput): Promise<void> {
  const {
    companyId,
    dateOfCreation,
    gapResult,
    ardMonth,
    ardDay,
    registeredForCorpTax,
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
  const accountsPeriods: { start: Date; end: Date; isFiled: boolean }[] = [];

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

    accountsPeriods.push({
      start: new Date(pStart),
      end: new Date(pEnd),
      isFiled,
    });

    const nextStart = new Date(pEnd);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    const nextEnd = new Date(pEnd);
    nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);
    pStart = nextStart;
    pEnd = nextEnd;
  }

  const { prisma } = await import("@/lib/db");

  const existingCt600s = await prisma.filing.findMany({
    where: { companyId, filingType: "ct600" },
    select: {
      status: true,
      ctapUserEdited: true,
      periodStart: true,
      periodEnd: true,
    },
  });

  const ct600Rows = buildCt600FilingData({
    registeredForCorpTax,
    ctapStartDate: null,
    accountsPeriods,
    existingCt600s,
  });
  for (const row of ct600Rows) {
    filingData.push({ companyId, ...row });
  }

  if (filingData.length > 0) {
    await prisma.filing.createMany({
      data: filingData,
      skipDuplicates: true,
    });
  }
}
