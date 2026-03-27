// Stub — builds a placeholder XML payload for Companies House annual accounts.
// Real iXBRL format TBD after registering as a CH software filer.

interface AccountsSubmissionData {
  companyName: string;
  companyRegistrationNumber: string;
  periodStart: Date;
  periodEnd: Date;
}

interface PresenterCredentials {
  presenterId: string;
  presenterAuth: string;
}

export function buildAccountsXml(
  data: AccountsSubmissionData,
  credentials: PresenterCredentials
): string {
  // TODO: Replace with real iXBRL-tagged annual accounts XML
  // after completing CH software filer registration.
  const periodStartStr = data.periodStart.toISOString().split("T")[0];
  const periodEndStr = data.periodEnd.toISOString().split("T")[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<CompanyAccounts>
  <CompanyName>${data.companyName}</CompanyName>
  <CompanyNumber>${data.companyRegistrationNumber}</CompanyNumber>
  <PeriodStart>${periodStartStr}</PeriodStart>
  <PeriodEnd>${periodEndStr}</PeriodEnd>
  <BalanceSheet>
    <TotalAssets>0</TotalAssets>
    <TotalLiabilities>0</TotalLiabilities>
    <ShareholderFunds>0</ShareholderFunds>
  </BalanceSheet>
  <DormantStatement>true</DormantStatement>
  <Presenter>
    <Id>${credentials.presenterId}</Id>
  </Presenter>
</CompanyAccounts>`;
}
