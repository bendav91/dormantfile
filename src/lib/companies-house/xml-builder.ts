// Builds XML payload for Companies House annual accounts submission.
// Real iXBRL format TBD after registering as a CH software filer.

interface AccountsSubmissionData {
  companyName: string;
  companyRegistrationNumber: string;
  periodStart: Date;
  periodEnd: Date;
  companyAuthCode: string;
}

interface PresenterCredentials {
  presenterId: string;
  presenterAuth: string;
}

/** Escape special XML characters to prevent injection / malformed XML. */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildAccountsXml(
  data: AccountsSubmissionData,
  credentials: PresenterCredentials
): string {
  const periodStartStr = data.periodStart.toISOString().split("T")[0];
  const periodEndStr = data.periodEnd.toISOString().split("T")[0];

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>Accounts</Class>
      <Qualifier>request</Qualifier>
      <Function>submit</Function>
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${escapeXml(credentials.presenterId)}</SenderID>
        <Authentication>
          <Method>CHMD5</Method>
          <Value>${escapeXml(credentials.presenterAuth)}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys/>
  </GovTalkDetails>
  <Body>
    <FormSubmission xmlns="http://xmlgw.companieshouse.gov.uk">
      <FormHeader>
        <CompanyNumber>${escapeXml(data.companyRegistrationNumber)}</CompanyNumber>
        <CompanyName>${escapeXml(data.companyName)}</CompanyName>
        <CompanyAuthenticationCode>${escapeXml(data.companyAuthCode)}</CompanyAuthenticationCode>
        <FormIdentifier>Accounts</FormIdentifier>
      </FormHeader>
      <DateSigned>${periodEndStr}</DateSigned>
      <Form>
        <CompanyAccounts>
          <PeriodStart>${periodStartStr}</PeriodStart>
          <PeriodEnd>${periodEndStr}</PeriodEnd>
          <BalanceSheet>
            <TotalAssets>0</TotalAssets>
            <TotalLiabilities>0</TotalLiabilities>
            <ShareholderFunds>0</ShareholderFunds>
          </BalanceSheet>
          <DormantStatement>true</DormantStatement>
        </CompanyAccounts>
      </Form>
    </FormSubmission>
  </Body>
</GovTalkMessage>`;
}
