-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "ardChangeDetected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ardChangeDetectedAt" TIMESTAMP(3),
ADD COLUMN     "ctapStartDate" TIMESTAMP(3),
ADD COLUMN     "newArdDay" INTEGER,
ADD COLUMN     "newArdMonth" INTEGER;

-- AlterTable
ALTER TABLE "Filing" ADD COLUMN     "deadline" TIMESTAMP(3),
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "periodId" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "accountsDeadline" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Period_companyId_periodStart_periodEnd_key" ON "Period"("companyId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "Period" ADD CONSTRAINT "Period_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Filing" ADD CONSTRAINT "Filing_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
