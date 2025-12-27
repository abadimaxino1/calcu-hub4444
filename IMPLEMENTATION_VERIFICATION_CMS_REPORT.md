# Calcu‑Hub — CMS Implementation Verification Report

Date: 2025-12-20

Scope: Verify the “full CMS system” implementation end-to-end (schema/migrations/seeds, server routes + auth/RBAC, admin UI tabs, public endpoints), and document runtime compatibility with the project’s SQLite DB layer.

## Executive Summary

- CMS features (Tools/Features/FAQs, Blog list + post, AI integrations, Maintenance) are present in both schema and admin UI, and their primary API endpoints respond successfully after seeding.
- The backend uses a better-sqlite3 “Prisma-like” shim (not full Prisma Client). Several new CMS/admin routes initially assumed Prisma Client features (e.g., `include`, Promise-returning `groupBy`, Date binding) and required alignment.
- Current status: migrations apply cleanly, tests pass, build succeeds, and key CMS/admin endpoints are verified working via live requests.

## Evidence: Admin UI Tabs

Tabs exist in [src/admin/AdminShell.tsx](src/admin/AdminShell.tsx#L16-L44):
- “الحاسبات والمميزات” (`tools-features`)
- “الذكاء الاصطناعي” (`ai-integrations`)
- “الصيانة” (`maintenance`)

Screenshots captured to local workspace folder:
- [.tmp_screenshots/admin-dashboard.png](.tmp_screenshots/admin-dashboard.png)
- [.tmp_screenshots/admin-tools-features.png](.tmp_screenshots/admin-tools-features.png)
- [.tmp_screenshots/admin-ai-integrations.png](.tmp_screenshots/admin-ai-integrations.png)
- [.tmp_screenshots/admin-maintenance.png](.tmp_screenshots/admin-maintenance.png)

Screenshot automation script updated/used: [scripts/screenshot-unlocked-admin.cjs](scripts/screenshot-unlocked-admin.cjs)

## Evidence: Schema + Migration

Prisma schema includes CMS models in [prisma/schema.prisma](prisma/schema.prisma#L315-L430):
- `ToolCard`
- `BenefitFeature`
- `AIIntegration`
- `MaintenanceMode`
- Revenue forecasting: `RevenueGoal`, `RevenueProjection`, `RevenueModel`

Migrations applied successfully via `prisma migrate deploy` (2 migrations including the AI/Maintenance/Revenue expansion).

## Evidence: Seed

Blog seed uses SQLite directly (not Prisma Client runtime) in [prisma/seeds/blog-posts.cjs](prisma/seeds/blog-posts.cjs).
- Creates/ensures SUPER_ADMIN author for blog posts.
- Inserts/updates blog posts in `blog_posts`.

CMS default content seed endpoint: [server/routes/cms.cjs](server/routes/cms.cjs#L321-L360)

## Evidence: Server Route Wiring

Backend route mounts in [server/index.cjs](server/index.cjs#L130-L215):
- `/api/auth` for login/check/logout
- `/api/cms` for tool cards, features, FAQs, seed
- `/api/admin` for AI integrations + maintenance + revenue projections
- `/api/analytics` for dashboard stats

## Runtime Compatibility Notes (Root Cause + Fixes)

### DB Layer Reality

The running backend uses a SQLite shim in [server/db.cjs](server/db.cjs) that mimics parts of Prisma.
It does not support full Prisma Client features such as:
- `include` joins
- Promise-based `groupBy`
- binding raw `Date` objects into SQLite statements

### Fixes Applied

- Auth routes updated to avoid Prisma `include` and to fetch user separately:
  - [server/routes/auth.cjs](server/routes/auth.cjs)
- Session deletion in shim now supports deletion by `token` or `id`:
  - [server/db.cjs](server/db.cjs#L79-L112)
- Analytics dashboard updated to avoid `.then(...)` on synchronous shim groupBy:
  - [server/routes/analytics.cjs](server/routes/analytics.cjs#L150-L210)
- Shim normalized Date bindings (`Date` → ISO string) for analytics/monetization aggregates and counts:
  - [server/db.cjs](server/db.cjs#L115-L210)
  - [server/db.cjs](server/db.cjs#L310-L370)

## Endpoint Validation (Observed)

Authenticated as SUPER_ADMIN via `/api/auth/login` using seeded credentials shown on the admin login screen.

Verification was executed by starting the backend in a PowerShell job, running live requests, then stopping the job (to avoid intermittent process shutdown during checks).

- Health:
  - `GET /api/health` → `200 { ok: true, status: "healthy" }`
- Auth:
  - `POST /api/auth/login` → 200 OK, sets `calcu_admin` cookie
  - `GET /api/auth/check` → 200 OK, returns user
- Analytics:
  - `GET /api/analytics/dashboard` → 200 OK after shim alignment
- CMS:
  - `POST /api/cms/seed` → 200 OK (seeds defaults)
  - `GET /api/cms/tools` → 200 OK (4 tool cards returned)
  - `GET /api/cms/features` → 200 OK (4 features returned)
  - `GET /api/cms/faqs?category=global` → 200 OK
- Blog:
  - `GET /api/content/blog` → 200 OK (SQL-based pagination + count)
  - `GET /api/content/blog/:slug` → 200 OK (SQL join + view increment)
- Admin:
  - `GET /api/admin/ai-integrations` → 200 OK
  - `GET /api/admin/maintenance` → 200 OK

## Remaining Notes / Recommendations

- `POST /api/cms/seed` is not currently idempotent: calling it multiple times can create duplicate FAQ rows. If you want repeatable seeding, consider adding unique constraints (schema) or changing the seed logic to upsert / clear existing seeded rows.
- The Puppeteer run logs show a benign warning: “unsupported MIME type ('text/html')” from a non-critical script request; worth checking Vite/static paths if you want a perfectly clean console.

---
Generated by GPT-5.2 (GitHub Copilot)