import { XMLBuilder } from "fast-xml-parser";
import { calculateIRmark } from "./irmark";
import type {
  CT600Data,
  HmrcCredentials,
  VendorCredentials,
  AgentCredentials,
} from "./types";
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
    format: false, // compact -- whitespace inside elements affects IRmark
    suppressEmptyNode: false,
  });
}

export interface GovTalkMessageOptions {
  ct600: CT600Data;
  credentials: HmrcCredentials;
  vendor: VendorCredentials;
  /** iXBRL accounts HTML document to attach */
  accountsIxbrl: string;
  /** iXBRL tax computations HTML document to attach */
  computationsIxbrl: string;
  /** Set to true when using the HMRC test endpoint */
  isTest?: boolean;
  /** Agent credentials -- if provided, files as agent instead of director */
  agent?: AgentCredentials;
}

/**
 * Builds the GovTalk/IRenvelope Body XML string (without an IRmark element),
 * then calculates the IRmark over it, then returns the full GovTalk message
 * with the IRmark inserted.
 *
 * Includes iXBRL accounts and tax computations as base64-encoded attachments.
 */
export async function buildGovTalkMessage(
  opts: GovTalkMessageOptions
): Promise<string> {
  const builder = makeBuilder();
  const { ct600, credentials, vendor, accountsIxbrl, computationsIxbrl, isTest, agent } = opts;

  const periodStart = formatDate(ct600.periodStart);
  const periodEnd = formatDate(ct600.periodEnd);

  // Build the Body without an IRmark first so we can hash it.
  const bodyObj = buildBodyObject(ct600, periodStart, periodEnd, accountsIxbrl, computationsIxbrl);
  const bodyXml = builder.build({ Body: bodyObj });

  const irmark = await calculateIRmark(bodyXml);

  // Determine SenderDetails credentials (agent vs director)
  const senderCredentials = agent
    ? { id: agent.agentGatewayId, password: agent.agentGatewayPassword }
    : { id: credentials.gatewayUsername, password: credentials.gatewayPassword };

  const messageObj = {
    "?xml": { [`${ATTR}version`]: "1.0", [`${ATTR}encoding`]: "UTF-8" },
    GovTalkMessage: {
      [`${ATTR}xmlns`]: "http://www.govtalk.gov.uk/CM/envelope",
      EnvelopeVersion: "2.0",
      Header: buildHeaderObject(senderCredentials, vendor, isTest),
      Body: {
        ...bodyObj,
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
      EnvelopeVersion: "2.0",
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
  sender: { id: string; password: string },
  vendor: VendorCredentials,
  isTest?: boolean
) {
  return {
    MessageDetails: {
      Class: HMRC_SUBMISSION_CLASS,
      Qualifier: "request",
      Function: "submit",
      Transformation: "XML",
      GatewayTest: isTest ? "1" : "0",
    },
    SenderDetails: {
      IDAuthentication: {
        SenderID: sender.id,
        Authentication: {
          Method: "clear",
          Role: "principal",
          Value: sender.password,
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
  periodEnd: string,
  accountsIxbrl: string,
  computationsIxbrl: string
) {
  const accountsBase64 = Buffer.from(accountsIxbrl, "utf-8").toString("base64");
  const computationsBase64 = Buffer.from(computationsIxbrl, "utf-8").toString("base64");

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
          RegistrationNumber: ct600.companyRegistrationNumber,
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
      Attachment: [
        {
          [`${ATTR}Type`]: "ixbrl",
          [`${ATTR}Description`]: "Annual Accounts",
          "#text": accountsBase64,
        },
        {
          [`${ATTR}Type`]: "ixbrl",
          [`${ATTR}Description`]: "Tax Computation",
          "#text": computationsBase64,
        },
      ],
    },
  };
}
