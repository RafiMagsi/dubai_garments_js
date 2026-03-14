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

## Exit Criteria
- Agent actions are gated and logged
- Reviewer can approve/reject with traceability
- AI outputs have measurable quality metadata
