import { prisma } from "@/lib/db";
import {
  fetchFilingHistoryStrict,
  detectAccountsGaps,
  computeFirstPeriodEnd,
} from "@/lib/companies-house/filing-history";

export interface ResyncResult {
  newFilingsCount: number;
  error?: string;
}

/**
 * Fetch the CH company profile to get incorporation date and ARD.
 * Same API call the onboarding flow makes.
 */
interface CompanyProfile {
  dateOfCreation: string;
  ardMonth: number;
  ardDay: number;
  accountsDueOn: string | null;
  companyStatus: string | null;
  companyType: string | null;
  registeredAddress: string | null;
  sicCodes: string | null;
}

async function fetchCompanyProfile(companyNumber: string): Promise<CompanyProfile> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) {
    throw new Error("Companies House API is not configured");
  }

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  const res = await fetch(`${endpoint}/company/${encodeURIComponent(companyNumber)}`, {
    headers: { Authorization: `Basic ${basicAuth}` },
  });

  if (!res.ok) {
    throw new Error(`CH company profile API returned ${res.status}`);
  }

  const data = await res.json();
  const ard = data.accounts?.accounting_reference_date;

  let ardMonth: number;
  let ardDay: number;

  if (ard?.month && ard?.day) {
    ardMonth = parseInt(ard.month, 10);
    ardDay = parseInt(ard.day, 10);
  } else if (data.accounts?.next_accounts?.period_end_on) {
    const fallback = new Date(data.accounts.next_accounts.period_end_on);
    ardMonth = fallback.getUTCMonth() + 1;
    ardDay = fallback.getUTCDate();
  } else {
    throw new Error("Cannot determine accounting reference date");
  }

  const addr = data.registered_office_address;
  const registeredAddress = addr
    ? [addr.address_line_1, addr.address_line_2, addr.locality, addr.region, addr.postal_code]
        .filter(Boolean)
        .join(", ")
    : null;

  return {
    dateOfCreation: data.date_of_creation,
    ardMonth,
    ardDay,
    accountsDueOn: data.accounts?.next_accounts?.due_on ?? null,
    companyStatus: data.company_status ?? null,
    companyType: data.type ?? null,
    registeredAddress,
    sicCodes: Array.isArray(data.sic_codes) ? data.sic_codes.join(",") : null,
  };
}

export async function resyncFromCompaniesHouse(companyId: string): Promise<ResyncResult> {
  // Step 1: Load company with user
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: { user: true, filings: true },
  });
  if (!company) return { newFilingsCount: 0, error: "Company not found" };

  // Step 2: Fetch CH profile for incorporation date, ARD, and next deadline
  let profile: CompanyProfile;
  try {
    profile = await fetchCompanyProfile(company.companyRegistrationNumber);
  } catch (err) {
    return { newFilingsCount: 0, error: (err as Error).message };
  }

  const { dateOfCreation, ardMonth, ardDay, accountsDueOn } = profile;

  // Update company with latest CH data
  await prisma.company.update({
    where: { id: companyId },
    data: {
      dateOfCreation: new Date(dateOfCreation),
      accountsDueOn: accountsDueOn ? new Date(accountsDueOn) : null,
      companyStatus: profile.companyStatus,
      companyType: profile.companyType,
      registeredAddress: profile.registeredAddress,
      sicCodes: profile.sicCodes,
      ardMonth,
      ardDay,
    },
  });

  // Step 3: Fetch filing history (strict — throws on failure)
  let filedPeriodEnds: Date[];
  try {
    filedPeriodEnds = await fetchFilingHistoryStrict(company.companyRegistrationNumber);
  } catch (err) {
    return { newFilingsCount: 0, error: (err as Error).message };
  }

  // Step 4: Map CH dates to expected period ends
  // TODO: Known limitation — if ALL periods are filed externally,
  // detectAccountsGaps returns null and we return early without
  // recording those filings. The company's period pointer won't
  // advance. This only affects companies that filed every single
  // period outside DormantFile and have zero Filing records.
  const gapResult = detectAccountsGaps(dateOfCreation, ardMonth, ardDay, filedPeriodEnds);
  if (!gapResult) {
    // All periods are filed — nothing to detect
    return { newFilingsCount: 0 };
  }

  // Step 5: Find externally filed periods and transition outstanding Filings
  const existingFilings = await prisma.filing.findMany({
    where: { companyId, filingType: "accounts" },
    select: { id: true, periodEnd: true, status: true },
  });

  const sortedPeriodEnds = [...gapResult.filedPeriodEnds.values()].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  const firstPeriodEnd = computeFirstPeriodEnd(new Date(dateOfCreation), ardMonth, ardDay);
  let transitioned = 0;

  for (const periodEnd of sortedPeriodEnds) {
    const existing = existingFilings.find((f) => f.periodEnd.getTime() === periodEnd.getTime());

    if (existing && (existing.status === "accepted" || existing.status === "filed_elsewhere")) {
      // Already accepted or marked as filed elsewhere — skip
      continue;
    }

    if (existing && existing.status === "outstanding") {
      // Transition outstanding → accepted
      await prisma.filing.update({
        where: { id: existing.id },
        data: { status: "accepted", confirmedAt: new Date() },
      });
      transitioned++;
    } else if (!existing) {
      // No Filing record exists — create one (edge case: pre-migration data)
      let periodStart: Date;
      if (periodEnd.getTime() === firstPeriodEnd.getTime()) {
        periodStart = new Date(dateOfCreation);
      } else {
        periodStart = new Date(periodEnd);
        periodStart.setUTCFullYear(periodStart.getUTCFullYear() - 1);
        periodStart.setUTCDate(periodStart.getUTCDate() + 1);
      }

      await prisma.filing.create({
        data: {
          companyId,
          filingType: "accounts",
          periodStart,
          periodEnd,
          status: "accepted",
          confirmedAt: new Date(),
        },
      });
      transitioned++;
    }
  }

  return { newFilingsCount: transitioned };
}
