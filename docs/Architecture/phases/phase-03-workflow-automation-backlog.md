# Phase 3 Backlog - Workflow and Automation Control Plane

## Objective
Make automation observable, controllable, and production-safe.

## Tickets
1. `BE-P3-001` `backend` `M` Build event dispatcher abstraction for system domain events.
2. `BE-P3-002` `backend` `M` Add webhook subscription model and signed delivery.
3. `AUT-P3-003` `automation` `M` Implement retry strategy and dead-letter queue for failed automation jobs.
4. `DB-P3-004` `db` `S` Add automation event/audit indexes and retention policy columns.
5. `FE-P3-005` `frontend` `M` Build workflow catalog UI (status, trigger, failure count, retry).
6. `FE-P3-006` `frontend` `M` Build execution detail drawer with logs/payload/result timeline.
7. `OPS-P3-007` `ops` `S` Add alerting hooks for repeated workflow failures.
8. `AUT-P3-008` `automation` `S` Add n8n template sync docs + versioned workflow manifests.
9. `BE-P3-009` `backend` `S` Add rate-limited outbound webhook delivery queue.
10. `OPS-P3-010` `ops` `S` Add runbook for replay/retry and manual compensation steps.

## Exit Criteria
- Failed jobs are visible and recoverable
- Event contracts exist for major sales lifecycle events
- Webhook deliveries are signed and auditable
