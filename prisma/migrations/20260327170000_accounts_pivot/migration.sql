-- CreateEnum
CREATE TYPE "FilingType" AS ENUM ('accounts', 'ct600');

-- AlterTable: make uniqueTaxReference nullable
ALTER TABLE "Company" ALTER COLUMN "uniqueTaxReference" DROP NOT NULL;

-- AlterTable: add registeredForCorpTax with default
ALTER TABLE "Company" ADD COLUMN "registeredForCorpTax" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: set registeredForCorpTax = true where UTR exists
UPDATE "Company" SET "registeredForCorpTax" = true WHERE "uniqueTaxReference" IS NOT NULL;

-- AlterTable: add filingType to Filing as nullable first
ALTER TABLE "Filing" ADD COLUMN "filingType" "FilingType";

-- Backfill: all existing filings are ct600
UPDATE "Filing" SET "filingType" = 'ct600';

-- Now make filingType NOT NULL
ALTER TABLE "Filing" ALTER COLUMN "filingType" SET NOT NULL;

-- Drop old unique constraint on Filing
ALTER TABLE "Filing" DROP CONSTRAINT IF EXISTS "Filing_companyId_periodStart_periodEnd_key";

-- Add new unique constraint including filingType
ALTER TABLE "Filing" ADD CONSTRAINT "Filing_companyId_periodStart_periodEnd_filingType_key" UNIQUE ("companyId", "periodStart", "periodEnd", "filingType");

-- AlterTable: add filingType to Reminder as nullable first
ALTER TABLE "Reminder" ADD COLUMN "filingType" "FilingType";

-- Backfill: all existing reminders are ct600
UPDATE "Reminder" SET "filingType" = 'ct600';

-- Now make filingType NOT NULL
ALTER TABLE "Reminder" ALTER COLUMN "filingType" SET NOT NULL;
