-- AlterTable
ALTER TABLE "ad_events" ADD COLUMN "country" TEXT;
ALTER TABLE "ad_events" ADD COLUMN "device" TEXT;
ALTER TABLE "ad_events" ADD COLUMN "ipAddress" TEXT;
ALTER TABLE "ad_events" ADD COLUMN "locale" TEXT;

-- AlterTable
ALTER TABLE "calculation_events" ADD COLUMN "country" TEXT;
ALTER TABLE "calculation_events" ADD COLUMN "device" TEXT;
ALTER TABLE "calculation_events" ADD COLUMN "locale" TEXT;
ALTER TABLE "calculation_events" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "calculation_events" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "calculation_events" ADD COLUMN "utmSource" TEXT;

-- AlterTable
ALTER TABLE "page_views" ADD COLUMN "locale" TEXT;
ALTER TABLE "page_views" ADD COLUMN "utmCampaign" TEXT;
ALTER TABLE "page_views" ADD COLUMN "utmContent" TEXT;
ALTER TABLE "page_views" ADD COLUMN "utmMedium" TEXT;
ALTER TABLE "page_views" ADD COLUMN "utmSource" TEXT;
ALTER TABLE "page_views" ADD COLUMN "utmTerm" TEXT;

-- CreateTable
CREATE TABLE "revenue_models" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "effectiveFrom" DATETIME NOT NULL,
    "effectiveTo" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "assumptions" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "monetization_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "adSlotId" TEXT,
    "pagePath" TEXT,
    "country" TEXT,
    "device" TEXT,
    "periodStart" DATETIME NOT NULL,
    "periodEnd" DATETIME NOT NULL,
    "metrics" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedById" TEXT,
    "resolvedAt" DATETIME,
    "resolvedNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "traffic_sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "firstPagePath" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmTerm" TEXT,
    "utmContent" TEXT,
    "country" TEXT,
    "device" TEXT,
    "locale" TEXT,
    "pageViews" INTEGER NOT NULL DEFAULT 1,
    "calculations" INTEGER NOT NULL DEFAULT 0,
    "adImpressions" INTEGER NOT NULL DEFAULT 0,
    "adClicks" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "tool_cards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descAr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT 'from-blue-500 to-indigo-600',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeaturedOnHome" BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnTools" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "benefit_features" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titleAr" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "descAr" TEXT NOT NULL,
    "descEn" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_integrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "apiKey" TEXT,
    "model" TEXT,
    "features" TEXT NOT NULL,
    "quota" INTEGER NOT NULL DEFAULT 0,
    "used" INTEGER NOT NULL DEFAULT 0,
    "lastReset" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "config" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ai_generated_content" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentType" TEXT NOT NULL,
    "targetId" TEXT,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "revenue_goals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "targetRevenue" REAL NOT NULL,
    "targetPageviews" INTEGER NOT NULL,
    "targetRPM" REAL NOT NULL,
    "actualRevenue" REAL NOT NULL DEFAULT 0,
    "actualPageviews" INTEGER NOT NULL DEFAULT 0,
    "actualRPM" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "revenue_projections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectionDate" DATETIME NOT NULL,
    "projectedRevenue" REAL NOT NULL,
    "confidence" TEXT NOT NULL DEFAULT 'MEDIUM',
    "basedOnDays" INTEGER NOT NULL,
    "growthRate" REAL NOT NULL,
    "seasonalFactor" REAL NOT NULL DEFAULT 1.0,
    "assumptions" TEXT NOT NULL,
    "actualRevenue" REAL,
    "accuracy" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "maintenance_mode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "title" TEXT NOT NULL DEFAULT 'الموقع قيد الصيانة / Site Under Maintenance',
    "messageAr" TEXT NOT NULL DEFAULT 'نعتذر عن الإزعاج. الموقع قيد الصيانة حالياً وسيعود قريباً.',
    "messageEn" TEXT NOT NULL DEFAULT 'Sorry for the inconvenience. The site is currently under maintenance and will be back soon.',
    "startTime" DATETIME,
    "endTime" DATETIME,
    "allowedIPs" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "system_health" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "checkTime" DATETIME NOT NULL,
    "cpuUsage" REAL,
    "memoryUsage" REAL,
    "diskUsage" REAL,
    "responseTime" INTEGER,
    "errorRate" REAL,
    "activeUsers" INTEGER,
    "databaseSize" REAL,
    "cacheHitRate" REAL,
    "status" TEXT NOT NULL DEFAULT 'HEALTHY',
    "issues" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "page_edits" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pageSlug" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "sectionId" TEXT,
    "editType" TEXT NOT NULL,
    "beforeData" TEXT,
    "afterData" TEXT,
    "editorId" TEXT NOT NULL,
    "editorName" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_blog_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL DEFAULT '',
    "titleEn" TEXT NOT NULL DEFAULT '',
    "excerptAr" TEXT NOT NULL DEFAULT '',
    "excerptEn" TEXT NOT NULL DEFAULT '',
    "bodyMarkdownAr" TEXT NOT NULL DEFAULT '',
    "bodyMarkdownEn" TEXT NOT NULL DEFAULT '',
    "heroImageUrl" TEXT,
    "tags" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "excerpt" TEXT NOT NULL DEFAULT '',
    "bodyMarkdown" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "blog_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_blog_posts" ("authorId", "bodyMarkdown", "createdAt", "excerpt", "heroImageUrl", "id", "isPublished", "publishedAt", "slug", "tags", "title", "updatedAt", "viewCount") SELECT "authorId", "bodyMarkdown", "createdAt", "excerpt", "heroImageUrl", "id", "isPublished", "publishedAt", "slug", "tags", "title", "updatedAt", "viewCount" FROM "blog_posts";
DROP TABLE "blog_posts";
ALTER TABLE "new_blog_posts" RENAME TO "blog_posts";
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");
CREATE INDEX "blog_posts_isPublished_idx" ON "blog_posts"("isPublished");
CREATE INDEX "blog_posts_publishedAt_idx" ON "blog_posts"("publishedAt");
CREATE TABLE "new_faqs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "category" TEXT NOT NULL,
    "questionAr" TEXT NOT NULL DEFAULT '',
    "questionEn" TEXT NOT NULL DEFAULT '',
    "answerAr" TEXT NOT NULL DEFAULT '',
    "answerEn" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "question" TEXT NOT NULL DEFAULT '',
    "answer" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_faqs" ("answer", "category", "createdAt", "id", "isPublished", "locale", "question", "sortOrder", "updatedAt") SELECT "answer", "category", "createdAt", "id", "isPublished", "locale", "question", "sortOrder", "updatedAt" FROM "faqs";
DROP TABLE "faqs";
ALTER TABLE "new_faqs" RENAME TO "faqs";
CREATE INDEX "faqs_category_idx" ON "faqs"("category");
CREATE INDEX "faqs_isPublished_idx" ON "faqs"("isPublished");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "revenue_models_name_key" ON "revenue_models"("name");

-- CreateIndex
CREATE INDEX "revenue_models_isActive_idx" ON "revenue_models"("isActive");

-- CreateIndex
CREATE INDEX "revenue_models_effectiveFrom_idx" ON "revenue_models"("effectiveFrom");

-- CreateIndex
CREATE INDEX "monetization_alerts_alertType_idx" ON "monetization_alerts"("alertType");

-- CreateIndex
CREATE INDEX "monetization_alerts_severity_idx" ON "monetization_alerts"("severity");

-- CreateIndex
CREATE INDEX "monetization_alerts_isResolved_idx" ON "monetization_alerts"("isResolved");

-- CreateIndex
CREATE INDEX "monetization_alerts_createdAt_idx" ON "monetization_alerts"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "traffic_sessions_sessionId_key" ON "traffic_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "traffic_sessions_utmSource_idx" ON "traffic_sessions"("utmSource");

-- CreateIndex
CREATE INDEX "traffic_sessions_referrer_idx" ON "traffic_sessions"("referrer");

-- CreateIndex
CREATE INDEX "traffic_sessions_startedAt_idx" ON "traffic_sessions"("startedAt");

-- CreateIndex
CREATE INDEX "traffic_sessions_country_idx" ON "traffic_sessions"("country");

-- CreateIndex
CREATE UNIQUE INDEX "tool_cards_slug_key" ON "tool_cards"("slug");

-- CreateIndex
CREATE INDEX "tool_cards_isFeaturedOnHome_idx" ON "tool_cards"("isFeaturedOnHome");

-- CreateIndex
CREATE INDEX "tool_cards_isVisibleOnTools_idx" ON "tool_cards"("isVisibleOnTools");

-- CreateIndex
CREATE INDEX "benefit_features_isPublished_idx" ON "benefit_features"("isPublished");

-- CreateIndex
CREATE UNIQUE INDEX "ai_integrations_provider_key" ON "ai_integrations"("provider");

-- CreateIndex
CREATE INDEX "ai_generated_content_contentType_idx" ON "ai_generated_content"("contentType");

-- CreateIndex
CREATE INDEX "ai_generated_content_isApproved_idx" ON "ai_generated_content"("isApproved");

-- CreateIndex
CREATE INDEX "ai_generated_content_createdAt_idx" ON "ai_generated_content"("createdAt");

-- CreateIndex
CREATE INDEX "revenue_goals_year_month_idx" ON "revenue_goals"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_goals_year_month_key" ON "revenue_goals"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_projections_projectionDate_key" ON "revenue_projections"("projectionDate");

-- CreateIndex
CREATE INDEX "revenue_projections_projectionDate_idx" ON "revenue_projections"("projectionDate");

-- CreateIndex
CREATE UNIQUE INDEX "system_health_checkTime_key" ON "system_health"("checkTime");

-- CreateIndex
CREATE INDEX "system_health_checkTime_idx" ON "system_health"("checkTime");

-- CreateIndex
CREATE INDEX "system_health_status_idx" ON "system_health"("status");

-- CreateIndex
CREATE INDEX "page_edits_pageSlug_idx" ON "page_edits"("pageSlug");

-- CreateIndex
CREATE INDEX "page_edits_editorId_idx" ON "page_edits"("editorId");

-- CreateIndex
CREATE INDEX "page_edits_createdAt_idx" ON "page_edits"("createdAt");

-- CreateIndex
CREATE INDEX "ad_events_country_idx" ON "ad_events"("country");

-- CreateIndex
CREATE INDEX "ad_events_sessionId_idx" ON "ad_events"("sessionId");

-- CreateIndex
CREATE INDEX "calculation_events_locale_idx" ON "calculation_events"("locale");

-- CreateIndex
CREATE INDEX "page_views_utmSource_idx" ON "page_views"("utmSource");

-- CreateIndex
CREATE INDEX "page_views_country_idx" ON "page_views"("country");
