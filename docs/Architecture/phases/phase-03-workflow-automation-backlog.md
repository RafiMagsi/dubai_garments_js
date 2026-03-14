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

## Week-by-Week Execution Board (Daily Order)

## Week 1 - Event and Delivery Foundations
### Day 1
1. Define canonical event contract list for sales lifecycle.
2. Start `BE-P3-001` event dispatcher abstraction and interface design.
3. Define payload schema/versioning strategy.

### Day 2
1. Complete `BE-P3-001` dispatcher implementation with typed event registration.
2. Add integration tests for dispatch reliability.
3. Start `DB-P3-004` schema updates for audit/retention columns.

### Day 3
1. Implement `BE-P3-002` webhook subscription model and CRUD surface.
2. Add webhook signing implementation and signature verification spec.
3. Apply `DB-P3-004` indexes for webhook/event lookups.

### Day 4
1. Complete `BE-P3-002` signed delivery flow and delivery attempt persistence.
2. Implement `BE-P3-009` rate-limited outbound queue behavior.
3. Validate queue behavior under burst load.

### Day 5
1. Week 1 integration pass: event -> queue -> signed delivery -> audit trail.
2. Fix defects and freeze contract baselines.
3. Publish quick contract reference for frontend/automation.

## Week 2 - Retry, DLQ, and Operations Safety
### Day 6
1. Implement `AUT-P3-003` retry strategy and failure classification.
2. Add dead-letter queue storage and state transitions.

### Day 7
1. Complete `AUT-P3-003` replay and retry mechanics.
2. Add manual retry API hooks for admin UI operations.

### Day 8
1. Implement `OPS-P3-007` alerting hooks for repeated workflow failures.
2. Wire alert thresholds to DLQ/retry metrics.
3. Validate alert noise control and escalation logic.

### Day 9
1. Implement `AUT-P3-008` n8n template sync docs and versioned workflow manifests.
2. Add workflow manifest validation checks.

### Day 10
1. Implement `OPS-P3-010` runbook for replay/retry/manual compensation.
2. Run tabletop incident drill for failed automation scenario.
3. Fix runbook gaps found in drill.

## Week 3 - Admin UX and End-to-End Hardening
### Day 11
1. Build `FE-P3-005` workflow catalog UI (status, trigger, last run, failures).
2. Add retry action wiring from UI to backend endpoints.

### Day 12
1. Complete `FE-P3-005` filters/search/sort in workflow catalog.
2. Build `FE-P3-006` execution detail drawer skeleton.

### Day 13
1. Complete `FE-P3-006` timeline view (logs/payload/result/attempt history).
2. Add failure reason and remediation hints in UI.

### Day 14
1. End-to-end regression: event dispatch, webhook signing, retries, DLQ, UI visibility.
2. Validate observability coverage and alert triggers in real flow.
3. Fix critical defects.

### Day 15
1. Collect sign-off evidence (delivery logs, retry recovery, UI flows, alerts).
2. Freeze Phase 3 outputs and publish phase handoff note.
3. Prepare Phase 4 kickoff dependencies.

## Daily Definition of Done
1. Code merged for daily scope.
2. Event/automation evidence captured (logs or test report).
3. No open critical blocker carried without owner/date.

## Exit Criteria
- Failed jobs are visible and recoverable
- Event contracts exist for major sales lifecycle events
- Webhook deliveries are signed and auditable
