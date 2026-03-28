export interface IxbrlCompanyData {
  companyName: string;
  companyRegistrationNumber: string;
  periodStart: Date;
  periodEnd: Date;
  /** Director name for the balance sheet signature */
  directorName: string;
  /** Total share capital in pence (e.g. 100 = £1). Defaults to 0 if not provided. */
  shareCapital?: number;
}

export interface IxbrlTaxComputationData {
  companyName: string;
  companyRegistrationNumber: string;
  uniqueTaxReference: string;
  periodStart: Date;
  periodEnd: Date;
}
