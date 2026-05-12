-- CreateTable
CREATE TABLE "BroadcastEmail" (
    "id" TEXT NOT NULL,
    "sentByUserId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyMarkdown" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL,
    "sendErrors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BroadcastEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BroadcastEmail_createdAt_idx" ON "BroadcastEmail"("createdAt");

-- AddForeignKey
ALTER TABLE "BroadcastEmail" ADD CONSTRAINT "BroadcastEmail_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
