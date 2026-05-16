/**
 * Companies House XML Gateway submission and polling client.
 *
 * Note: The CH REST API (developer-specs.company-information.service.gov.uk)
 * exists and uses OAuth 2.0, but does not yet support accounts filing.
 * The XML Gateway remains the production route for accounts.
 */

import { XMLParser } from "fast-xml-parser";
import type { PresenterCredentials } from "./xml-builder";
import { buildPollXml } from "./xml-builder";

interface SubmissionResult {
  submissionId: string;
  pollEndpoint: string;
  pollInterval?: number;
}

interface PollResult {
  status: "accepted" | "rejected" | "pending";
  responsePayload?: string;
  message?: string;
  /**
   * Why a "pending" result is pending. "documents_not_found" is CH error 8023
   * ("EF documents not found") — usually a poll-too-soon timing lag, but if it
   * persists it can mean a genuinely lost submission, so callers apply a grace
   * window before flagging. Absent for the clean 8026 "still processing" case.
   */
  pendingReason?: "documents_not_found";
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
    const errors =
      parsed?.GovTalkMessage?.GovTalkDetails?.GovTalkErrors?.Error ??
      parsed?.GovTalkMessage?.GovTalkErrors?.Error;
    const errorText = Array.isArray(errors)
      ? errors
          .map((e: { Text?: string }) => e.Text)
          .filter(Boolean)
          .join("; ")
      : (errors?.Text ?? "Unknown error");
    console.error("[CH submission-client] Response XML:", responseXml.slice(0, 2000));
    throw new Error(`Companies House rejected submission: ${errorText}`);
  }

  const correlationId =
    parsed?.GovTalkMessage?.Header?.MessageDetails?.CorrelationID ??
    parsed?.GovTalkMessage?.Header?.MessageDetails?.TransactionID;

  if (!correlationId) {
    console.error("[CH submission-client] No CorrelationID or TransactionID. Response:", responseXml.slice(0, 2000));
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
  isTest = false,
): Promise<PollResult> {
  const pollXml = buildPollXml(submissionId, credentials, isTest);

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

  // TEMPORARY DIAGNOSTIC — remove after root-causing the stuck SIMON FRASER
  // filing. Logs exactly what CH returns to production for this poll.
  console.error(
    "[CH-POLL-DEBUG]",
    JSON.stringify({
      submissionId,
      isTest,
      httpStatus: response.status,
      qualifier,
      errorNumber:
        parsed?.GovTalkMessage?.GovTalkDetails?.GovTalkErrors?.Error?.Number ??
        parsed?.GovTalkMessage?.GovTalkErrors?.Error?.Number ??
        null,
      statusCode: JSON.stringify(
        parsed?.GovTalkMessage?.Body?.SubmissionStatus?.Status ?? null,
      ).slice(0, 300),
      rawHead: responseXml.slice(0, 1200),
    }),
  );

  if (qualifier === "error") {
    const errors =
      parsed?.GovTalkMessage?.GovTalkDetails?.GovTalkErrors?.Error ??
      parsed?.GovTalkMessage?.GovTalkErrors?.Error;
    const errorNumber = Array.isArray(errors) ? errors[0]?.Number : errors?.Number;
    const errorText = Array.isArray(errors)
      ? errors
          .map((e: { Text?: string }) => e.Text)
          .filter(Boolean)
          .join("; ")
      : (errors?.Text ?? "Unknown error");

    // 8026 = "No Accepted or Rejected Documents Found" — the clean
    // "still processing" code. Always transient; poll again later.
    if (String(errorNumber) === "8026") {
      return { status: "pending", responsePayload: responseXml };
    }

    // 8023 = "EF documents not found". Almost always a poll-too-soon timing
    // lag (NOT a rejection of the accounts), so it must not be mapped to
    // "rejected". But it can also indicate a genuinely lost submission if it
    // persists, so we surface the reason and let the caller decide when a
    // long-running 8023 should be escalated for review.
    if (String(errorNumber) === "8023") {
      return {
        status: "pending",
        pendingReason: "documents_not_found",
        message: errorText,
        responsePayload: responseXml,
      };
    }

    return {
      status: "rejected",
      message: errorText,
      responsePayload: responseXml,
    };
  }

  if (qualifier === "response") {
    // CH GetSubmissionStatus returns the submission's status *history* as a
    // <Body><SubmissionStatus><Status><StatusCode>…</StatusCode></Status>…>.
    // The envelope qualifier being "response" only means "query answered" —
    // the real outcome is in StatusCode (PENDING / ACCEPTED / PARSED /
    // REJECTED). Treating any "response" as accepted falsely confirms filings
    // that CH still has under examiner review.
    const statusNode = parsed?.GovTalkMessage?.Body?.SubmissionStatus?.Status;
    const statuses = Array.isArray(statusNode)
      ? statusNode
      : statusNode != null
        ? [statusNode]
        : [];

    const codeOf = (s: { StatusCode?: unknown }) =>
      String(s?.StatusCode ?? "").trim().toUpperCase();

    const rejected = statuses.find((s) => codeOf(s) === "REJECTED");
    if (rejected) {
      // Rejections: { Reject: {Description} } | { Reject: [{Description}] }
      const rejectNode = (rejected as { Rejections?: { Reject?: unknown } })
        ?.Rejections?.Reject;
      const rejects = Array.isArray(rejectNode)
        ? rejectNode
        : rejectNode != null
          ? [rejectNode]
          : [];
      const message =
        rejects
          .map((r: { Description?: string }) => r?.Description)
          .filter(Boolean)
          .join("; ") || "Submission rejected by Companies House";
      return { status: "rejected", message, responsePayload: responseXml };
    }

    // Latest status entry is the current state.
    const latest = statuses.length ? codeOf(statuses[statuses.length - 1]) : "";
    if (latest === "ACCEPTED" || latest === "PARSED") {
      return {
        status: "accepted",
        message: "Submission accepted",
        responsePayload: responseXml,
      };
    }

    // PENDING (or any non-terminal/unknown code): still being examined.
    return { status: "pending", responsePayload: responseXml };
  }

  return { status: "pending", responsePayload: responseXml };
}
