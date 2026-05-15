import { XMLParser } from "fast-xml-parser";
import { buildPollMessage } from "./xml-builder";
import type { SubmissionResult, PollResult, VendorCredentials } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

type GovTalkError = { Number?: string | number; Text?: string };

/** HMRC nests errors under GovTalkDetails; some responses use a top-level GovTalkErrors. */
function extractGovTalkErrors(parsed: unknown): GovTalkError[] {
  const root = parsed as {
    GovTalkMessage?: {
      GovTalkDetails?: { GovTalkErrors?: { Error?: GovTalkError | GovTalkError[] } };
      GovTalkErrors?: { Error?: GovTalkError | GovTalkError[] };
    };
  };
  const errors =
    root?.GovTalkMessage?.GovTalkDetails?.GovTalkErrors?.Error ??
    root?.GovTalkMessage?.GovTalkErrors?.Error;
  return Array.isArray(errors) ? errors : errors ? [errors] : [];
}

function formatGovTalkErrors(errors: GovTalkError[]): string {
  return (
    errors
      .map((e) => [e.Number, e.Text].filter(Boolean).join(": "))
      .filter(Boolean)
      .join("; ") || "HMRC rejected the submission without a specific error message"
  );
}

export async function submitToHmrc(
  govTalkXml: string,
  endpoint: string,
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

  const messageDetails = parsed?.GovTalkMessage?.Header?.MessageDetails;
  const qualifier = messageDetails?.Qualifier;

  // Surface the actual HMRC error text — a generic "no correlationId" here
  // hides the real cause (schema/auth/business validation).
  const submitErrors = extractGovTalkErrors(parsed);
  if (qualifier === "error" || submitErrors.length > 0) {
    throw new Error(`HMRC submission error: ${formatGovTalkErrors(submitErrors)}`);
  }

  const correlationId = messageDetails?.CorrelationID;
  if (!correlationId) {
    throw new Error("No correlationId found in HMRC response");
  }

  // ResponseEndPoint is nested in Header/MessageDetails (per the GovTalk
  // acknowledgement); it points at the /poll endpoint, which differs from the
  // /submission endpoint. Polling must use this, not the submission URL.
  const responseEndPoint =
    messageDetails?.ResponseEndPoint ?? parsed?.GovTalkMessage?.ResponseEndPoint;
  const pollInterval =
    (typeof responseEndPoint === "object" ? responseEndPoint?.["@_PollInterval"] : undefined) ?? 10;
  const pollEndpoint =
    (typeof responseEndPoint === "object" ? responseEndPoint?.["#text"] : responseEndPoint) ??
    endpoint;

  return {
    correlationId: String(correlationId),
    pollInterval: Number(pollInterval),
    endpoint: String(pollEndpoint),
  };
}

export async function pollHmrc(
  correlationId: string,
  endpoint: string,
  vendor: VendorCredentials,
): Promise<PollResult> {
  // GatewayTest is a schema-fixed value that must match the environment the
  // submission used; the test /poll endpoint requires GatewayTest=1.
  const isTest = endpoint.includes("test");
  const pollXml = buildPollMessage(correlationId, vendor, isTest);

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

  const qualifier = parsed?.GovTalkMessage?.Header?.MessageDetails?.Qualifier;
  const errorList = extractGovTalkErrors(parsed);

  if (qualifier === "error" || errorList.length > 0) {
    const errorText = formatGovTalkErrors(errorList);

    // Extract error codes for specific handling
    const errorCodes = errorList
      .map((e) => String(e.Number ?? ""))
      .filter(Boolean);

    // 1046 = UTR not enrolled on Government Gateway
    const is1046 = errorCodes.includes("1046");
    const message = is1046
      ? "Your UTR is not enrolled for Corporation Tax on your Government Gateway account. You need to enrol at HMRC's online services before you can file."
      : errorText;

    return {
      status: "rejected",
      message,
      errorCode: errorCodes[0],
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
