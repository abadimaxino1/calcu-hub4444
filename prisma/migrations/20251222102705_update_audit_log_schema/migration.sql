/*
  Warnings:

  - You are about to drop the column `actorId` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `actorName` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `afterData` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `beforeData` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `diff` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `ipAddress` on the `audit_logs` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "actorIp" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "sessionId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "beforeJson" TEXT,
    "afterJson" TEXT,
    "diffJson" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}'
);
INSERT INTO "new_audit_logs" ("action", "entityId", "entityType", "id", "requestId", "userAgent") SELECT "action", "entityId", "entityType", "id", "requestId", "userAgent" FROM "audit_logs";
DROP TABLE "audit_logs";
ALTER TABLE "new_audit_logs" RENAME TO "audit_logs";
CREATE INDEX "audit_logs_occurredAt_idx" ON "audit_logs"("occurredAt");
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
