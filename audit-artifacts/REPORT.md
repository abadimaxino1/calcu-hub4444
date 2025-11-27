# Audit Report (initial)

This report contains the initial automated changes applied during the MASTER QA & Hardening run.

Summary:
- Hardened server headers (CSP and HSTS fallback).
- Added `requireAnyRole` helper and admin-only analytics and run-tests endpoints (feature-flagged).
- Added `scripts/seed-users-new.cjs` to seed example users with roles.
- Added `docs/rbac.md` (RBAC matrix).

Files changed:
- `server/index.cjs` (headers, CSP, RBAC helpers, analytics/test endpoints).
- `scripts/seed-users-new.cjs` (new seed script).
- `docs/rbac.md` (new documentation file).

Next steps:
- Confirm `robots.txt` and `ads.txt` are present and correct.
- Gate any client-side test UIs and analytics calls behind admin checks.
- Add CSRF and 2FA flows for Admin (2FA not implemented by this pass).
- Run end-to-end tests and capture artifacts under `./audit-artifacts/`.

## Admin UI & exports (added)

- Added a minimal client-side Admin UI under `src/admin/` with `AdminShell`, `Login`, `AnalyticsPanel`, `UsersPanel`, and `TestsPanel`. The Admin UI is lazy-loaded and mounts on `/admin` and `/admin/login` routes in the SPA.
- Added server endpoints:
	- `GET /api/admin/analytics` (Admin/Analyst/Supervisor) — returns analytics JSON.
	- `GET /api/admin/exports/analytics.csv` (Admin/Analyst) — returns a CSV export of analytics.
	- `GET /api/admin/audit` (Admin/Supervisor/IT) — returns recent admin audit log entries.
- The in-app TestPanel (unit smoke tests) is now gated client-side and server-side — it only renders for authenticated admin sessions.

Commands to try the admin UI locally (PowerShell):

```powershell
# seed example users (overwrites server/admin-users.json)
node .\scripts\seed-users-new.cjs

# start server (in a separate shell)
node .\server\index.cjs

# start vite dev server
npm run dev

# open http://localhost:5173/admin/login and sign in with username 'abdullah' and the password from SEED_ADMIN_PW or the default in the seed script.
```


Commands to run locally:

```powershell
# seed users (will overwrite server/admin-users.json)
node ./scripts/seed-users-new.cjs

# start admin server (dev)
NODE_ENV=development node ./server/index.cjs

# to allow test runs from admin endpoints (if desired):
$env:ADMIN_ALLOW_RUN_TESTS='1'
node ./server/index.cjs
```

Notes:
- `run-tests` endpoint is disabled by default; enable with `ADMIN_ALLOW_RUN_TESTS=1`.
- Use strong passwords in production and store secrets in environment variables.

## Analytics & Consent gating (completed)

- Added `src/lib/analytics.ts` to dynamically load GA4 and AdSense scripts only after consent is detected in localStorage.
- Added `src/lib/consent-watcher.ts` which monkey-patches `localStorage.setItem` for consent keys (`calcu_consent`, `calcu_consent_v1`, `consent`) and triggers the in-page hook so same-window consent changes immediately load analytics.
- Updated `src/App.tsx` to attempt an initial analytics load if consent already exists and to expose `window.__calcuConsentChanged` for manual triggering.

How it works:

- Consent is expected to be stored in `localStorage` as JSON, e.g. `{ "analytics": true, "ads": false }` under one of the keys above.
- On app load, `App.tsx` will dynamically import `./lib/analytics` which will load GA/gtag or AdSense only when corresponding IDs are configured via environment variables (`VITE_GA_ID`, `VITE_ADSENSE`) and consent is present.
- When the consent banner writes to localStorage, `consent-watcher` calls the in-page hook and analytics scripts are loaded without page reload.

Testing locally:

```powershell
# start dev server
npm run dev

# in the browser console, simulate consent:
localStorage.setItem('calcu_consent', JSON.stringify({ analytics: true, ads: false }));

# the page should dynamically load gtag if VITE_GA_ID is set in your environment.
```

Notes / Next steps:

- Ensure `src/components/ConsentBanner.tsx` writes consent to one of the expected keys (it currently stores consent; if it does not use the exact key names, adjust `CONSENT_KEYS` in `consent-watcher.ts`).
- Verify no analytics or ad scripts are present in `index.html` or injected by server-side templates; all loading is now dynamic and client-side.


