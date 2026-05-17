-- Director confirmed at the pre-file gate. Drives the accounts iXBRL
-- signature (and the CT600 declarant in director mode) so filings are
-- never silently made in the account holder's name — wrong when an agent
-- manages other people's companies.
ALTER TABLE "Company" ADD COLUMN "filingDirectorName" TEXT;
ALTER TABLE "Company" ADD COLUMN "filingDirectorConfirmedAt" TIMESTAMP(3);
