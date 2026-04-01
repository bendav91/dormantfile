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

  return `<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="${NS.ix}"
      xmlns:ixt="${NS.ixt}"
      xmlns:xbrli="${NS.xbrli}"
      xmlns:xbrldi="${NS.xbrldi}"
      xmlns:link="${NS.link}"
      xmlns:xlink="${NS.xlink}"
      xmlns:iso4217="${NS.iso4217}"
      xmlns:bus="${NS.bus}"
      xmlns:core="${NS.core}"
      xmlns:direp="${NS.direp}">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <title>${name} – Annual Accounts</title>
  <style type="text/css">
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
      <xbrli:context id="duration-micro">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.companieshouse.gov.uk/">${crn}</xbrli:identifier>
          <xbrli:segment>
            <xbrldi:explicitMember dimension="bus:AccountingStandardsDimension">bus:Micro-entities</xbrldi:explicitMember>
          </xbrli:segment>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:startDate>${periodStart}</xbrli:startDate>
          <xbrli:endDate>${periodEnd}</xbrli:endDate>
        </xbrli:period>
      </xbrli:context>
      <xbrli:context id="duration-unaudited">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.companieshouse.gov.uk/">${crn}</xbrli:identifier>
          <xbrli:segment>
            <xbrldi:explicitMember dimension="bus:AccountsStatusDimension">bus:AuditExempt-NoAccountantsReport</xbrldi:explicitMember>
          </xbrli:segment>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:startDate>${periodStart}</xbrli:startDate>
          <xbrli:endDate>${periodEnd}</xbrli:endDate>
        </xbrli:period>
      </xbrli:context>
      <xbrli:context id="duration-never-traded">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.companieshouse.gov.uk/">${crn}</xbrli:identifier>
          <xbrli:segment>
            <xbrldi:explicitMember dimension="bus:EntityTradingStatusDimension">bus:EntityHasNeverTraded</xbrldi:explicitMember>
          </xbrli:segment>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:startDate>${periodStart}</xbrli:startDate>
          <xbrli:endDate>${periodEnd}</xbrli:endDate>
        </xbrli:period>
      </xbrli:context>
      <xbrli:context id="duration-full-accounts">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.companieshouse.gov.uk/">${crn}</xbrli:identifier>
          <xbrli:segment>
            <xbrldi:explicitMember dimension="bus:AccountsTypeDimension">bus:FullAccounts</xbrldi:explicitMember>
          </xbrli:segment>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:startDate>${periodStart}</xbrli:startDate>
          <xbrli:endDate>${periodEnd}</xbrli:endDate>
        </xbrli:period>
      </xbrli:context>
      <xbrli:context id="duration-small-co">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.companieshouse.gov.uk/">${crn}</xbrli:identifier>
          <xbrli:segment>
            <xbrldi:explicitMember dimension="bus:ApplicableLegislationDimension">bus:SmallCompaniesRegimeForAccounts</xbrldi:explicitMember>
          </xbrli:segment>
        </xbrli:entity>
        <xbrli:period>
          <xbrli:startDate>${periodStart}</xbrli:startDate>
          <xbrli:endDate>${periodEnd}</xbrli:endDate>
        </xbrli:period>
      </xbrli:context>
      <xbrli:unit id="GBP">
        <xbrli:measure>iso4217:GBP</xbrli:measure>
      </xbrli:unit>
    </ix:resources>
  </ix:header>

  <div style="display:none">
    <ix:nonNumeric name="bus:EntityCurrentLegalOrRegisteredName" contextRef="duration">${name}</ix:nonNumeric>
    <ix:nonNumeric name="bus:UKCompaniesHouseRegisteredNumber" contextRef="duration">${crn}</ix:nonNumeric>
    <ix:nonNumeric name="bus:StartDateForPeriodCoveredByReport" contextRef="instant-end">${periodStart}</ix:nonNumeric>
    <ix:nonNumeric name="bus:EndDateForPeriodCoveredByReport" contextRef="instant-end">${periodEnd}</ix:nonNumeric>
    <ix:nonNumeric name="bus:BalanceSheetDate" contextRef="instant-end">${periodEnd}</ix:nonNumeric>
    <ix:nonNumeric name="bus:EntityDormantTruefalse" contextRef="duration">true</ix:nonNumeric>
    <ix:nonNumeric name="bus:AccountingStandardsApplied" contextRef="duration-micro"></ix:nonNumeric>
    <ix:nonNumeric name="bus:AccountsStatusAuditedOrUnaudited" contextRef="duration-unaudited"></ix:nonNumeric>
    <ix:nonNumeric name="bus:EntityTradingStatus" contextRef="duration-never-traded"></ix:nonNumeric>
    <ix:nonNumeric name="bus:ApplicableLegislation" contextRef="duration-small-co"></ix:nonNumeric>
    <ix:nonNumeric name="bus:AccountsType" contextRef="duration-full-accounts"></ix:nonNumeric>
    <ix:nonNumeric name="core:DateAuthorisationFinancialStatementsForIssue" contextRef="instant-end">${approvalDate}</ix:nonNumeric>
    <ix:nonNumeric name="core:DirectorSigningFinancialStatements" contextRef="duration"></ix:nonNumeric>
  </div>

  <h1>${name}</h1>
  <p>Company Registration Number: ${crn}</p>
  <p>Annual Accounts for the period ${periodStart} to ${periodEnd}</p>

  <h2>Directors' Report</h2>
  <p>The directors present their report and accounts for the period ended ${periodEnd}.</p>
  <p>The company has been dormant within the meaning of section 1169 of the Companies Act 2006 throughout the period and consequently no revenue account is required.</p>

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
        <td>Current assets</td>
        <td class="amount"><ix:nonFraction name="core:CurrentAssets" contextRef="instant-end" unitRef="GBP" decimals="0">${sc}</ix:nonFraction></td>
        <td class="amount"><ix:nonFraction name="core:CurrentAssets" contextRef="instant-start" unitRef="GBP" decimals="0">${sc}</ix:nonFraction></td>
      </tr>
      <tr>
        <td>Creditors: amounts falling due within one year</td>
        <td class="amount"><ix:nonFraction name="core:Creditors" contextRef="instant-end" unitRef="GBP" decimals="0">0</ix:nonFraction></td>
        <td class="amount"><ix:nonFraction name="core:Creditors" contextRef="instant-start" unitRef="GBP" decimals="0">0</ix:nonFraction></td>
      </tr>
      <tr>
        <td><strong>Net current assets</strong></td>
        <td class="amount"><strong><ix:nonFraction name="core:NetCurrentAssetsLiabilities" contextRef="instant-end" unitRef="GBP" decimals="0">${sc}</ix:nonFraction></strong></td>
        <td class="amount"><strong><ix:nonFraction name="core:NetCurrentAssetsLiabilities" contextRef="instant-start" unitRef="GBP" decimals="0">${sc}</ix:nonFraction></strong></td>
      </tr>
      <tr>
        <td><strong>Net assets</strong></td>
        <td class="amount"><strong><ix:nonFraction name="core:NetAssetsLiabilities" contextRef="instant-end" unitRef="GBP" decimals="0">${sc}</ix:nonFraction></strong></td>
        <td class="amount"><strong><ix:nonFraction name="core:NetAssetsLiabilities" contextRef="instant-start" unitRef="GBP" decimals="0">${sc}</ix:nonFraction></strong></td>
      </tr>
    </tbody>
  </table>

  <h2>Capital and Reserves</h2>
  <table>
    <tbody>
      <tr>
        <td><strong>Total equity</strong></td>
        <td class="amount"><strong><ix:nonFraction name="core:Equity" contextRef="instant-end" unitRef="GBP" decimals="0">${sc}</ix:nonFraction></strong></td>
      </tr>
    </tbody>
  </table>

  <p style="margin-top: 24px;">
    These accounts were approved by the board of directors on ${approvalDate} and signed on its behalf by:
  </p>
  <p><strong>${director}</strong>, Director</p>

  <h2>Statements</h2>

  <p><ix:nonNumeric name="direp:StatementThatCompanyEntitledToExemptionFromAuditUnderSection480CompaniesAct2006RelatingToDormantCompanies" contextRef="duration">For the period ended ${periodEnd} the company was entitled to exemption from audit under section 480 of the Companies Act 2006 relating to dormant companies.</ix:nonNumeric></p>

  <p><ix:nonNumeric name="direp:StatementThatMembersHaveNotRequiredCompanyToObtainAnAudit" contextRef="duration">The members have not required the company to obtain an audit of its accounts for the period in question in accordance with section 476 of the Companies Act 2006.</ix:nonNumeric></p>

  <p><ix:nonNumeric name="direp:StatementThatDirectorsAcknowledgeTheirResponsibilitiesUnderCompaniesAct" contextRef="duration">The directors acknowledge their responsibilities for complying with the requirements of the Companies Act 2006 with respect to accounting records and the preparation of accounts.</ix:nonNumeric></p>

  <p><ix:nonNumeric name="direp:StatementThatAccountsHaveBeenPreparedInAccordanceWithProvisionsSmallCompaniesRegime" contextRef="duration">These accounts have been prepared and delivered in accordance with the provisions applicable to companies subject to the small companies regime and in accordance with the micro-entity provisions.</ix:nonNumeric></p>
</body>
</html>`;
}
