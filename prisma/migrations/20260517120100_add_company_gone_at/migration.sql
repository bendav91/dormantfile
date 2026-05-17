-- Set when the daily Companies House resync detects the company has been
-- dissolved / struck off / closed. While set, filing actions are disabled
-- and the company is excluded from all filing-related email. Cleared (and
-- the customer notified) if the company is later restored to the register.
ALTER TABLE "Company" ADD COLUMN "companyGoneAt" TIMESTAMP(3);
