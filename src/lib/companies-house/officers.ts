/**
 * Companies House officers lookup.
 *
 * Used by the pre-file director confirmation gate so the person filing can
 * tick the actual company director rather than silently filing in the
 * account holder's name (wrong when an agent manages other people's
 * companies). Same public Company Information API, key, and Basic-auth
 * pattern as the company-profile fetch in resync.ts.
 */

export interface CompanyDirector {
  /** Officer name exactly as Companies House holds it (e.g. "SMITH, Jane"). */
  name: string;
  /** ISO date the appointment began, if Companies House provides it. */
  appointedOn: string | null;
}

interface RawOfficer {
  name?: string;
  officer_role?: string;
  resigned_on?: string;
  appointed_on?: string;
}

/**
 * Fetch the active (non-resigned) natural-person directors for a company.
 *
 * Corporate directors are excluded — they cannot be a natural-person
 * signatory for accounts/CT600, so the caller's manual-entry fallback
 * covers that edge. Throws if the API is not configured or the request
 * fails; callers degrade to manual entry on throw.
 */
export async function fetchActiveDirectors(companyNumber: string): Promise<CompanyDirector[]> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  const endpoint = process.env.COMPANY_INFORMATION_API_ENDPOINT;
  if (!apiKey || !endpoint) {
    throw new Error("Companies House API is not configured");
  }

  const basicAuth = Buffer.from(`${apiKey}:`).toString("base64");
  const res = await fetch(
    `${endpoint}/company/${encodeURIComponent(companyNumber)}/officers?items_per_page=50`,
    { headers: { Authorization: `Basic ${basicAuth}` } },
  );

  if (!res.ok) {
    throw new Error(`CH officers API returned ${res.status}`);
  }

  const data = await res.json();
  const items: RawOfficer[] = Array.isArray(data?.items) ? data.items : [];

  return items
    .filter((o) => {
      const role = (o.officer_role ?? "").toLowerCase();
      // Director roles only, excluding corporate-director / corporate-nominee-director.
      const isDirector = role === "director" || role === "nominee-director";
      return isDirector && !o.resigned_on && typeof o.name === "string" && o.name.trim() !== "";
    })
    .map((o) => ({
      name: o.name!.trim(),
      appointedOn: o.appointed_on ?? null,
    }));
}
