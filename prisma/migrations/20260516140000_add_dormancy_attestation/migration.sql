-- Records the user's dormancy declaration accepted when a company is added.
ALTER TABLE "Company" ADD COLUMN "dormancyAttestationAcceptedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "dormancyAttestationVersion" TEXT;
