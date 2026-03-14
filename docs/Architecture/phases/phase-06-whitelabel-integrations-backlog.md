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

## Exit Criteria
- Tenant-specific branding applied dynamically
- Integrations are plug-and-play with health visibility
- API keys can be managed safely in UI
