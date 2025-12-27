# Calcu-Hub AI Coding Instructions

## Architecture (Big Picture)
- **Frontend**: React 18 SPA (Vite). Routing + a lot of logic lives in **`src/App.tsx`** (large file; avoid adding more there unless necessary).
- **Backend**: Express server in **`server/index.cjs`** (CommonJS).
- **Database**: SQLite via Prisma schema, but the runtime server uses a custom DB layer (see below).
- **Admin**: Keep admin panels **lazy-loaded/code-split**. Do not pull heavy deps into public routes/components.

## CRITICAL DB PATTERN (Do Not Break This)
- Prisma v7 ESM imports are incompatible with the server’s CJS context.
- **DO NOT** import `@prisma/client` anywhere inside `server/`.
- **DO** use the manual Prisma-like wrapper in **`server/db.cjs`** (e.g., `const { prisma } = require('./db.cjs')`).
- Scripts in **`scripts/`** (TS/ESM) **can** use the real `PrismaClient`.

## Admin Ops & Governance Conventions
- **Audit Logging**: Mutating admin actions should write audit entries (before/after + diff) via the audit module (e.g., `server/audit.cjs`).
  - Always mask sensitive keys (passwords, tokens, api keys, secrets) in logs/exports.
- **Soft Deletes**: Prefer `deletedAt` over hard deletes for admin-managed models.
- **Background Jobs**: Expensive work runs via the jobs/queue system (e.g., `server/jobs.cjs`) and must be non-blocking.
- **Request Tracking**: Preserve request correlation IDs (e.g., `server/requestId.cjs`) through logs/errors/audits.
- Existing monitoring endpoints may include `/api/system/audit-logs` and `/api/system/jobs`—extend consistently.

## Security & RBAC
- Session-based auth using cookies.
- RBAC is defined in **`server/rbac.cjs`**.
- Always protect admin routes with RBAC middleware (e.g., `requireRoles` / permission checks).
- New admin mutations must be auditable (tie to requestId + actor info) and must not leak secrets.

## Bilingual & RTL Requirements
- The app is bilingual (Arabic/English) and must support RTL layouts.
- Update translations in:
  - **`src/i18n/ar.json`**
  - **`src/i18n/en.json`**
- Use `useTranslation` and `useLocale` from **`src/i18n/index.ts`**.
- Validate UI in both locales (`locale === 'ar'` RTL).

## Performance Guardrails (Non-Negotiable)
- Do not impact public site performance:
  - Keep admin-only features behind admin routes and **lazy-load** panels.
  - Cache health/diagnostics summaries; put deep checks into background jobs.
  - Use timeouts/circuit-breakers for external calls (ads/analytics/ai).
- Prefer server-side pagination/search for admin tables; avoid client-side loading of large datasets.

## Workflows (Commands)
- **Start Dev**: `npm run dev:all` (client `5173`, server `4000`).
- **DB Schema/Migrations**: edit **`prisma/schema.prisma`** then `npx prisma migrate dev`.
- **Seed**: `npm run db:seed`.
- **Restart Server**: `npm run restart:server`.
- **Testing**: `npm run test:smoke`, `npm run test:headless`.

## Key Files / Directories
- `prisma/schema.prisma` — source of truth for models.
- `server/db.cjs` — custom DB wrapper (Prisma-like API).
- `server/index.cjs` — Express bootstrap + middleware registration.
- `server/rbac.cjs` — roles/permissions.
- `src/App.tsx` — main routing/entry (keep minimal additions).
- `src/lib/` — core calculation logic (payroll/EOS/dates).
