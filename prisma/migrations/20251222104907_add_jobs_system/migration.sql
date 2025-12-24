/*
  Warnings:

  - You are about to drop the `jobs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "jobs";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "job_definitions" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scheduleCron" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultPayload" TEXT DEFAULT '{}',
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "startedAt" DATETIME,
    "finishedAt" DATETIME,
    "durationMs" INTEGER,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "payloadJson" TEXT DEFAULT '{}',
    "resultJson" TEXT,
    "errorJson" TEXT,
    "requestId" TEXT,
    "triggeredById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "job_runs_jobKey_fkey" FOREIGN KEY ("jobKey") REFERENCES "job_definitions" ("key") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "job_runs_status_idx" ON "job_runs"("status");

-- CreateIndex
CREATE INDEX "job_runs_startedAt_idx" ON "job_runs"("startedAt");

-- CreateIndex
CREATE INDEX "job_runs_jobKey_idx" ON "job_runs"("jobKey");
