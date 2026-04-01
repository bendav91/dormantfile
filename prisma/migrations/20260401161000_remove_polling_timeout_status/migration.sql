-- Migrate existing polling_timeout filings to submitted
UPDATE "Filing" SET "status" = 'submitted' WHERE "status" = 'polling_timeout';

-- Remove the polling_timeout value from the FilingStatus enum
ALTER TYPE "FilingStatus" RENAME TO "FilingStatus_old";
CREATE TYPE "FilingStatus" AS ENUM ('outstanding', 'pending', 'submitted', 'accepted', 'rejected', 'failed', 'filed_elsewhere');
ALTER TABLE "Filing" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Filing" ALTER COLUMN "status" TYPE "FilingStatus" USING ("status"::text::"FilingStatus");
ALTER TABLE "Filing" ALTER COLUMN "status" SET DEFAULT 'pending';
DROP TYPE "FilingStatus_old";
