import type { IxbrlTaxComputationData } from "./types";
import { NS, SCHEMA_REFS } from "./taxonomy";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
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
 * Generates an iXBRL HTML document for dormant company tax computations.
 *
 * This is the HMRC-specific computation document attached to a CT600
 * submission alongside the accounts. For a dormant company, all values
 * are zero -- no trading income, no expenses, no taxable profit.
 *
 * Tagged with HMRC's Detailed Profit and Loss (DPL) taxonomy.
 */
export function generateDormantTaxComputationsIxbrl(data: IxbrlTaxComputationData): string {
  const name = escapeXml(data.companyName);
  const crn = escapeXml(data.companyRegistrationNumber);
  const utr = escapeXml(data.uniqueTaxReference);
  const periodStart = formatDate(data.periodStart);
  const periodEnd = formatDate(data.periodEnd);

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:ix="${NS.ix}"
      xmlns:xbrli="${NS.xbrli}"
      xmlns:link="${NS.link}"
      xmlns:xlink="${NS.xlink}"
      xmlns:iso4217="${NS.iso4217}"
      xmlns:uk-tax-comp="${NS["uk-tax-comp"]}"
      xmlns:uk-tax-dpl="${NS["uk-tax-dpl"]}">
<head>
  <meta charset="UTF-8" />
  <title>${name} – Tax Computation</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11pt; margin: 40px; color: #333; }
    h1 { font-size: 16pt; }
    h2 { font-size: 13pt; margin-top: 24px; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; }
    th, td { border: 1px solid #999; padding: 6px 10px; text-align: left; }
    th { background: #f0f0f0; }
    td.amount { text-align: right; }
  </style>
</head>
<body>
  <ix:header>
    <ix:hidden>
      <ix:nonNumeric name="uk-tax-comp:CompanyName" contextRef="duration">${name}</ix:nonNumeric>
      <ix:nonNumeric name="uk-tax-comp:CompanyRegistrationNumber" contextRef="duration">${crn}</ix:nonNumeric>
      <ix:nonNumeric name="uk-tax-comp:TaxReferenceNumber" contextRef="duration">${utr}</ix:nonNumeric>
      <ix:nonNumeric name="uk-tax-comp:PeriodOfAccountsStartDate" contextRef="duration">${periodStart}</ix:nonNumeric>
      <ix:nonNumeric name="uk-tax-comp:PeriodOfAccountsEndDate" contextRef="duration">${periodEnd}</ix:nonNumeric>
    </ix:hidden>
    <ix:references>
      <link:schemaRef xlink:type="simple" xlink:href="${SCHEMA_REFS.hmrcComp}" />
    </ix:references>
    <ix:resources>
      <xbrli:context id="duration">
        <xbrli:entity>
          <xbrli:identifier scheme="http://www.hmrc.gov.uk/">${utr}</xbrli:identifier>
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

  <h1>${name}</h1>
  <p>UTR: ${utr} | CRN: ${crn}</p>
  <p>Tax Computation for the period ${periodStart} to ${periodEnd}</p>

  <h2>Computation of Corporation Tax</h2>
  <table>
    <tbody>
      <tr>
        <td>Turnover / Revenue</td>
        <td class="amount"><ix:nonFraction name="uk-tax-dpl:Turnover" contextRef="duration" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
      </tr>
      <tr>
        <td>Cost of sales</td>
        <td class="amount"><ix:nonFraction name="uk-tax-dpl:CostOfSales" contextRef="duration" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
      </tr>
      <tr>
        <td><strong>Gross profit</strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-tax-dpl:GrossProfit" contextRef="duration" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></strong></td>
      </tr>
      <tr>
        <td>Administrative expenses</td>
        <td class="amount"><ix:nonFraction name="uk-tax-dpl:AdministrativeExpenses" contextRef="duration" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></td>
      </tr>
      <tr>
        <td><strong>Net profit before tax</strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-tax-dpl:NetProfitBeforeTax" contextRef="duration" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></strong></td>
      </tr>
      <tr>
        <td>Tax adjustments</td>
        <td class="amount">0</td>
      </tr>
      <tr>
        <td><strong>Taxable profit</strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-tax-comp:TaxableProfitLoss" contextRef="duration" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></strong></td>
      </tr>
      <tr>
        <td><strong>Corporation tax payable</strong></td>
        <td class="amount"><strong><ix:nonFraction name="uk-tax-comp:CorporationTaxChargeable" contextRef="duration" unitRef="GBP" decimals="0" format="ixt:numdotdecimal">0</ix:nonFraction></strong></td>
      </tr>
    </tbody>
  </table>

  <p style="margin-top: 24px; font-size: 9pt; color: #666;">
    The company has been dormant throughout the period. No trading activity has taken place
    and accordingly no profit or loss arises. Corporation tax payable is nil.
  </p>
</body>
</html>`;
}
