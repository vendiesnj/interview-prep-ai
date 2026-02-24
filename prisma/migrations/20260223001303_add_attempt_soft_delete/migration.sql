-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Attempt_userId_deletedAt_createdAt_idx" ON "Attempt"("userId", "deletedAt", "createdAt");
