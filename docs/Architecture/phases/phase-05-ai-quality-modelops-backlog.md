# Phase 5 Backlog - AI Quality and ModelOps

## Objective
Continuously improve AI quality, reliability, and cost.

## Tickets
1. `AI-P5-001` `ai` `M` Build prompt registry with versioning and rollback.
2. `DB-P5-002` `db` `S` Add `ai_feedback` table with tenant/user/use-case links.
3. `FE-P5-003` `frontend` `M` Build prompt management and feedback UI.
4. `AI-P5-004` `ai` `M` Implement model routing strategy (default/fallback/use-case).
5. `BE-P5-005` `backend` `S` Expose AI KPI endpoints (acceptance, correction, latency, cost).
6. `FE-P5-006` `frontend` `S` Add AI quality dashboard cards/charts.
7. `OPS-P5-007` `ops` `S` Add spend guardrails and alert thresholds.
8. `AI-P5-008` `ai` `M` Add offline evaluation suite against labeled fixtures.
9. `AUT-P5-009` `automation` `S` Schedule nightly eval run + report summary.
10. `OPS-P5-010` `ops` `S` Document AI change-management policy.

## Exit Criteria
- Prompts are editable/versioned in product
- AI quality is measurable with trendline
- Model fallback is automatic and observable
