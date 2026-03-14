# Phase 4 Backlog - Agentic AI Core

## Objective
Controlled agentic execution with policy gates and auditability.

## Tickets
1. `AI-P4-001` `ai` `L` Build AI orchestration layer (intent -> tool selection -> policy check -> execution).
2. `AI-P4-002` `ai` `M` Add capability registry (lead scoring, proposal drafting, follow-up planning, reply classification).
3. `BE-P4-003` `backend` `M` Implement approval gates for high-impact actions.
4. `DB-P4-004` `db` `M` Add `ai_logs` schema (input/output/model/latency/confidence/reviewer).
5. `FE-P4-005` `frontend` `M` Build AI run trace UI with decision and outcome fields.
6. `AI-P4-006` `ai` `M` Add safety policies (PII masking, max token, banned action categories).
7. `AUT-P4-007` `automation` `S` Add automation hooks for AI action approval flow.
8. `BE-P4-008` `backend` `S` Add explainability payload in AI responses.
9. `OPS-P4-009` `ops` `S` Add AI incident runbook and rollback mode.
10. `AI-P4-010` `ai` `M` Add deterministic test fixtures for core AI tasks.

## Week-by-Week Execution Board (Daily Order)

## Week 1 - Core Orchestration and Logging Foundation
### Day 1
1. Define agent action taxonomy and high-risk action policy boundaries.
2. Start `AI-P4-001` orchestration skeleton (intent -> tool -> policy -> execution).
3. Draft request/response contracts for orchestrator calls.

### Day 2
1. Continue `AI-P4-001` with intent routing and tool resolution.
2. Add base execution context model (tenant, actor, trace ID, policy mode).
3. Start `DB-P4-004` schema design for `ai_logs`.

### Day 3
1. Complete `DB-P4-004` migration and indexes for run trace queries.
2. Wire orchestrator logging writes into `ai_logs`.
3. Validate log completeness for success/failure cases.

### Day 4
1. Implement `AI-P4-002` capability registry structure.
2. Register initial capabilities (lead scoring, proposal drafting, follow-up planning, reply classification).
3. Add capability metadata (risk level, required inputs, policy flags).

### Day 5
1. Week 1 integration pass: orchestration + capability registry + ai_logs.
2. Fix defects and freeze baseline contracts.
3. Publish short developer note for AI execution flow.

## Week 2 - Safety, Approvals, and Explainability
### Day 6
1. Implement `AI-P4-006` safety policy engine (PII masking, max token, banned actions).
2. Add policy violation outcome structure and audit logging.

### Day 7
1. Implement `BE-P4-003` approval gates for high-impact actions.
2. Define approval state machine (`pending`, `approved`, `rejected`, `expired`).

### Day 8
1. Implement `AUT-P4-007` automation hooks for approval workflow.
2. Add approve/reject event handling and callback wiring.
3. Validate idempotency for repeated approval callbacks.

### Day 9
1. Implement `BE-P4-008` explainability payload in AI responses.
2. Add “why this action” / confidence / policy decision fields.
3. Add contract tests for explainability payload presence.

### Day 10
1. End-to-end test pass for policy + approval + automation hooks.
2. Fix edge cases (timeout approvals, policy rejection fallback).
3. Freeze Week 2 baseline.

## Week 3 - Test Fixtures, UI Traceability, and Ops Readiness
### Day 11
1. Implement `AI-P4-010` deterministic fixtures for core AI tasks.
2. Add scenario coverage for happy path and policy-blocked path.

### Day 12
1. Build `FE-P4-005` AI run trace UI shell (decision/outcome timeline).
2. Add trace list view and drill-down interaction.

### Day 13
1. Complete `FE-P4-005` with payload/result/confidence/reviewer display.
2. Add action-level status badges and failure reason rendering.

### Day 14
1. Implement `OPS-P4-009` AI incident runbook and rollback mode.
2. Run incident drill: degraded model behavior + policy rollback.
3. Update runbook with observed remediation steps.

### Day 15
1. Final regression pass across orchestration, approvals, logs, and UI traces.
2. Collect sign-off evidence (fixtures, logs, approvals, runbook drill output).
3. Freeze Phase 4 and prepare Phase 5 handoff.

## Daily Definition of Done
1. Code merged for daily scope.
2. AI behavior evidence captured (fixtures/tests/logs/screens).
3. No open critical blocker carried without owner/date.

## Exit Criteria
- Agent actions are gated and logged
- Reviewer can approve/reject with traceability
- AI outputs have measurable quality metadata
