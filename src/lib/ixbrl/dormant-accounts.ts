import type { IxbrlCompanyData } from "./types";
import { NS, SCHEMA_REFS } from "./taxonomy";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Date one day before the period start, used for instant contexts at start of period */
function dayBefore(d: Date): string {
  const prev = new Date(d);
  prev.setUTCDate(prev.getUTCDate() - 1);
  return formatDate(prev);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates an iXBRL (Inline XBRL) HTML document for dormant company accounts.
 *
 * This produces a human-readable HTML page with embedded XBRL tags conforming
 * to the FRC 2023 taxonomy. All financial values are zero (dormant company).
 *
 * The same document is used for both:
 * - Companies House annual accounts filing
 * - HMRC CT600 accounts attachment
 */
export function generateDormantAccountsIxbrl(data: IxbrlCompanyData): string {
  const name = escapeXml(data.companyName);
  const crn = escapeXml(data.companyRegistrationNumber);
  const director = escapeXml(data.directorName);
  const periodStart = formatDate(data.periodStart);
  const periodEnd = formatDate(data.periodEnd);
  const instantStart = dayBefore(data.periodStart);
  const approvalDate = formatDate(new Date());

  // Share capital in whole pounds (input is pence). Assuming paid-up shares:
  // the share capital amount appears as current assets (cash) and as called up share capital.
  const scPence = data.shareCapital ?? 0;
  const sc = Math.round(scPence / 100); // whole pounds

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="${NS.ix}"
      xmlns:xbrli="${NS.xbrli}"
      xmlns:xbrldi="${NS.xbrldi}"
      xmlns:link="${NS.link}"
      xmlns:xlink="${NS.xlink}"
      xmlns:iso4217="${NS.iso4217}"
      xmlns:uk-bus="${NS["uk-bus"]}"
      xmlns:uk-core="${NS["uk-core"]}"
      xmlns:uk-direp="${NS["uk-direp"]}">
<head>
  <meta charset="UTF-8" />
  <title>${name} – Annual Accounts</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; margin: 40px; color: #333; }
    h1 { font-size: 16pt; }
    h2 { font-size: 13pt; margin-top: 24px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; }
    th { background: #f0f0f0; }
    td.amount { text-align: right; }
    .note { font-size: 9pt; color: #666; margin-top: 32px; }
  </style>
</head>
<body>
  <ix:header>
    <ix:hidden>
      <ix:nonNumeric name="uk-bus:EntityCurrentLegalOrRegisteredName" contextRef="duration">${name}</ix:nonNumeric>
      <ix:nonNumeric name="uk-bus:UKCompaniesHouseRegisteredNumber" contextRef="duration">${crn}</ix:nonNumeric>
      <ix:nonNumeric name="uk-bus:StartDateForPeriodCoveredByReport" contextRef="duration">${periodStart}</ix:nonNumeric>
      <ix:nonNumeric name="uk-bus:EndDateForPeriodCoveredByReport" contextRef="duration">${periodEnd}</ix:nonNumeric>
      <ix:nonNumeric name="uk-bus:BalanceSheetDate" contextRef="duration">${periodEnd}</ix:nonNumeric>
      <ix:nonNumeric name="uk-bus:EntityDormantTruefalse" contextRef="duration">true</ix:nonNumeric>
      <ix:nonNumeric name="uk-bus:AccountsTypeFullOrAbbreviated" contextRef="duration">Abbreviated</ix:nonNumeric>
      <ix:nonNumeric name="uk-bus:AccountingStandardsApplied" contextRef="duration">Small Entities (Micro-entity Provisions)</ix:nonNumeric>
      <ix:nonNumeric name="uk-direp:StatementThatCompanyEntitledToExemptionUnderSection480CompaniesAct2006" contextRef="duration">true</ix:nonNumeric>
      <ix:nonNumeric name="uk-bus:DateApprovalAccounts" contextRef="duration">${approvalDate}</ix:nonNumeric>
      <ix:nonNumeric name="uk-bus:NameDirectorSigningAccounts" contextRef="duration">${director}</ix:nonNumeric>
    </ix:hidden>
    <ix:references>
      <link:schemaRef xlink:type="simple" xlink:href="${SCHEMA_REFS.frc2023Core}" />
    </ix:references>
    <ix:resources>
      <xbrli:context id="duration">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.companieshouse.gov.uk/">${crn}</xbrli:identifier>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:startDate>${periodStart}</xbrli:startDate>
          <xbrli:endDate>${periodEnd}</xbrli:endDate>
        </xbrli:period>
      </xbrli:context>
      <xbrli:context id="instant-end">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.companieshouse.gov.uk/">${crn}</xbrli:identifier>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:instant>${periodEnd}</xbrli:instant>
        </xbrli:period>
      </xbrli:context>
      <xbrli:context id="instant-start">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.companieshouse.gov.uk/">${crn}</xbrli:identifier>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:instant>${instantStart}</xbrli:instant>
        </xbrli:period>
      </xbrli:context>
      <xbrli:unit id="GBP">
        <xbrli:measure>iso4217:GBP</xbrli:measure>
      </xbrli:unit>
    </ix:resources>
  </ix:header>

  <h1>${name}</h1>
  <p>Company Registration Number: ${crn}</p>
  <p>Annual Accounts for the period ${periodStart} to ${periodEnd}</p>

  <h2>Directors' Report</h2>
  <p>The directors present their report and accounts for the period ended ${periodEnd}.</p>
  <p><ix:nonNumeric name="uk-direp:StatementThatCompanyHasBeenDormantPeriod" contextRef="duration">The company has been dormant within the meaning of section 1169 of the Companies Act 2006 throughout the period and consequently no revenue account is required.</ix:nonNumeric></p>

  <h2>Balance Sheet as at ${periodEnd}</h2>
  <table>
    <thead>
      <tr>
        <th></th>
        <th class="amount">${periodEnd}</th>
        <th class="amount">${instantStart}</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Called up share capital not paid</td>
        <td class="amount"><ix:nonFraction name="uk-core:CalledUpShareCapitalNotPaid" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
        <td class="amount"><ix:nonFraction name="uk-core:CalledUpShareCapitalNotPaid" contextRef="instant-start" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
      </tr>
      <tr>
        <td>Total fixed assets</td>
        <td class="amount"><ix:nonFraction name="uk-core:FixedAssets" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
        <td class="amount"><ix:nonFraction name="uk-core:FixedAssets" contextRef="instant-start" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
      </tr>
      <tr>
        <td>Total current assets</td>
        <td class="amount"><ix:nonFraction name="uk-core:CurrentAssets" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></td>
        <td class="amount"><ix:nonFraction name="uk-core:CurrentAssets" contextRef="instant-start" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></td>
      </tr>
      <tr>
        <td>Creditors: amounts falling due within one year</td>
        <td class="amount"><ix:nonFraction name="uk-core:Creditors-AmountsFallingDueWithinOneYear" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
        <td class="amount"><ix:nonFraction name="uk-core:Creditors-AmountsFallingDueWithinOneYear" contextRef="instant-start" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
      </tr>
      <tr>
        <td><strong>Net current assets</strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-core:NetCurrentAssetsLiabilities" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-core:NetCurrentAssetsLiabilities" contextRef="instant-start" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></strong></td>
      </tr>
      <tr>
        <td><strong>Total assets less current liabilities</strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-core:TotalAssetsLessCurrentLiabilities" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-core:TotalAssetsLessCurrentLiabilities" contextRef="instant-start" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></strong></td>
      </tr>
      <tr>
        <td>Creditors: amounts falling due after more than one year</td>
        <td class="amount"><ix:nonFraction name="uk-core:Creditors-AmountsFallingDueAfterOneYear" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
        <td class="amount"><ix:nonFraction name="uk-core:Creditors-AmountsFallingDueAfterOneYear" contextRef="instant-start" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
      </tr>
      <tr>
        <td><strong>Net assets</strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-core:NetAssetsLiabilities" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-core:NetAssetsLiabilities" contextRef="instant-start" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></strong></td>
      </tr>
    </tbody>
  </table>

  <h2>Capital and Reserves</h2>
  <table>
    <tbody>
      <tr>
        <td>Called up share capital</td>
        <td class="amount"><ix:nonFraction name="uk-core:CalledUpShareCapital" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></td>
      </tr>
      <tr>
        <td>Profit and loss account</td>
        <td class="amount"><ix:nonFraction name="uk-core:ProfitLossAccountReserve" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
      </tr>
      <tr>
        <td><strong>Shareholders' funds</strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-core:ShareholderFunds" contextRef="instant-end" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">${sc}</ix:nonFraction></strong></td>
      </tr>
    </tbody>
  </table>

  <p style="margin-top: 24px;">
    These accounts were approved by the board of directors on ${approvalDate} and signed on its behalf by:
  </p>
  <p><strong>${director}</strong>, Director</p>

  <p class="note">
    For the period ended ${periodEnd} the company was entitled to exemption under section 480 of the Companies Act 2006
    relating to dormant companies. The members have not required the company to obtain an audit of its accounts
    for the period in question in accordance with section 476.
  </p>
</body>
</html>`;
}
