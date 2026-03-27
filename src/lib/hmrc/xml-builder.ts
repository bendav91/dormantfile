import { XMLBuilder } from "fast-xml-parser";
import { calculateIRmark } from "./irmark";
import type { CT600Data, HmrcCredentials, VendorCredentials } from "./types";
import { HMRC_SUBMISSION_CLASS } from "./types";

const ATTR = "@_";

/** Format a Date as YYYY-MM-DD for HMRC XML fields. */
function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Shared XMLBuilder config used throughout this module. */
function makeBuilder(): XMLBuilder {
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: ATTR,
    format: false, // compact — whitespace inside elements affects IRmark
    suppressEmptyNode: false,
  });
}

/**
 * Builds the GovTalk/IRenvelope Body XML string (without an IRmark element),
 * then calculates the IRmark over it, then returns the full GovTalk message
 * with the IRmark inserted.
 */
export function buildGovTalkMessage(
  ct600: CT600Data,
  credentials: HmrcCredentials,
  vendor: VendorCredentials
): string {
  const builder = makeBuilder();

  const periodStart = formatDate(ct600.periodStart);
  const periodEnd = formatDate(ct600.periodEnd);

  // ── Body ──────────────────────────────────────────────────────────────────
  // Build the Body without an IRmark first so we can hash it.
  const bodyObj = buildBodyObject(ct600, periodStart, periodEnd);
  const bodyXml = builder.build({ Body: bodyObj });

  const irmark = calculateIRmark(bodyXml);

  // ── Full GovTalk message ──────────────────────────────────────────────────
  const messageObj = {
    "?xml": { [`${ATTR}version`]: "1.0", [`${ATTR}encoding`]: "UTF-8" },
    GovTalkMessage: {
      [`${ATTR}xmlns`]: "http://www.govtalk.gov.uk/CM/envelope",
      Header: buildHeaderObject(credentials, vendor, ct600),
      Body: {
        ...bodyObj,
        // Inject IRmark into the body (inside the IRenvelope at top level).
        IRmark: {
          [`${ATTR}Type`]: "generic",
          "#text": irmark,
        },
      },
    },
  };

  return builder.build(messageObj);
}

/**
 * Builds a GovTalk poll request message.
 */
export function buildPollMessage(
  correlationId: string,
  vendor: VendorCredentials
): string {
  const builder = makeBuilder();

  const pollObj = {
    "?xml": { [`${ATTR}version`]: "1.0", [`${ATTR}encoding`]: "UTF-8" },
    GovTalkMessage: {
      [`${ATTR}xmlns`]: "http://www.govtalk.gov.uk/CM/envelope",
      Header: {
        MessageDetails: {
          Class: HMRC_SUBMISSION_CLASS,
          Qualifier: "poll",
          Function: "submit",
          CorrelationID: correlationId,
          Transformation: "XML",
          GatewayTest: "0",
        },
        SenderDetails: {
          IDAuthentication: {
            SenderID: vendor.senderId,
            Authentication: {
              Method: "clear",
              Role: "principal",
              Value: vendor.senderPassword,
            },
          },
        },
        ChannelRouting: {
          Channel: {
            URI: `urn:software:vendor:${vendor.vendorId}`,
            Name: vendor.vendorId,
            Version: "1.0",
          },
          Timestamp: new Date().toISOString(),
        },
      },
      Body: {},
    },
  };

  return builder.build(pollObj);
}

// ─── Private helpers ─────────────────────────────────────────────────────────

function buildHeaderObject(
  credentials: HmrcCredentials,
  vendor: VendorCredentials,
  ct600: CT600Data
) {
  return {
    MessageDetails: {
      Class: HMRC_SUBMISSION_CLASS,
      Qualifier: "request",
      Function: "submit",
      Transformation: "XML",
      GatewayTest: "0",
    },
    SenderDetails: {
      IDAuthentication: {
        SenderID: credentials.gatewayUsername,
        Authentication: {
          Method: "clear",
          Role: "principal",
          Value: credentials.gatewayPassword,
        },
      },
    },
    ChannelRouting: {
      Channel: {
        URI: `urn:software:vendor:${vendor.vendorId}`,
        Name: vendor.vendorId,
        Version: "1.0",
      },
      Timestamp: new Date().toISOString(),
    },
  };
}

function buildBodyObject(
  ct600: CT600Data,
  periodStart: string,
  periodEnd: string
) {
  return {
    [`${ATTR}xmlns`]: "http://www.govtalk.gov.uk/documents/IRenvelope",
    IRenvelope: {
      IRheader: {
        Keys: {
          Key: {
            [`${ATTR}Type`]: "UTR",
            "#text": ct600.uniqueTaxReference,
          },
        },
        PeriodStart: periodStart,
        PeriodEnd: periodEnd,
        Principal: {
          Contact: {
            Name: {
              Fore: ct600.declarantName.split(" ")[0] ?? ct600.declarantName,
              Sur: ct600.declarantName.split(" ").slice(1).join(" ") || ct600.declarantName,
            },
          },
        },
        DefaultCurrency: "GBP",
        IRmark: {
          [`${ATTR}Type`]: "generic",
          "#text": "",
        },
        Sender: "Company",
      },
      CompanyTaxReturn: {
        [`${ATTR}xmlns`]: "http://www.govtalk.gov.uk/taxation/CT/5",
        [`${ATTR}ReturnType`]: "original",
        CompanyInformation: {
          CompanyName: ct600.companyName,
          RegistrationNumber: "",
          Reference: {
            [`${ATTR}Type`]: "UTR",
            "#text": ct600.uniqueTaxReference,
          },
        },
        ReturnPeriod: {
          From: periodStart,
          To: periodEnd,
        },
        Turnover: 0,
        GrossProfit: 0,
        NetProfit: 0,
        TaxableProfit: 0,
        TaxPayable: 0,
        Declaration: {
          AcceptDeclaration: "yes",
          Name: ct600.declarantName,
          Status: ct600.declarantStatus,
          Date: formatDate(new Date()),
        },
      },
    },
  };
}
