import { prisma } from "@/lib/db";
import {
  fetchFilingHistoryStrict,
  detectAccountsGaps,
} from "@/lib/companies-house/filing-history";
import { materialiseFilings } from "@/lib/companies-house/materialise-filings";

export interface FullResyncResult {
  deletedOutstanding: number;
  recreated: number;
  error?: string;
}

interface CompanyProfile {
  dateOfCreation: string;
  ardMonth: number;
  ardDay: number;
  accountsDueOn: string | null;
  nextAccountsPeriodEndOn: string | null;
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
  const nextAccounts = data.accounts?.next_accounts;

  let ardMonth: number;
  let ardDay: number;

  if (ard?.month && ard?.day) {
    ardMonth = parseInt(ard.month, 10);
    ardDay = parseInt(ard.day, 10);
  } else if (nextAccounts?.period_end_on) {
    const fallback = new Date(nextAccounts.period_end_on);
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
    accountsDueOn: nextAccounts?.due_on ?? null,
    nextAccountsPeriodEndOn: nextAccounts?.period_end_on ?? null,
    companyStatus: data.company_status ?? null,
    companyType: data.type ?? null,
    registeredAddress,
    sicCodes: Array.isArray(data.sic_codes) ? data.sic_codes.join(",") : null,
  };
}

/**
 * Wipes all `outstanding` Filing rows for a company and rebuilds them from
 * Companies House. Preserves all non-outstanding rows (accepted, submitted,
 * filed_elsewhere, etc.) so user history isn't lost.
 *
 * Use case: repair stale or buggy period rows in bulk after a logic fix.
 */
export async function fullResyncCompany(companyId: string): Promise<FullResyncResult> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      companyRegistrationNumber: true,
    },
  });
  if (!company) return { deletedOutstanding: 0, recreated: 0, error: "Company not found" };

  let profile: CompanyProfile;
  try {
    profile = await fetchCompanyProfile(company.companyRegistrationNumber);
  } catch (err) {
    return { deletedOutstanding: 0, recreated: 0, error: (err as Error).message };
  }

  let filedPeriodEnds: Date[];
  try {
    filedPeriodEnds = await fetchFilingHistoryStrict(company.companyRegistrationNumber);
  } catch (err) {
    return { deletedOutstanding: 0, recreated: 0, error: (err as Error).message };
  }

  const gapResult = detectAccountsGaps(
    profile.dateOfCreation,
    profile.ardMonth,
    profile.ardDay,
    filedPeriodEnds,
  );

  // Refresh company metadata so periods are derived from the latest CH state.
  await prisma.company.update({
    where: { id: companyId },
    data: {
      dateOfCreation: new Date(profile.dateOfCreation),
      ardMonth: profile.ardMonth,
      ardDay: profile.ardDay,
      accountsDueOn: profile.accountsDueOn ? new Date(profile.accountsDueOn) : null,
      companyStatus: profile.companyStatus,
      companyType: profile.companyType,
      registeredAddress: profile.registeredAddress,
      sicCodes: profile.sicCodes,
      // Resync resolves any pending ARD change confirmation.
      ardChangeDetected: false,
      ardChangeDetectedAt: null,
      newArdMonth: null,
      newArdDay: null,
    },
  });

  // Never delete a user-edited CT600 CTAP: it must survive resync so
  // `materialiseFilings`/`spanHasProtectedCt600` can see it and suppress
  // regeneration. submitted/accepted/etc. are already excluded (this delete
  // is status:"outstanding" only); the sole gap is outstanding user-edited
  // ct600s, so exclude exactly those.
  const { count: deletedOutstanding } = await prisma.filing.deleteMany({
    where: {
      companyId,
      status: "outstanding",
      NOT: { filingType: "ct600", ctapUserEdited: true },
    },
  });

  const countBefore = await prisma.filing.count({ where: { companyId } });

  await materialiseFilings({
    companyId,
    dateOfCreation: profile.dateOfCreation,
    gapResult,
    ardMonth: profile.ardMonth,
    ardDay: profile.ardDay,
    accountsDueOn: profile.accountsDueOn ?? undefined,
    nextAccountsPeriodEndOn: profile.nextAccountsPeriodEndOn ?? undefined,
  });

  const countAfter = await prisma.filing.count({ where: { companyId } });
  const recreated = countAfter - countBefore;

  return { deletedOutstanding, recreated };
}
