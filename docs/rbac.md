# RBAC Matrix (project)

Role | Areas | Permissions
---|---|---
Admin | All | Full access; manage roles; view/run tests; full analytics + exports
Supervisor | Staff under scope | View/manage tasks of assigned staff; read analytics slices for their scope
IT | Admin system, tests, logs | Manage infra, view/run tests, deploys, health checks
Analyst | Analytics | View dashboards, build queries, export CSV/JSON
Designer | UI & Content | Edit themes, pages, FAQ, SEO metadata (no access to tests/roles)
Staff | Assigned tools only | Limited page/content edits per assignment

# Enforcement
- Server exposes `requireRole(role)` and `requireAnyRole([roles])` middleware in `server/index.cjs`.
- Seed scripts available under `scripts/seed-users-new.cjs` to create example users.
