/**
 * Builds the GovTalk XML envelope for Companies House annual accounts submission.
 * Uses the FormSubmission body structure per the CH XML Gateway TIS v5.3.
 *
 * Auth: SenderID = MD5(presenterId), Value = MD5(presenterAuth), Method = 'clear'
 * Class: 'Accounts' for accounts filing
 * FormIdentifier: must match Class = 'Accounts'
 */

import { createHash } from "crypto";

export interface AccountsSubmissionData {
  companyName: string;
  companyRegistrationNumber: string;
  companyType: string; // "EW", "SC", "NI", "LLP", etc.
  periodEnd: Date;
  companyAuthCode: string;
  accountsIxbrl: string;
  submissionNumber: string; // zero-padded 6 chars
  transactionId: string; // incremental, unique per presenter
  contactName?: string;
}

export interface PresenterCredentials {
  presenterId: string;
  presenterAuth: string;
}

export interface SubmissionConfig {
  packageReference: string; // "0012" for test
  isTest: boolean; // controls GatewayTest element inclusion
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

export function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

/**
 * Maps CH REST API company type to XML Gateway CompanyType code.
 * See TIS v5.3 Appendix A and section 2.4.
 */
export function mapCompanyType(restApiType: string | null | undefined): string {
  switch (restApiType) {
    case "ltd":
    case "plc":
      return "EW";
    case "scottish-company":
      return "SC";
    case "northern-ireland-company":
      return "NI";
    case "llp":
      return "LLP";
    case "scottish-partnership":
      return "SO";
    case "northern-ireland-partnership":
      return "NC";
    case "registered-overseas-entity":
      return "OE";
    default:
      return "EW";
  }
}

export function buildAccountsXml(
  data: AccountsSubmissionData,
  credentials: PresenterCredentials,
  config: SubmissionConfig,
): string {
  const todayStr = formatDate(new Date());
  const accountsBase64 = Buffer.from(data.accountsIxbrl, "utf-8").toString("base64");

  const senderId = md5(credentials.presenterId);
  const authValue = md5(credentials.presenterAuth);

  const gatewayTestElement = config.isTest
    ? `\n      <GatewayTest>1</GatewayTest>`
    : "";

  const contactNameElement = data.contactName
    ? `\n        <ContactName>${escapeXml(data.contactName)}</ContactName>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>Accounts</Class>
      <Qualifier>request</Qualifier>
      <TransactionID>${escapeXml(data.transactionId)}</TransactionID>${gatewayTestElement}
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${senderId}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Value>${authValue}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys/>
  </GovTalkDetails>
  <Body>
    <FormSubmission xmlns="http://xmlgw.companieshouse.gov.uk/Header"
                    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                    xsi:schemaLocation="http://xmlgw.companieshouse.gov.uk/Header http://xmlgw.companieshouse.gov.uk/v1-0/schema/forms/FormSubmission-v2-11.xsd">
      <FormHeader>
        <CompanyNumber>${escapeXml(data.companyRegistrationNumber)}</CompanyNumber>
        <CompanyType>${escapeXml(data.companyType)}</CompanyType>
        <CompanyName>${escapeXml(data.companyName)}</CompanyName>
        <CompanyAuthenticationCode>${escapeXml(data.companyAuthCode)}</CompanyAuthenticationCode>
        <PackageReference>${escapeXml(config.packageReference)}</PackageReference>
        <FormIdentifier>Accounts</FormIdentifier>
        <SubmissionNumber>${escapeXml(data.submissionNumber)}</SubmissionNumber>${contactNameElement}
      </FormHeader>
      <DateSigned>${todayStr}</DateSigned>
      <Form/>
      <Document>
        <Data>${accountsBase64}</Data>
        <Date>${todayStr}</Date>
        <Filename>accounts.html</Filename>
        <ContentType>application/xml</ContentType>
        <Category>ACCOUNTS</Category>
      </Document>
    </FormSubmission>
  </Body>
</GovTalkMessage>`;
}

/**
 * Builds a GovTalk poll request for Companies House.
 * Uses GetSubmissionStatus with presenter ID + submission number (option 1).
 */
export function buildPollXml(
  correlationId: string,
  credentials: PresenterCredentials,
  isTest = false,
): string {
  const senderId = md5(credentials.presenterId);
  const authValue = md5(credentials.presenterAuth);
  const gatewayTestElement = isTest ? `\n      <GatewayTest>1</GatewayTest>` : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>GetSubmissionStatus</Class>
      <Qualifier>request</Qualifier>${gatewayTestElement}
    </MessageDetails>
    <SenderDetails>
      <IDAuthentication>
        <SenderID>${senderId}</SenderID>
        <Authentication>
          <Method>clear</Method>
          <Value>${authValue}</Value>
        </Authentication>
      </IDAuthentication>
    </SenderDetails>
  </Header>
  <GovTalkDetails>
    <Keys/>
  </GovTalkDetails>
  <Body>
    <GetSubmissionStatus xmlns="http://xmlgw.companieshouse.gov.uk">
      <PresenterID>${escapeXml(credentials.presenterId)}</PresenterID>
      <SubmissionNumber>${escapeXml(correlationId)}</SubmissionNumber>
    </GetSubmissionStatus>
  </Body>
</GovTalkMessage>`;
}
