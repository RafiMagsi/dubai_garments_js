# Phase 2 Backlog - Data and Entity System Upgrade

## Objective
Flexible tenant-aware entity model with custom fields and data portability.

## Tickets
1. `DB-P2-001` `db` `L` Create `custom_fields` and `custom_field_values` schema with tenant/entity scoping.
2. `BE-P2-002` `backend` `L` Add custom field CRUD APIs with validation and type enforcement.
3. `FE-P2-003` `frontend` `M` Build custom field builder UI in admin settings.
4. `DB-P2-004` `db` `M` Add generic notes/attachments linkage tables and indexes.
5. `BE-P2-005` `backend` `M` Add import pipeline (CSV parse, validation, staging, commit).
6. `AUT-P2-006` `automation` `M` Run import processing as background job with status tracking.
7. `FE-P2-007` `frontend` `M` Add import/export UX and progress indicators.
8. `BE-P2-008` `backend` `M` Implement lead deduplication policy (email/phone/company fuzzy strategy).
9. `DB-P2-009` `db` `S` Add uniqueness and search indexes supporting dedupe.
10. `OPS-P2-010` `ops` `S` Create data migration/backfill playbook for existing tenants.

## Week-by-Week Execution Board (Daily Order)

## Week 1 - Schema and API Foundations
### Day 1
1. Finalize data-model scope for custom fields and dynamic values.
2. Start `DB-P2-001` base schema migration (tables, keys, tenant/entity scoping).
3. Define allowed field types and constraints matrix.

### Day 2
1. Complete `DB-P2-001` with indexes and integrity constraints.
2. Add migration validation on existing tenant data.
3. Draft API contract spec for custom field CRUD.

### Day 3
1. Start `BE-P2-002` CRUD endpoints (create/list/update/delete) for custom field definitions.
2. Implement type validation layer for field config and value payloads.
3. Add tenant scoping checks to all routes.

### Day 4
1. Complete `BE-P2-002` value write/read logic with strict type enforcement.
2. Add request/response examples and error cases.
3. Begin integration tests for custom field API.

### Day 5
1. Run schema + API integration pass and fix blockers.
2. Freeze Week 1 baseline (DB+API contracts).
3. Record compatibility notes for existing entities.

## Week 2 - Notes/Attachments + Import/Export Pipeline
### Day 6
1. Implement `DB-P2-004` notes/attachments linkage tables and required indexes.
2. Add tenant/entity integrity constraints.

### Day 7
1. Start `BE-P2-005` import pipeline (CSV parse + validation + staging model).
2. Define import error report structure.

### Day 8
1. Complete `BE-P2-005` commit flow with transactional safety.
2. Implement `AUT-P2-006` background import execution and status updates.
3. Add retry strategy for recoverable import failures.

### Day 9
1. Implement `FE-P2-007` import/export UI and progress indicators.
2. Connect UI to import status polling and result summaries.

### Day 10
1. Complete `FE-P2-003` custom field builder UI in admin settings.
2. Integrate custom field builder with backend CRUD and validation errors.
3. Regression pass on Week 2 features.

## Week 3 - Dedupe, Indexing, Backfill, and Hardening
### Day 11
1. Implement `BE-P2-008` lead deduplication strategy (email/phone/company fuzzy logic).
2. Add dedupe confidence result and merge recommendation structure.

### Day 12
1. Implement `DB-P2-009` uniqueness/search indexes for dedupe-critical paths.
2. Run query performance checks on lead create/search flows.

### Day 13
1. Integrate dedupe checks into lead creation and import commit flow.
2. Add conflict handling UX hooks and API outcomes.

### Day 14
1. Create `OPS-P2-010` data migration/backfill playbook for existing tenants.
2. Document rollback and recovery path for data migration failures.

### Day 15
1. Final end-to-end regression: custom fields + import/export + dedupe.
2. Capture sign-off evidence (API tests, migration checks, data quality checks).
3. Freeze Phase 2 and handoff to Phase 3.

## Daily Definition of Done
1. Code merged for daily scope.
2. Data/API test evidence captured.
3. No open critical blocker carried without owner/date.

## Exit Criteria
- Tenant can define custom fields without code change
- Import/export stable for core entities
- Dedupe prevents common duplicate creation paths
