// Stub — builds a placeholder XML payload for Companies House annual accounts.
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

export function buildAccountsXml(
  data: AccountsSubmissionData,
  credentials: PresenterCredentials
): string {
  // TODO: Replace with real iXBRL-tagged annual accounts XML
  // after completing CH software filer registration.
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
        <SenderID>${credentials.presenterId}</SenderID>
        <Authentication>
          <Method>CHMD5</Method>
          <Value>${credentials.presenterAuth}</Value>
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
        <CompanyNumber>${data.companyRegistrationNumber}</CompanyNumber>
        <CompanyName>${data.companyName}</CompanyName>
        <CompanyAuthenticationCode>${data.companyAuthCode}</CompanyAuthenticationCode>
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
