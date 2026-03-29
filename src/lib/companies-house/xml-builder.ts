/**
 * Builds the GovTalk XML envelope for Companies House annual accounts submission.
 * Wraps an iXBRL accounts document inside the CH XML Gateway format.
 */

interface AccountsSubmissionData {
  companyName: string;
  companyRegistrationNumber: string;
  periodStart: Date;
  periodEnd: Date;
  companyAuthCode: string;
  /** The full iXBRL HTML document for the accounts */
  accountsIxbrl: string;
}

interface PresenterCredentials {
  presenterId: string;
  presenterAuth: string;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function buildAccountsXml(
  data: AccountsSubmissionData,
  credentials: PresenterCredentials,
): string {
  const periodEndStr = formatDate(data.periodEnd);
  const accountsBase64 = Buffer.from(data.accountsIxbrl, "utf-8").toString("base64");

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>ACCOUNTS</Class>
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
    <Keys>
      <Key Type="CompanyNumber">${escapeXml(data.companyRegistrationNumber)}</Key>
      <Key Type="CompanyAuthentication">${escapeXml(data.companyAuthCode)}</Key>
    </Keys>
  </GovTalkDetails>
  <Body>
    <CompanyData xmlns="http://xmlgw.companieshouse.gov.uk">
      <CompanyNumber>${escapeXml(data.companyRegistrationNumber)}</CompanyNumber>
      <CompanyName>${escapeXml(data.companyName)}</CompanyName>
      <AccountsType>DORMANT</AccountsType>
      <CompanyAuthCode>${escapeXml(data.companyAuthCode)}</CompanyAuthCode>
      <MadeUpDate>${periodEndStr}</MadeUpDate>
      <Document>
        <Data encoding="base64" contentType="application/xhtml+xml">${accountsBase64}</Data>
      </Document>
    </CompanyData>
  </Body>
</GovTalkMessage>`;
}

/**
 * Builds a GovTalk poll request for Companies House.
 */
export function buildPollXml(correlationId: string, credentials: PresenterCredentials): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>ACCOUNTS</Class>
      <Qualifier>poll</Qualifier>
      <Function>submit</Function>
      <CorrelationID>${escapeXml(correlationId)}</CorrelationID>
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
  <Body/>
</GovTalkMessage>`;
}
