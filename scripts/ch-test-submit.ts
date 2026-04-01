import "dotenv/config";
import { createHash } from "crypto";
import { generateDormantAccountsIxbrl } from "../src/lib/ixbrl/dormant-accounts";

const md5 = (s: string) => createHash("md5").update(s).digest("hex");

const senderId = md5(process.env.COMPANIES_HOUSE_PRESENTER_ID!);
const authValue = md5(process.env.COMPANIES_HOUSE_PRESENTER_AUTH!);

const ixbrl = generateDormantAccountsIxbrl({
  companyName: "TEST DORMANT COMPANY LTD",
  companyRegistrationNumber: "12345678",
  periodStart: new Date("2025-01-01"),
  periodEnd: new Date("2025-12-31"),
  directorName: "Ben Davies",
  shareCapital: 1,
});

const accountsBase64 = Buffer.from(ixbrl, "utf-8").toString("base64");
const today = new Date().toISOString().slice(0, 10);

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <EnvelopeVersion>2.0</EnvelopeVersion>
  <Header>
    <MessageDetails>
      <Class>Accounts</Class>
      <Qualifier>request</Qualifier>
      <TransactionID>28</TransactionID>
      <GatewayTest>1</GatewayTest>
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
  <GovTalkDetails><Keys/></GovTalkDetails>
  <Body>
    <FormSubmission xmlns="http://xmlgw.companieshouse.gov.uk/Header">
      <FormHeader>
        <CompanyNumber>12345678</CompanyNumber>
        <CompanyType>EW</CompanyType>
        <CompanyName>TEST DORMANT COMPANY LTD</CompanyName>
        <CompanyAuthenticationCode>ABC123</CompanyAuthenticationCode>
        <PackageReference>0012</PackageReference>
        <FormIdentifier>Accounts</FormIdentifier>
        <SubmissionNumber>000028</SubmissionNumber>
      </FormHeader>
      <DateSigned>${today}</DateSigned>
      <Document>
        <Data>${accountsBase64}</Data>
        <Date>${today}</Date>
        <Filename>accounts.html</Filename>
        <ContentType>application/xml</ContentType>
        <Category>ACCOUNTS</Category>
      </Document>
    </FormSubmission>
  </Body>
</GovTalkMessage>`;

console.log("Real dormant iXBRL, Class=Accounts, FormIdentifier=AA");
console.log("iXBRL length:", ixbrl.length, "Base64 length:", accountsBase64.length);

async function run() {
  const res = await fetch("https://xmlgw.companieshouse.gov.uk/v1-0/xmlgw/Gateway", {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: xml,
  });
  console.log("HTTP:", res.status);
  console.log(await res.text());
}
run();
