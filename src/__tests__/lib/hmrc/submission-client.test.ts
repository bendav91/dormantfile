import { pollHmrc, submitToHmrc } from "@/lib/hmrc/submission-client";
import type { VendorCredentials } from "@/lib/hmrc/types";
import { afterEach, describe, expect, it, vi } from "vitest";

const vendor: VendorCredentials = {
  vendorId: "vendor123",
  senderId: "sender456",
  senderPassword: "senderpass",
};

const ENDPOINT = "https://test-transaction-engine.tax.service.gov.uk/submission";

function makeFetchResponse(body: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as unknown as Response;
}

// Mirrors a real HMRC acknowledgement: ResponseEndPoint is nested inside
// Header/MessageDetails and points at the /poll endpoint.
const SUBMIT_RESPONSE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Qualifier>acknowledgement</Qualifier>
      <CorrelationID>corr-abc-123</CorrelationID>
      <ResponseEndPoint PollInterval="30">https://poll.example.com/poll</ResponseEndPoint>
    </MessageDetails>
  </Header>
</GovTalkMessage>`;

// Real HMRC schema-rejection shape: Qualifier=error, errors nested under
// GovTalkDetails, empty CorrelationID.
const SUBMIT_ERROR_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Qualifier>error</Qualifier>
      <CorrelationID></CorrelationID>
    </MessageDetails>
  </Header>
  <GovTalkDetails>
    <Keys/>
    <GovTalkErrors>
      <Error>
        <RaisedBy>System</RaisedBy>
        <Number>1001</Number>
        <Type>fatal</Type>
        <Text>cvc-complex-type.2.4.d: Invalid content was found starting with element 'ChannelRouting'.</Text>
      </Error>
    </GovTalkErrors>
  </GovTalkDetails>
  <Body/>
</GovTalkMessage>`;

// Real HMRC business-rejection shape: errors nested under GovTalkDetails.
const REJECTED_POLL_GOVTALKDETAILS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Qualifier>error</Qualifier>
    </MessageDetails>
  </Header>
  <GovTalkDetails>
    <GovTalkErrors>
      <Error>
        <Number>1046</Number>
        <Text>Authentication Failure</Text>
      </Error>
    </GovTalkErrors>
  </GovTalkDetails>
  <Body/>
</GovTalkMessage>`;

const ACCEPTED_POLL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Qualifier>response</Qualifier>
    </MessageDetails>
  </Header>
  <Body>
    <IRenvelope>accepted payload</IRenvelope>
  </Body>
</GovTalkMessage>`;

const PROCESSING_POLL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Qualifier>acknowledgement</Qualifier>
    </MessageDetails>
  </Header>
  <Body></Body>
</GovTalkMessage>`;

const REJECTED_POLL_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <Qualifier>error</Qualifier>
    </MessageDetails>
  </Header>
  <GovTalkErrors>
    <Error>
      <Text>Submission rejected by HMRC</Text>
    </Error>
  </GovTalkErrors>
  <Body></Body>
</GovTalkMessage>`;

describe("submitToHmrc", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns correlationId and pollInterval from valid XML response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeFetchResponse(SUBMIT_RESPONSE_XML));

    const result = await submitToHmrc("<xml>submission</xml>", ENDPOINT);

    expect(result.correlationId).toBe("corr-abc-123");
    expect(result.pollInterval).toBe(30);
    expect(result.endpoint).toBe("https://poll.example.com/poll");
  });

  it("throws on non-200 response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeFetchResponse("Internal Server Error", 500),
    );

    await expect(submitToHmrc("<xml>submission</xml>", ENDPOINT)).rejects.toThrow();
  });

  it("surfaces the actual HMRC GovTalk error text (nested under GovTalkDetails)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeFetchResponse(SUBMIT_ERROR_XML));

    await expect(submitToHmrc("<xml>submission</xml>", ENDPOINT)).rejects.toThrow(
      /HMRC submission error:.*1001.*ChannelRouting/,
    );
  });
});

describe("pollHmrc", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns accepted when qualifier is response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeFetchResponse(ACCEPTED_POLL_XML));

    const result = await pollHmrc("corr-abc-123", ENDPOINT, vendor);

    expect(result.status).toBe("accepted");
    expect(result.message).toBe("Submission accepted");
    expect(result.responsePayload).toBeDefined();
  });

  it("returns processing when qualifier is acknowledgement", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeFetchResponse(PROCESSING_POLL_XML));

    const result = await pollHmrc("corr-abc-123", ENDPOINT, vendor);

    expect(result.status).toBe("processing");
  });

  it("returns rejected with error message when qualifier is error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(makeFetchResponse(REJECTED_POLL_XML));

    const result = await pollHmrc("corr-abc-123", ENDPOINT, vendor);

    expect(result.status).toBe("rejected");
    expect(result.message).toContain("Submission rejected by HMRC");
    expect(result.responsePayload).toBeDefined();
  });

  it("reads errors nested under GovTalkDetails and maps code 1046 to a helpful message", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      makeFetchResponse(REJECTED_POLL_GOVTALKDETAILS_XML),
    );

    const result = await pollHmrc("corr-abc-123", ENDPOINT, vendor);

    expect(result.status).toBe("rejected");
    expect(result.errorCode).toBe("1046");
    expect(result.message).toContain("not enrolled for Corporation Tax");
  });
});
