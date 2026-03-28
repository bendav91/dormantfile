-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "companyAuthCode" TEXT;

-- AlterTable
ALTER TABLE "Filing" ADD COLUMN     "irmark" TEXT,
ADD COLUMN     "pollInterval" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "filingAsAgent" BOOLEAN NOT NULL DEFAULT false;
