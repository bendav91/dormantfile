export interface IxbrlCompanyData {
  companyName: string;
  companyRegistrationNumber: string;
  periodStart: Date;
  periodEnd: Date;
  /** Director name for the balance sheet signature */
  directorName: string;
}

export interface IxbrlTaxComputationData {
  companyName: string;
  companyRegistrationNumber: string;
  uniqueTaxReference: string;
  periodStart: Date;
  periodEnd: Date;
}
