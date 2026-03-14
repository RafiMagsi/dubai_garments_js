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

## Week-by-Week Execution Board (Daily Order)

## Week 1 - Deployment and Environment Determinism
### Day 1
1. Finalize deployment stage contract (`sync -> preflight -> build -> migrate -> up -> smoke`).
2. Implement `OPS-P0-001` script flow and normalize logging format.
3. Define hard stop behavior on any stage failure.

### Day 2
1. Implement `OPS-P0-002` no-output timeout and health gate checks.
2. Add CI/deploy status markers per stage (`START`, `PASS`, `FAIL`).
3. Run first end-to-end dry run on local/staging.

### Day 3
1. Implement `OPS-P0-003` strict env-doctor checks by service.
2. Add clear missing-key and placeholder-value diagnostics.
3. Ensure env-doctor runs before build/migrate stages.

### Day 4
1. Stabilize and integrate all week-1 ops scripts into pipeline.
2. Add quick rollback command path for failed stage.
3. Execute 2 full deploy rehearsal runs.

### Day 5
1. Fix defects from rehearsals.
2. Freeze Week 1 outputs and tag scripts as baseline.
3. Publish short internal note: deterministic deploy flow accepted.

## Week 2 - DB, Auth, and Tenant Safety
### Day 6
1. Implement `DB-P0-004` migration idempotency for extension/function/trigger edge cases.
2. Test rerun safety of migrations on non-empty DB.

### Day 7
1. Implement `DB-P0-005` migration verification script.
2. Validate critical tables/functions and `schema_migrations` consistency.
3. Add verification script to deploy flow post-migrate.

### Day 8
1. Implement `BE-P0-006` admin second-layer auth checks across admin routes/layouts.
2. Ensure login route remains accessible while protected areas require valid session.

### Day 9
1. Implement `BE-P0-007` tenant integrity endpoint and startup guard.
2. Add startup fail-fast when tenant bootstrap invariants are invalid.

### Day 10
1. Run regression pass on auth + tenant + migration behavior.
2. Fix all critical regressions before Week 3.
3. Record pass/fail matrix for protected endpoints.

## Week 3 - UX Safety, Smoke Tests, and Runbooks
### Day 11
1. Implement `FE-P0-008` admin API failure UX and error boundaries.
2. Standardize error messaging for auth/tenant/dependency failures.

### Day 12
1. Implement `OPS-P0-009` smoke test suite.
2. Include checks for login, `/api/health/db`, `/api/metrics`, and FastAPI `/metrics`.
3. Attach smoke tests as required post-deploy stage.

### Day 13
1. Run 3 consecutive full pipeline executions using real deployment path.
2. Verify all smoke tests pass each run.

### Day 14
1. Implement `OPS-P0-010` runbook updates.
2. Document rollback, common failures, and incident first-response commands.

### Day 15
1. Final hardening pass and defect cleanup.
2. Freeze Phase 0 baseline and sign-off report.
3. Mark Phase 0 complete and unlock Phase 1 kickoff.

## Daily Definition of Done
1. Code merged for day scope.
2. Command/test evidence captured.
3. No open critical blocker carried without owner and due date.

## Exit Criteria
- Green deploy pipeline 3 consecutive runs
- Admin login/auth works reliably after fresh deploy
- Migrations and seed scripts run without manual patching
