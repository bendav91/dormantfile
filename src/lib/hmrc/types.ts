export interface HmrcCredentials {
  gatewayUsername: string;
  gatewayPassword: string;
}

export interface VendorCredentials {
  vendorId: string;
  senderId: string;
  senderPassword: string;
}

export interface CT600Data {
  companyName: string;
  companyRegistrationNumber: string;
  uniqueTaxReference: string;
  periodStart: Date;
  periodEnd: Date;
  declarantName: string;
  declarantStatus: string;
}

export interface AgentCredentials {
  agentGatewayId: string;
  agentGatewayPassword: string;
}

export interface SubmissionResult {
  correlationId: string;
  pollInterval: number;
  endpoint: string;
}

export interface PollResult {
  status: "processing" | "accepted" | "rejected";
  message?: string;
  responsePayload?: string;
  errorCode?: string;
}

export const HMRC_SUBMISSION_CLASS = "HMRC-CT-CT600-TIL";

export const HMRC_ENDPOINTS = {
  test: "https://test-transaction-engine.tax.service.gov.uk/submission",
  live: "https://transaction-engine.tax.service.gov.uk/submission",
} as const;
