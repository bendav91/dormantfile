/*
  Warnings:

  - You are about to drop the column `accountsDeadline` on the `Filing` table. All the data in the column will be lost.
  - You are about to drop the column `ct600Deadline` on the `Filing` table. All the data in the column will be lost.
  - You are about to drop the column `periodId` on the `Filing` table. All the data in the column will be lost.
  - You are about to drop the `Period` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Filing" DROP CONSTRAINT "Filing_periodId_fkey";

-- DropForeignKey
ALTER TABLE "Period" DROP CONSTRAINT "Period_companyId_fkey";

-- AlterTable
ALTER TABLE "Filing" DROP COLUMN "accountsDeadline",
DROP COLUMN "ct600Deadline",
DROP COLUMN "periodId";

-- DropTable
DROP TABLE "Period";
