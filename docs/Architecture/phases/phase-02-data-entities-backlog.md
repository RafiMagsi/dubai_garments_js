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

## Exit Criteria
- Tenant can define custom fields without code change
- Import/export stable for core entities
- Dedupe prevents common duplicate creation paths
