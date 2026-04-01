/**
 * Companies House XML Gateway submission and polling client.
 *
 * Note: The CH REST API (developer-specs.company-information.service.gov.uk)
 * exists and uses OAuth 2.0, but does not yet support accounts filing.
 * The XML Gateway remains the production route for accounts.
 */

import { XMLParser } from "fast-xml-parser";
import { buildPollXml } from "./xml-builder";
import type { PresenterCredentials } from "./xml-builder";

interface SubmissionResult {
  submissionId: string;
  pollEndpoint: string;
  pollInterval?: number;
}

interface PollResult {
  status: "accepted" | "rejected" | "pending";
  responsePayload?: string;
  message?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export async function submitToCompaniesHouse(
  xml: string,
  endpoint: string,
): Promise<SubmissionResult> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: xml,
  });

  if (!response.ok) {
    throw new Error(`Companies House submission failed with status ${response.status}`);
  }

  const responseXml = await response.text();
  const parsed = parser.parse(responseXml);

  // Check for GovTalk errors (transport/auth/parse failures)
  const qualifier = parsed?.GovTalkMessage?.Header?.MessageDetails?.Qualifier;
  if (qualifier === "error") {
    const errors = parsed?.GovTalkMessage?.GovTalkErrors?.Error;
    const errorText = Array.isArray(errors)
      ? errors
          .map((e: { Text?: string }) => e.Text)
          .filter(Boolean)
          .join("; ")
      : (errors?.Text ?? "Unknown error");
    throw new Error(`Companies House rejected submission: ${errorText}`);
  }

  const correlationId = parsed?.GovTalkMessage?.Header?.MessageDetails?.CorrelationID;

  if (!correlationId) {
    throw new Error("No correlation ID found in Companies House response");
  }

  // Extract poll interval if present (in seconds)
  const responseEndPoint = parsed?.GovTalkMessage?.Header?.MessageDetails?.ResponseEndPoint;
  const pollInterval = responseEndPoint?.["@_PollInterval"]
    ? parseInt(responseEndPoint["@_PollInterval"], 10)
    : undefined;

  return {
    submissionId: String(correlationId),
    pollEndpoint: endpoint,
    pollInterval,
  };
}

export async function pollCompaniesHouse(
  submissionId: string,
  pollEndpoint: string,
  credentials: PresenterCredentials,
): Promise<PollResult> {
  const pollXml = buildPollXml(submissionId, credentials);

  const response = await fetch(pollEndpoint, {
    method: "POST",
    headers: { "Content-Type": "text/xml" },
    body: pollXml,
  });

  if (!response.ok) {
    throw new Error(`Companies House poll failed with status ${response.status}`);
  }

  const responseXml = await response.text();
  const parsed = parser.parse(responseXml);

  const qualifier = parsed?.GovTalkMessage?.Header?.MessageDetails?.Qualifier;

  if (qualifier === "error") {
    const errors = parsed?.GovTalkMessage?.GovTalkErrors?.Error;
    const errorText = Array.isArray(errors)
      ? errors
          .map((e: { Text?: string }) => e.Text)
          .filter(Boolean)
          .join("; ")
      : (errors?.Text ?? "Unknown error");

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

  return { status: "pending" };
}
