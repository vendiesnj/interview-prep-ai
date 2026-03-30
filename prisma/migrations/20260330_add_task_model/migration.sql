CREATE TABLE "Task" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "tenantId"    TEXT,
  "title"       TEXT NOT NULL,
  "notes"       TEXT,
  "priority"    TEXT NOT NULL DEFAULT 'medium',
  "category"    TEXT,
  "dueDate"     TIMESTAMP(3),
  "scheduledAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Task_userId_completedAt_idx" ON "Task"("userId", "completedAt");
CREATE INDEX "Task_userId_dueDate_idx" ON "Task"("userId", "dueDate");
CREATE INDEX "Task_tenantId_idx" ON "Task"("tenantId");

ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
