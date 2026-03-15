# AI Sales Agent - Development Plan (Week-by-Week Execution Board)

## Objective
Build a visible AI-first and automation-first sales layer that is demo-ready for client showcases and practical for pilot usage.

Primary outcomes:
1. AI is visible in daily workflow, not hidden in backend calls
2. Lead-to-close journey is shown as an AI-assisted flow
3. Automation performs real work with approval/audit controls
4. Product is strong enough for freelance portfolio demos

## Module Scope
1. Global AI Copilot
2. Lead Intelligence + Lead Triage Agent
3. Agent Flow (Lead to Close Visual Journey)
4. Reply Studio
5. Quote Copilot
6. Pipeline Insights
7. Automation Runs + Execution Transparency
8. Model and Prompt Settings
9. Next-Best-Action Dashboard
10. AI Impact and Value Dashboard
11. Smart Routing and SLA Automation
12. Automation Template Library

## Delivery Tickets
1. `AIA-001` `frontend` `M` Add admin sidebar entry and main shell page: `AI Sales Agent`.
2. `AIA-002` `frontend` `M` Add AI Sales Agent tabs (Lead Intelligence, Reply Studio, Quote Copilot, Pipeline Insights, Agent Flow, Automation Runs, Model Settings).
3. `AIA-003` `backend` `M` Create `POST /api/admin/copilot/query` with typed response contract.
4. `AIA-004` `backend` `M` Create `POST /api/admin/copilot/execute` with RBAC action whitelist.
5. `AIA-005` `db` `M` Add `ai_logs` enrichment fields for action type, confidence, fallback, and latency.
6. `AIA-006` `backend` `M` Implement Lead Triage Agent pipeline (summary, intent, urgency, complexity, score, next action).
7. `AIA-007` `frontend` `M` Build Lead Intelligence card stack in lead detail and AI Agent page.
8. `AIA-008` `frontend` `M` Build Agent Flow component (stages, status, blockers, pending actions).
9. `AIA-009` `frontend` `M` Build Reply Studio (draft, rewrite tone, follow-up draft, clarification questions).
10. `AIA-010` `backend` `M` Add quote recommendation endpoint for Quote Copilot.
11. `AIA-011` `frontend` `M` Build Quote Copilot panel with product/variant/quantity recommendations.
12. `AIA-012` `backend` `M` Build Pipeline Insights endpoint (stalled deals, risk, next-best-action).
13. `AIA-013` `frontend` `M` Build Pipeline Insights cards and action queue.
14. `AIA-014` `backend` `S` Add automation run event detail API (input/output summary + failures).
15. `AIA-015` `frontend` `S` Add Automation Runs timeline UI and rerun action.
16. `AIA-016` `backend` `S` Add prompt/model config API with safe validation.
17. `AIA-017` `frontend` `S` Add Model and Prompt Settings UI with test panel.
18. `AIA-018` `ops` `S` Add demo seed preset for AI-heavy walkthrough.
19. `AIA-019` `ops` `S` Add showcase script and sign-off checklist for freelance demos.
20. `AIA-020` `qa` `S` Final regression pass (AI response quality, fallback behavior, role safety, automation reliability).
21. `AIA-021` `frontend` `M` Add Next-Best-Action cards on dashboard with confidence, reasons, and execute actions.
22. `AIA-022` `backend` `M` Build Smart Routing + SLA service (auto-assign, untouched lead SLA reroute).
23. `AIA-023` `backend` `S` Add automation template registry (new lead, quote reminder, stale deal, reactivation).
24. `AIA-024` `frontend` `S` Add AI Impact KPI board (time saved, suggestions accepted, risk alerts resolved).
25. `AIA-025` `backend` `S` Extend Quote Copilot with margin safety, discount guidance, and pricing risk hints.

## Week-by-Week Execution Board (Daily Order)

## Week 1 - Surface and Copilot Foundation
### Day 1
1. Implement `AIA-001` sidebar route and page skeleton.
2. Implement `AIA-002` tab shell and base layout placeholders.
3. Add route-level admin guards and nav visibility checks.

### Day 2
1. Implement `AIA-003` copilot query endpoint contract.
2. Define typed JSON schema for intents (`followups_today`, `draft_reply`, `at_risk_deals`).
3. Add fallback deterministic response path when model output fails schema validation.

### Day 3
1. Implement `AIA-004` copilot execute endpoint with RBAC whitelist.
2. Add audit write path into `ai_logs` for all copilot actions.
3. Add action simulation mode (`dry_run=true`) for safe demos.

### Day 4
1. Build copilot UI input in admin header (global visibility).
2. Add intent suggestion chips and structured action card rendering.
3. Connect query/execute APIs and display action outcomes.

### Day 5
1. Hardening pass for copilot UX states (loading/error/empty/success).
2. Validate tenant scoping on all copilot queries.
3. Freeze Week 1 baseline.

## Week 2 - Lead Intelligence and Triage Agent
### Day 6
1. Implement `AIA-006` lead triage orchestration service.
2. Add extraction fields: summary, intent, urgency, complexity, quantity, confidence.
3. Add score/classification outputs and next-best-action output.

### Day 7
1. Persist triage result in DB (`AIA-005` data additions).
2. Wire triage trigger for new lead intake and manual retrigger action.
3. Add fallback provider behavior and failure reason logging.

### Day 8
1. Build `AIA-007` Lead Intelligence cards in lead detail page.
2. Mirror same cards in AI Sales Agent > Lead Intelligence tab.
3. Add "last analyzed" and provider/fallback badges.

### Day 9
1. Add action buttons from intelligence cards (draft reply, convert, prioritize).
2. Ensure each action writes timeline/audit events.
3. Add confidence and reason visibility for explainability.

### Day 10
1. Regression test lead intake to intelligence rendering flow.
2. Validate role behavior (`admin`, `sales_manager`, `sales_rep`, `ops`).
3. Freeze Week 2 output.

## Week 3 - Agent Flow (Signature Feature)
### Day 11
1. Implement `AIA-008` stage model for lead-to-close flow.
2. Define 11-stage canonical flow and completion rules.
3. Map flow states from existing lead/deal/quote/automation data.

### Day 12
1. Build Agent Flow timeline/stepper UI with status coloring.
2. Show completed, active, pending, blocked states.
3. Add blockers and recommended next move panel.

### Day 13
1. Add AI action markers and automation action markers in flow.
2. Add human intervention checkpoints and pending approvals.
3. Show confidence trend and risk hints in flow sidebar.

### Day 14
1. Embed Agent Flow in lead detail view.
2. Add Agent Flow tab in AI Sales Agent page.
3. Add deep links from flow steps to related detail actions.

### Day 15
1. Full UX polish for flow readability and compactness.
2. Add empty/error/loading states for all flow sub-panels.
3. Freeze Week 3 output.

## Week 4 - Reply Studio and Quote Copilot
### Day 16
1. Implement `AIA-009` reply studio service and UI actions.
2. Add first reply draft, follow-up draft, clarification questions.
3. Add rewrite tones (concise, formal, persuasive).

### Day 17
1. Connect reply studio with lead/deal/quote contexts.
2. Add "approve and send" flow with audit events.
3. Add manual edit + regenerate controls.

### Day 18
1. Implement `AIA-010` quote recommendation endpoint.
2. Build quote recommendation payload with product/quantity/variant suggestions.
3. Add missing-data detection logic before quote creation.

### Day 19
1. Build `AIA-011` Quote Copilot UI panel.
2. Add recommendation acceptance actions and quote summary generation.
3. Add upsell/cross-sell suggestion block.

### Day 20
1. End-to-end check: lead -> reply studio -> quote copilot path.
2. Tune latency and fallback messaging for user trust.
3. Implement `AIA-025` quote intelligence checks (margin safety + discount guidance).
4. Freeze Week 4 output.

## Week 5 - Pipeline Insights and Automation Transparency
### Day 21
1. Implement `AIA-012` pipeline insight service (stalled, risk, next action).
2. Define risk score reasons and urgency queues.
3. Add stage-aging and inactivity heuristics.

### Day 22
1. Build `AIA-013` pipeline insight cards in AI Sales Agent and dashboard.
2. Add one-click actions (follow-up draft, assign owner, move stage suggestion).
3. Track execution results in audit logs.
4. Implement `AIA-021` Next-Best-Action dashboard cards.

### Day 23
1. Implement `AIA-014` automation run detail API.
2. Include workflow input/output summary and failure metadata.
3. Add permission checks and pagination.
4. Implement `AIA-022` Smart Routing + SLA automation service.

### Day 24
1. Build `AIA-015` automation runs timeline UI.
2. Add rerun action with guardrails.
3. Add failure drilldown and remediation hints.
4. Implement `AIA-023` automation template library backend.

### Day 25
1. Validate operational reliability on AI and automation views.
2. Fix inconsistencies across tabs and details.
3. Add automation template quick-enable controls in UI.
4. Freeze Week 5 output.

## Week 6 - Model Settings, Demo Packaging, and Release Readiness
### Day 26
1. Implement `AIA-016` prompt/model config APIs.
2. Add validation and safe defaults.
3. Add strict env checks for model/provider keys.

### Day 27
1. Build `AIA-017` Model and Prompt Settings UI.
2. Add test prompt panel and structured output preview.
3. Add fallback toggles and temperature/style presets.

### Day 28
1. Implement `AIA-018` demo seed presets.
2. Build one-command setup for AI-heavy demo data.
3. Verify deterministic setup flow.
4. Implement `AIA-024` AI impact KPI board.

### Day 29
1. Implement `AIA-019` showcase walkthrough script.
2. Add checklist for portfolio demo run.
3. Capture baseline screenshots and expected talking points.

### Day 30
1. Execute `AIA-020` final QA and regression suite.
2. Fix critical defects and finalize release notes.
3. Freeze AI Sales Agent module as demo-ready.

## Weekly Deliverables Summary
1. Week 1: Visible AI page and global copilot foundation.
2. Week 2: Working lead triage intelligence.
3. Week 3: Signature lead-to-close AI flow.
4. Week 4: Reply Studio + Quote Copilot.
5. Week 5: Pipeline insights + automation transparency + routing/SLA + templates.
6. Week 6: Model settings + AI impact board + demo packaging + release hardening.

## Definition of Done (Daily)
1. Day-scope code merged.
2. API/UI behavior manually validated.
3. Logs/audit events confirmed for AI actions.
4. No critical blocker left unassigned.

## Exit Criteria
1. AI Sales Agent page fully operational with all tabs.
2. Global copilot can answer and execute at least 3 intents.
3. Lead triage + agent flow visible in lead detail and AI hub.
4. Reply Studio and Quote Copilot are usable in real lead/deal workflows.
5. Pipeline insights and automation runs are transparent and actionable.
6. Model/prompt settings exist with safe fallback behavior.
7. Next-Best-Action dashboard and AI impact KPIs are visible and demoable.
8. Smart routing/SLA and template automations are running with audit visibility.
9. Demo walkthrough runs cleanly end-to-end in under 7 minutes.
