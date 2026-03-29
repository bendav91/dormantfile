export interface GapDetectionResult {
  oldestUnfiledPeriodStart: Date;
  oldestUnfiledPeriodEnd: Date;
  /** Map of CH made_up_date timestamp → computed expected periodEnd for seeding Filing records */
  filedPeriodEnds: Map<number, Date>;
}

const TOLERANCE_MS = 31 * 24 * 60 * 60 * 1000; // 31 days

export function computeFirstPeriodEnd(
  incorporationDate: Date,
  ardMonth: number, // 1-12
  ardDay: number,
): Date {
  let firstArd = new Date(
    Date.UTC(incorporationDate.getUTCFullYear(), ardMonth - 1, ardDay),
  );
  if (firstArd.getTime() <= incorporationDate.getTime()) {
    firstArd.setUTCFullYear(firstArd.getUTCFullYear() + 1);
  }
  const eighteenMonthsLater = new Date(incorporationDate);
  eighteenMonthsLater.setUTCMonth(eighteenMonthsLater.getUTCMonth() + 18);
  if (firstArd.getTime() > eighteenMonthsLater.getTime()) {
    firstArd.setUTCFullYear(firstArd.getUTCFullYear() - 1);
  }
  return firstArd;
}

function findMatchingFiling(expectedEnd: Date, filedEnds: Date[]): number {
  return filedEnds.findIndex(
    (filed) =>
      Math.abs(filed.getTime() - expectedEnd.getTime()) <= TOLERANCE_MS,
  );
}

export function detectAccountsGaps(
  incorporationDate: string,
  accountingReferenceMonth: number,
  accountingReferenceDay: number,
  filedPeriodEnds: Date[],
): GapDetectionResult | null {
  const incDate = new Date(incorporationDate);
  const now = new Date();
  const firstPeriodEnd = computeFirstPeriodEnd(
    incDate,
    accountingReferenceMonth,
    accountingReferenceDay,
  );
  const remainingFiled = [...filedPeriodEnds];
  const filedMap = new Map<number, Date>();
  let periodEnd = firstPeriodEnd;
  let periodStart = incDate;
  let oldestUnfiled: { start: Date; end: Date } | null = null;

  while (periodEnd.getTime() <= now.getTime()) {
    const matchIdx = findMatchingFiling(periodEnd, remainingFiled);
    if (matchIdx >= 0) {
      filedMap.set(remainingFiled[matchIdx].getTime(), new Date(periodEnd));
      remainingFiled.splice(matchIdx, 1);
    } else if (!oldestUnfiled) {
      oldestUnfiled = { start: new Date(periodStart), end: new Date(periodEnd) };
    }
    const nextStart = new Date(periodEnd);
    nextStart.setUTCDate(nextStart.getUTCDate() + 1);
    const nextEnd = new Date(periodEnd);
    nextEnd.setUTCFullYear(nextEnd.getUTCFullYear() + 1);
    periodStart = nextStart;
    periodEnd = nextEnd;
  }

  if (!oldestUnfiled) return null;
  return {
    oldestUnfiledPeriodStart: oldestUnfiled.start,
    oldestUnfiledPeriodEnd: oldestUnfiled.end,
    filedPeriodEnds: filedMap,
  };
}
