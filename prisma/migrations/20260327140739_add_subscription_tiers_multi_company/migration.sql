-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('none', 'basic', 'multi', 'bulk');

-- DropIndex
DROP INDEX "Company_userId_key";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'none';
