import { pollCompaniesHouse } from "@/lib/companies-house/submission-client";
import type { PresenterCredentials } from "@/lib/companies-house/xml-builder";
import { afterEach, describe, expect, it, vi } from "vitest";

const creds: PresenterCredentials = {
  presenterId: "presenter123",
  presenterAuth: "presenterpass",
};
const ENDPOINT = "https://xmlgw.companieshouse.gov.uk/v1-0/xmlgw/Gateway";

function makeFetchResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

// Real CH GetSubmissionStatus body captured live from the gateway — a
// submission still under examiner review. CH returns the status *history*
// as repeated <Status> elements; envelope Qualifier is "response".
const PENDING_STATUS_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Class>GetSubmissionStatus</Class>
      <Qualifier>response</Qualifier>
    </MessageDetails>
  </Header>
  <GovTalkDetails><Keys/></GovTalkDetails>
  <Body>
<SubmissionStatus>
  <Status>
    <SubmissionNumber>000029</SubmissionNumber>
    <StatusCode>PENDING</StatusCode>
    <CompanyNumber>12345674</CompanyNumber>
    <Rejections></Rejections>
    <Examiner><Comment>Pending review of attachment</Comment></Examiner>
  </Status>
  <Status>
    <SubmissionNumber>000029</SubmissionNumber>
    <StatusCode>PENDING</StatusCode>
    <CompanyNumber>12345674</CompanyNumber>
    <Rejections></Rejections>
    <Examiner><Comment>Pending review of attachment</Comment></Examiner>
  </Status>
</SubmissionStatus>
  </Body>
</GovTalkMessage>`;

// Same shape, terminal ACCEPTED state.
const ACCEPTED_STATUS_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Class>GetSubmissionStatus</Class>
      <Qualifier>response</Qualifier>
    </MessageDetails>
  </Header>
  <GovTalkDetails><Keys/></GovTalkDetails>
  <Body>
<SubmissionStatus>
  <Status>
    <SubmissionNumber>000029</SubmissionNumber>
    <StatusCode>PENDING</StatusCode>
    <CompanyNumber>06989379</CompanyNumber>
    <Rejections></Rejections>
  </Status>
  <Status>
    <SubmissionNumber>000029</SubmissionNumber>
    <StatusCode>ACCEPTED</StatusCode>
    <CompanyNumber>06989379</CompanyNumber>
    <Rejections></Rejections>
  </Status>
</SubmissionStatus>
  </Body>
</GovTalkMessage>`;

// Terminal REJECTED state with a rejection reason.
const REJECTED_STATUS_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Class>GetSubmissionStatus</Class>
      <Qualifier>response</Qualifier>
    </MessageDetails>
  </Header>
  <GovTalkDetails><Keys/></GovTalkDetails>
  <Body>
<SubmissionStatus>
  <Status>
    <SubmissionNumber>000029</SubmissionNumber>
    <StatusCode>REJECTED</StatusCode>
    <CompanyNumber>06989379</CompanyNumber>
    <Rejections>
      <Reject>
        <RejectionCode>503</RejectionCode>
        <Description>The submission contained an invalid made-up date.</Description>
      </Reject>
    </Rejections>
  </Status>
</SubmissionStatus>
  </Body>
</GovTalkMessage>`;

// Existing GovTalk error shapes that must keep working.
const ERR_8026_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header><MessageDetails><Qualifier>error</Qualifier></MessageDetails></Header>
  <GovTalkDetails><Keys/>
    <GovTalkErrors><Error>
      <RaisedBy>GetSubmissionStatus</RaisedBy>
      <Number>8026</Number><Type>fatal</Type>
      <Text>No Accepted or Rejected Documents Found</Text>
    </Error></GovTalkErrors>
  </GovTalkDetails><Body/>
</GovTalkMessage>`;

const ERR_8023_XML = `<?xml version="1.0" encoding="UTF-8" ?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header><MessageDetails><Qualifier>error</Qualifier></MessageDetails></Header>
  <GovTalkDetails><Keys/>
    <GovTalkErrors><Error>
      <RaisedBy>GetSubmissionStatus</RaisedBy>
      <Number>8023</Number><Type>fatal</Type>
      <Text>EF documents not found</Text>
    </Error></GovTalkErrors>
  </GovTalkDetails><Body/>
</GovTalkMessage>`;

describe("pollCompaniesHouse — GetSubmissionStatus body parsing", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a PENDING SubmissionStatus to pending, not accepted", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeFetchResponse(PENDING_STATUS_XML),
    );

    const result = await pollCompaniesHouse("000029", ENDPOINT, creds, true);

    expect(result.status).toBe("pending");
  });

  it("maps a terminal ACCEPTED status to accepted", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeFetchResponse(ACCEPTED_STATUS_XML),
    );

    const result = await pollCompaniesHouse("000029", ENDPOINT, creds, true);

    expect(result.status).toBe("accepted");
  });

  it("maps a REJECTED status to rejected with the rejection reason", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeFetchResponse(REJECTED_STATUS_XML),
    );

    const result = await pollCompaniesHouse("000029", ENDPOINT, creds, true);

    expect(result.status).toBe("rejected");
    expect(result.message).toContain("invalid made-up date");
  });

  it("still treats GovTalk error 8026 as pending (no reason)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeFetchResponse(ERR_8026_XML),
    );

    const result = await pollCompaniesHouse("000029", ENDPOINT, creds, true);

    expect(result.status).toBe("pending");
    expect(result.pendingReason).toBeUndefined();
  });

  it("still treats GovTalk error 8023 as pending with documents_not_found", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeFetchResponse(ERR_8023_XML),
    );

    const result = await pollCompaniesHouse("000029", ENDPOINT, creds, true);

    expect(result.status).toBe("pending");
    expect(result.pendingReason).toBe("documents_not_found");
  });
});
