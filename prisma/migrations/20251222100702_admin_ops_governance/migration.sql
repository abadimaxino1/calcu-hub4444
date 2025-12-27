-- AlterTable
ALTER TABLE "ad_slots" ADD COLUMN "createdById" TEXT;
ALTER TABLE "ad_slots" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "ad_slots" ADD COLUMN "deletedById" TEXT;
ALTER TABLE "ad_slots" ADD COLUMN "updatedById" TEXT;

-- AlterTable
ALTER TABLE "benefit_features" ADD COLUMN "createdById" TEXT;
ALTER TABLE "benefit_features" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "benefit_features" ADD COLUMN "deletedById" TEXT;
ALTER TABLE "benefit_features" ADD COLUMN "updatedById" TEXT;

-- AlterTable
ALTER TABLE "blog_posts" ADD COLUMN "createdById" TEXT;
ALTER TABLE "blog_posts" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "blog_posts" ADD COLUMN "deletedById" TEXT;
ALTER TABLE "blog_posts" ADD COLUMN "updatedById" TEXT;

-- AlterTable
ALTER TABLE "calculation_events" ADD COLUMN "pagePath" TEXT;

-- AlterTable
ALTER TABLE "static_page_contents" ADD COLUMN "createdById" TEXT;
ALTER TABLE "static_page_contents" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "static_page_contents" ADD COLUMN "deletedById" TEXT;
ALTER TABLE "static_page_contents" ADD COLUMN "updatedById" TEXT;

-- AlterTable
ALTER TABLE "tool_cards" ADD COLUMN "createdById" TEXT;
ALTER TABLE "tool_cards" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "tool_cards" ADD COLUMN "deletedById" TEXT;
ALTER TABLE "tool_cards" ADD COLUMN "updatedById" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN "createdById" TEXT;
ALTER TABLE "users" ADD COLUMN "deletedAt" DATETIME;
ALTER TABLE "users" ADD COLUMN "deletedById" TEXT;
ALTER TABLE "users" ADD COLUMN "updatedById" TEXT;

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT,
    "actorId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "beforeData" TEXT,
    "afterData" TEXT,
    "diff" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payload" TEXT,
    "result" TEXT,
    "error" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "actorId" TEXT,
    "requestId" TEXT,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_faqs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "questionAr" TEXT NOT NULL DEFAULT '',
    "questionEn" TEXT NOT NULL DEFAULT '',
    "answerAr" TEXT NOT NULL DEFAULT '',
    "answerEn" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    "deletedById" TEXT,
    "updatedById" TEXT,
    "createdById" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "question" TEXT NOT NULL DEFAULT '',
    "answer" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_faqs" ("answer", "answerAr", "answerEn", "category", "createdAt", "id", "isPublished", "locale", "question", "questionAr", "questionEn", "sortOrder", "updatedAt") SELECT "answer", "answerAr", "answerEn", "category", "createdAt", "id", "isPublished", "locale", "question", "questionAr", "questionEn", "sortOrder", "updatedAt" FROM "faqs";
DROP TABLE "faqs";
ALTER TABLE "new_faqs" RENAME TO "faqs";
CREATE INDEX "faqs_category_idx" ON "faqs"("category");
CREATE INDEX "faqs_isPublished_idx" ON "faqs"("isPublished");
CREATE INDEX "faqs_deletedAt_idx" ON "faqs"("deletedAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "audit_logs_requestId_idx" ON "audit_logs"("requestId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "audit_logs_entityId_idx" ON "audit_logs"("entityId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "jobs_status_idx" ON "jobs"("status");

-- CreateIndex
CREATE INDEX "jobs_type_idx" ON "jobs"("type");

-- CreateIndex
CREATE INDEX "jobs_createdAt_idx" ON "jobs"("createdAt");

-- CreateIndex
CREATE INDEX "ad_events_adSlotId_eventType_idx" ON "ad_events"("adSlotId", "eventType");

-- CreateIndex
CREATE INDEX "ad_slots_deletedAt_idx" ON "ad_slots"("deletedAt");

-- CreateIndex
CREATE INDEX "benefit_features_deletedAt_idx" ON "benefit_features"("deletedAt");

-- CreateIndex
CREATE INDEX "blog_posts_deletedAt_idx" ON "blog_posts"("deletedAt");

-- CreateIndex
CREATE INDEX "static_page_contents_deletedAt_idx" ON "static_page_contents"("deletedAt");

-- CreateIndex
CREATE INDEX "tool_cards_deletedAt_idx" ON "tool_cards"("deletedAt");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");
