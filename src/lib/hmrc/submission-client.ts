import { XMLParser } from "fast-xml-parser";
import { buildPollMessage } from "./xml-builder";
import type { SubmissionResult, PollResult, VendorCredentials } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export async function submitToHmrc(
  govTalkXml: string,
  endpoint: string
): Promise<SubmissionResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: govTalkXml,
  });

  if (!response.ok) {
    throw new Error(`HMRC submission failed with status ${response.status}`);
  }

  const responseXml = await response.text();
  const parsed = parser.parse(responseXml);

  const correlationId =
    parsed?.GovTalkMessage?.Header?.MessageDetails?.CorrelationID;

  if (!correlationId) {
    throw new Error("No correlationId found in HMRC response");
  }

  const responseEndPoint = parsed?.GovTalkMessage?.ResponseEndPoint;
  const pollInterval: number =
    responseEndPoint?.["@_PollInterval"] ?? 10;
  const pollEndpoint: string =
    responseEndPoint?.["#text"] ?? endpoint;

  return {
    correlationId: String(correlationId),
    pollInterval: Number(pollInterval),
    endpoint: pollEndpoint,
  };
}

export async function pollHmrc(
  correlationId: string,
  endpoint: string,
  vendor: VendorCredentials
): Promise<PollResult> {
  const pollXml = buildPollMessage(correlationId, vendor);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/xml" },
    body: pollXml,
  });

  if (!response.ok) {
    throw new Error(`HMRC poll failed with status ${response.status}`);
  }

  const responseXml = await response.text();
  const parsed = parser.parse(responseXml);

  const qualifier =
    parsed?.GovTalkMessage?.Header?.MessageDetails?.Qualifier;

  if (qualifier === "error") {
    const errors = parsed?.GovTalkMessage?.GovTalkErrors?.Error;
    const errorText = Array.isArray(errors)
      ? errors.map((e: { Text?: string }) => e.Text).filter(Boolean).join("; ")
      : errors?.Text ?? "Unknown error";

    return {
      status: "rejected",
      message: errorText,
      responsePayload: responseXml,
    };
  }

  if (qualifier === "response") {
    return {
      status: "accepted",
      message: "Submission accepted",
      responsePayload: responseXml,
    };
  }

  return { status: "processing" };
}
