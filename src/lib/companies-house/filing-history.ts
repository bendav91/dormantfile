export interface GapDetectionResult {
  oldestUnfiledPeriodStart: Date;
  oldestUnfiledPeriodEnd: Date;
  /** Map of CH made_up_date timestamp → computed expected periodEnd for seeding Filing records */
  filedPeriodEnds: Map<number, Date>;
}

const TOLERANCE_MS = 31 * 24 * 60 * 60 * 1000; // 31 days

/**
 * Fetches the list of dates that annual accounts were filed for from
 * the Companies House filing history API.
 *
 * Returns an array of `made_up_date` values for accounts filings.
 * Returns an empty array on API failure (graceful degradation).
 */
export async function fetchFilingHistory(
  companyNumber: string,
): Promise<Date[]> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) return [];

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");

  try {
    const res = await fetch(
      `${endpoint}/company/${encodeURIComponent(companyNumber)}/filing-history?category=accounts&items_per_page=100`,
      { headers: { Authorization: `Basic ${basicAuth}` } },
    );

    if (!res.ok) {
      console.error(`CH filing history API returned ${res.status} for ${companyNumber}`);
      return [];
    }

    const data = await res.json();
    const items: Array<{
      type?: string;
      description_values?: { made_up_date?: string };
    }> = data.items ?? [];

    return items
      .filter((item) => item.type?.startsWith("AA") && item.description_values?.made_up_date)
      .map((item) => new Date(item.description_values!.made_up_date!));
  } catch (error) {
    console.error("Failed to fetch CH filing history:", error);
    return [];
  }
}

export function computeFirstPeriodEnd(
  incorporationDate: Date,
  ardMonth: number, // 1-12
  ardDay: number,
): Date {
  // CH rule: first period ends on the first ARD that is more than 6 months
  // after incorporation, but no more than 18 months.
  const sixMonthsLater = new Date(incorporationDate);
  sixMonthsLater.setUTCMonth(sixMonthsLater.getUTCMonth() + 6);

  const firstArd = new Date(
    Date.UTC(sixMonthsLater.getUTCFullYear(), ardMonth - 1, ardDay),
  );
  if (firstArd.getTime() < sixMonthsLater.getTime()) {
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
