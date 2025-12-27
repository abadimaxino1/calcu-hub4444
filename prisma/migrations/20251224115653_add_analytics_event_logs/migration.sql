/*
  Warnings:

  - You are about to drop the column `isEnabled` on the `feature_flags` table. All the data in the column will be lost.
  - Added the required column `name` to the `feature_flags` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "calculators" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'hidden',
    "routePath" TEXT NOT NULL,
    "configJson" TEXT,
    "analyticsNamespace" TEXT,
    "adProfileId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT
);

-- CreateTable
CREATE TABLE "feature_flag_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "flagId" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "targetingJson" TEXT,
    "dependenciesJson" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "feature_flag_rules_flagId_fkey" FOREIGN KEY ("flagId") REFERENCES "feature_flags" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "analytics_event_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "pagePath" TEXT,
    "propertiesJson" TEXT NOT NULL DEFAULT '{}',
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "analytics_event_properties" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "exampleValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "analytics_event_properties_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "analytics_events" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analytics_providers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "settingsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "funnels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stepsJson" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'site',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cohorts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ruleJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "backups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "filePath" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "checksum" TEXT,
    "durationMs" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT
);

-- CreateTable
CREATE TABLE "backup_schedules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cron" TEXT NOT NULL DEFAULT '0 0 * * *',
    "retentionCount" INTEGER NOT NULL DEFAULT 7,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" DATETIME,
    "nextRunAt" DATETIME,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "cms_pages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currentVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT
);

-- CreateTable
CREATE TABLE "cms_page_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "bodyRichJson" TEXT,
    "examplesJson" TEXT,
    "faqJson" TEXT,
    "legalNotes" TEXT,
    "seoOverridesJson" TEXT,
    "publishNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT
);

-- CreateTable
CREATE TABLE "cms_preview_tokens" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "pageId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT
);

-- CreateTable
CREATE TABLE "ad_profiles" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slotsOrderJson" TEXT,
    "policiesJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "allocationJson" TEXT,
    "targetingJson" TEXT,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "primaryMetric" TEXT,
    "variantsJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "redirects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromPath" TEXT NOT NULL,
    "toPath" TEXT NOT NULL,
    "type" INTEGER NOT NULL DEFAULT 301,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "broken_links" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "url" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "lastChecked" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFixed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "seo_global_settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "schema_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_prompt_templates" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "activeVersionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_prompt_versions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "modelPreferencesJson" TEXT,
    "promptText" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_prompt_versions_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ai_prompt_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_usage_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" REAL NOT NULL DEFAULT 0,
    "userId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "errorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ai_fallback_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "featureKey" TEXT NOT NULL,
    "primaryProvider" TEXT NOT NULL,
    "fallbackChainJson" TEXT NOT NULL,
    "timeoutMs" INTEGER NOT NULL DEFAULT 10000,
    "maxRetries" INTEGER NOT NULL DEFAULT 2,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "error_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "occurredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "level" TEXT NOT NULL DEFAULT 'error',
    "source" TEXT,
    "route" TEXT,
    "pagePath" TEXT,
    "requestId" TEXT,
    "sessionId" TEXT,
    "userId" TEXT,
    "actorRole" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_feature_flags" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabledByDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_feature_flags" ("createdAt", "description", "id", "key", "updatedAt") SELECT "createdAt", "description", "id", "key", "updatedAt" FROM "feature_flags";
DROP TABLE "feature_flags";
ALTER TABLE "new_feature_flags" RENAME TO "feature_flags";
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "calculators_key_key" ON "calculators"("key");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flag_rules_flagId_environment_key" ON "feature_flag_rules"("flagId", "environment");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_key_key" ON "analytics_events"("key");

-- CreateIndex
CREATE INDEX "analytics_event_logs_eventKey_idx" ON "analytics_event_logs"("eventKey");

-- CreateIndex
CREATE INDEX "analytics_event_logs_sessionId_idx" ON "analytics_event_logs"("sessionId");

-- CreateIndex
CREATE INDEX "analytics_event_logs_occurredAt_idx" ON "analytics_event_logs"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_event_properties_eventId_key_key" ON "analytics_event_properties"("eventId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_providers_key_key" ON "analytics_providers"("key");

-- CreateIndex
CREATE UNIQUE INDEX "funnels_key_key" ON "funnels"("key");

-- CreateIndex
CREATE UNIQUE INDEX "cohorts_key_key" ON "cohorts"("key");

-- CreateIndex
CREATE INDEX "backups_createdAt_idx" ON "backups"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "cms_pages_slug_key" ON "cms_pages"("slug");

-- CreateIndex
CREATE INDEX "cms_pages_slug_idx" ON "cms_pages"("slug");

-- CreateIndex
CREATE INDEX "cms_page_versions_pageId_versionNumber_idx" ON "cms_page_versions"("pageId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ad_profiles_name_key" ON "ad_profiles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "experiments_key_key" ON "experiments"("key");

-- CreateIndex
CREATE UNIQUE INDEX "redirects_fromPath_key" ON "redirects"("fromPath");

-- CreateIndex
CREATE UNIQUE INDEX "seo_global_settings_key_key" ON "seo_global_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "schema_templates_name_key" ON "schema_templates"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_templates_key_key" ON "ai_prompt_templates"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ai_prompt_versions_templateId_versionNumber_key" ON "ai_prompt_versions"("templateId", "versionNumber");

-- CreateIndex
CREATE INDEX "ai_usage_logs_featureKey_idx" ON "ai_usage_logs"("featureKey");

-- CreateIndex
CREATE INDEX "ai_usage_logs_createdAt_idx" ON "ai_usage_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_fallback_rules_featureKey_key" ON "ai_fallback_rules"("featureKey");

-- CreateIndex
CREATE INDEX "error_events_occurredAt_idx" ON "error_events"("occurredAt");

-- CreateIndex
CREATE INDEX "error_events_level_idx" ON "error_events"("level");

-- CreateIndex
CREATE INDEX "error_events_isResolved_idx" ON "error_events"("isResolved");

-- CreateIndex
CREATE INDEX "error_events_requestId_idx" ON "error_events"("requestId");
