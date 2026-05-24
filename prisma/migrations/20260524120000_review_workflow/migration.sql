-- CreateEnum
CREATE TYPE "ReviewAction" AS ENUM ('SUBMITTED', 'APPROVED', 'REJECTED', 'REOPENED');

-- CreateTable
CREATE TABLE "ReviewLog" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "action" "ReviewAction" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewLog_documentId_createdAt_idx" ON "ReviewLog"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLog" ADD CONSTRAINT "ReviewLog_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
