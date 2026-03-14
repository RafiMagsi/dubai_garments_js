# Phase 8 Backlog - Enterprise Hardening

## Objective
Security, reliability, compliance and enterprise operational readiness.

## Tickets
1. `DB-P8-001` `db` `M` Complete RBAC schema and permission mapping hardening.
2. `BE-P8-002` `backend` `M` Enforce endpoint-level permission middleware for all domains.
3. `FE-P8-003` `frontend` `S` Add role-aware UI action guards and hidden controls.
4. `OPS-P8-004` `ops` `M` Define backup/restore automation and disaster recovery drills.
5. `OPS-P8-005` `ops` `M` Add SLO/SLI and alerting baseline (API latency, worker failures, queue depth).
6. `OPS-P8-006` `ops` `S` Implement immutable audit retention policy and archival.
7. `BE-P8-007` `backend` `S` Add security headers + rate limit strategy review.
8. `AI-P8-008` `ai` `S` Add policy compliance checks for AI actions (tenant/legal rules).
9. `AUT-P8-009` `automation` `S` Add idempotency keys for external side-effect workflows.
10. `OPS-P8-010` `ops` `S` Finalize SOC-style operational runbooks and support playbook.

## Exit Criteria
- RBAC and audit controls pass security review
- Backup/restore drill passes with documented RTO/RPO
- Alerting and runbooks cover critical failure modes
