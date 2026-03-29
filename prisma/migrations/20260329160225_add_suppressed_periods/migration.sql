-- CreateTable
CREATE TABLE "SuppressedPeriod" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuppressedPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SuppressedPeriod_companyId_periodEnd_key" ON "SuppressedPeriod"("companyId", "periodEnd");

-- AddForeignKey
ALTER TABLE "SuppressedPeriod" ADD CONSTRAINT "SuppressedPeriod_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
