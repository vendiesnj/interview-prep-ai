-- Add completedAt and dueDate to ChecklistProgress
ALTER TABLE "ChecklistProgress"
  ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dueDate"     TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "ChecklistProgress_userId_completedAt_idx"
  ON "ChecklistProgress"("userId", "completedAt");

-- ProductivityScore table
CREATE TABLE IF NOT EXISTS "ProductivityScore" (
  "id"                 TEXT         NOT NULL,
  "userId"             TEXT         NOT NULL,
  "tenantId"           TEXT,
  "weekStart"          TIMESTAMP(3) NOT NULL,
  "score"              DOUBLE PRECISION NOT NULL,
  "schedulingRate"     DOUBLE PRECISION NOT NULL,
  "completionRate"     DOUBLE PRECISION NOT NULL,
  "onTimeRate"         DOUBLE PRECISION NOT NULL,
  "streak"             INTEGER      NOT NULL,
  "tasksScheduled"     INTEGER      NOT NULL,
  "tasksCompleted"     INTEGER      NOT NULL,
  "checklistDone"      INTEGER      NOT NULL,
  "checklistScheduled" INTEGER      NOT NULL,
  "computedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ProductivityScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductivityScore_userId_weekStart_key"
  ON "ProductivityScore"("userId", "weekStart");

CREATE INDEX IF NOT EXISTS "ProductivityScore_tenantId_weekStart_idx"
  ON "ProductivityScore"("tenantId", "weekStart");

CREATE INDEX IF NOT EXISTS "ProductivityScore_userId_weekStart_idx"
  ON "ProductivityScore"("userId", "weekStart");

ALTER TABLE "ProductivityScore"
  ADD CONSTRAINT "ProductivityScore_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
