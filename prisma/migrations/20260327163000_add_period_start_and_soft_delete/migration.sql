-- AlterTable
ALTER TABLE "User" ADD COLUMN "subscriptionPeriodStart" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "deletedAt" TIMESTAMP(3);
