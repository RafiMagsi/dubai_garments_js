# Phase 6 Backlog - White-label and Integrations Productization

## Objective
Make platform marketplace-ready and easy to integrate.

## Tickets
1. `DB-P6-001` `db` `M` Add tenant branding/settings schema for white-label controls.
2. `FE-P6-002` `frontend` `M` Build white-label branding editor (logo/colors/fonts/theme presets).
3. `BE-P6-003` `backend` `M` Build integration registry API (provider config, status, scopes, health).
4. `AUT-P6-004` `automation` `S` Implement standardized integration handler interface.
5. `BE-P6-005` `backend` `M` Add API key management APIs (create/revoke/rotate).
6. `DB-P6-006` `db` `S` Add hashed API key storage and usage log tables.
7. `FE-P6-007` `frontend` `M` Build integration center UI (email/slack/telegram/webhooks/storage).
8. `OPS-P6-008` `ops` `S` Add integration health checks and status endpoint.
9. `BE-P6-009` `backend` `S` Add webhook signing secret rotation support.
10. `FE-P6-010` `frontend` `S` Add onboarding checklist for integrations readiness.

## Week-by-Week Execution Board (Daily Order)

## Week 1 - Data and API Foundations
### Day 1
1. Define white-label and integration domain boundaries.
2. Start `DB-P6-001` tenant branding/settings schema design.
3. Define configuration precedence (tenant override vs defaults).

### Day 2
1. Complete `DB-P6-001` migration and indexes.
2. Start `BE-P6-003` integration registry API contracts.
3. Define provider state model (`configured`, `healthy`, `degraded`, `disabled`).

### Day 3
1. Continue `BE-P6-003` provider config/status/health endpoints.
2. Implement `AUT-P6-004` integration handler interface and adapter contract.
3. Add basic adapter validation tests.

### Day 4
1. Implement `BE-P6-005` API key management APIs (create/revoke/rotate).
2. Implement `DB-P6-006` hashed key storage + usage logs.
3. Add API key scope and expiry support.

### Day 5
1. Implement `BE-P6-009` webhook signing secret rotation support.
2. Week 1 integration pass: registry + handlers + API keys + secret rotation.
3. Freeze backend/data baseline contracts.

## Week 2 - Admin UX for Branding and Integrations
### Day 6
1. Build `FE-P6-002` white-label editor shell (logo/colors/fonts/theme presets).
2. Add preview panel and save/publish state model.

### Day 7
1. Complete `FE-P6-002` dynamic application of tenant branding in admin/storefront shell.
2. Validate persistence and fallback behavior.

### Day 8
1. Build `FE-P6-007` integration center core UI (provider list, status, config forms).
2. Wire UI to `BE-P6-003` registry endpoints.

### Day 9
1. Complete `FE-P6-007` health/status display and provider-specific action flows.
2. Add usage and last-checked metadata rendering.

### Day 10
1. Implement `FE-P6-010` onboarding checklist for integration readiness.
2. Connect checklist status to registry health and required config completeness.
3. Week 2 regression pass.

## Week 3 - Health, Hardening, and Productization Finish
### Day 11
1. Implement `OPS-P6-008` integration health checks and status endpoint.
2. Add periodic check scheduling and stale-status handling.

### Day 12
1. Add alerts/escalation for degraded integration health.
2. Run failure simulations for email/slack/webhook providers.

### Day 13
1. End-to-end test pass for API keys (creation, usage logging, rotation, revocation).
2. Validate webhook signing and rotated-secret verification in live flow.

### Day 14
1. UX polish pass for branding and integration center.
2. Add operator docs for common setup and troubleshooting paths.
3. Fix critical defects.

### Day 15
1. Final sign-off regression: branding, integrations, health, API keys, onboarding checklist.
2. Capture evidence (screenshots, API logs, health checks, key rotation tests).
3. Freeze Phase 6 and prepare Phase 7 handoff.

## Daily Definition of Done
1. Code merged for daily scope.
2. Integration/branding evidence captured (screenshots, API tests, logs).
3. No open critical blocker carried without owner/date.

## Exit Criteria
- Tenant-specific branding applied dynamically
- Integrations are plug-and-play with health visibility
- API keys can be managed safely in UI
