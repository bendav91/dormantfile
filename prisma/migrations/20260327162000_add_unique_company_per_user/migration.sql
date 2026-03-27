-- CreateIndex
CREATE UNIQUE INDEX "Company_userId_companyRegistrationNumber_key" ON "Company"("userId", "companyRegistrationNumber");
