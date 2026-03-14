# Phase 0 Backlog - Stabilization and Governance

## Objective
Deterministic deploy/build/auth/migrations baseline.

## Tickets
1. `OPS-P0-001` `ops` `L` Build deterministic deploy pipeline stages (sync, preflight, build, migrate, up, smoke).
2. `OPS-P0-002` `ops` `M` Add deployment health gate with timeout/no-output fail-fast.
3. `OPS-P0-003` `ops` `M` Harden env-doctor with strict required keys per service and actionable output.
4. `DB-P0-004` `db` `M` Make migrations idempotent for extensions/functions/triggers (`pgcrypto`, `set_updated_at`).
5. `DB-P0-005` `db` `M` Add migration verification script (`schema_migrations` + critical table checks).
6. `BE-P0-006` `backend` `M` Enforce admin auth second-layer checks in all admin layouts/routes.
7. `BE-P0-007` `backend` `S` Add tenant integrity check endpoint and startup guard.
8. `FE-P0-008` `frontend` `S` Add standardized error boundary + request failure UX for admin APIs.
9. `OPS-P0-009` `ops` `M` Add smoke test script: login, /api/health/db, /api/metrics, fastapi /metrics.
10. `OPS-P0-010` `ops` `S` Publish phase runbook updates and rollback steps.

## Exit Criteria
- Green deploy pipeline 3 consecutive runs
- Admin login/auth works reliably after fresh deploy
- Migrations and seed scripts run without manual patching
