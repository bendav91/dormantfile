// Stub — submits to Companies House Software Filing API and polls for response.
// Real implementation TBD after CH software filer registration.

interface PresenterCredentials {
  presenterId: string;
  presenterAuth: string;
}

interface SubmissionResult {
  submissionId: string;
  pollEndpoint: string;
}

interface PollResult {
  status: "accepted" | "rejected" | "pending";
  responsePayload?: string;
  message?: string;
}

export async function submitToCompaniesHouse(
  xml: string,
  endpoint: string,
  credentials: PresenterCredentials
): Promise<SubmissionResult> {
  // TODO: Implement real HTTP POST to CH endpoint
  throw new Error(
    "Companies House submission not yet implemented — awaiting software filer registration"
  );
}

export async function pollCompaniesHouse(
  submissionId: string,
  pollEndpoint: string,
  credentials: PresenterCredentials
): Promise<PollResult> {
  // TODO: Implement real polling
  throw new Error(
    "Companies House polling not yet implemented — awaiting software filer registration"
  );
}
