import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { submitToHmrc, pollHmrc } from "@/lib/hmrc/submission-client";
import type { VendorCredentials } from "@/lib/hmrc/types";

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

const SUBMIT_RESPONSE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<GovTalkMessage xmlns="http://www.govtalk.gov.uk/CM/envelope">
  <Header>
    <MessageDetails>
      <CorrelationID>corr-abc-123</CorrelationID>
    </MessageDetails>
  </Header>
  <ResponseEndPoint PollInterval="30">https://poll.example.com/poll</ResponseEndPoint>
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
});
