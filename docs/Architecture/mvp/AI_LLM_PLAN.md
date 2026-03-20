# Live LLM Rollout Plan for AI Sales Agent

## Summary
Move AI Sales Agent from fallback-first to **LLM-first with safe fallback** by integrating live OpenAI calls into core runtime endpoints, keeping strict schema validation, auditability, and role safety.  
Goal: make daily CRM actions visibly model-driven while preserving deterministic reliability.

## Implementation Phases
P1. **Phase 1: Shared LLM Runtime Layer**
- Add a reusable `llm-runtime` service in `lib/ai-sales-agent` to:
  - resolve model config (`provider`, `model`, `fallbackEnabled`, `stylePreset`, temperature, tokens)
  - call OpenAI Responses API
  - standardize timeout/retry/error mapping
  - return normalized metadata (`provider`, `model`, `source`, `fallbackUsed`, `latencyMs`, `failureReason`)
- Reuse existing model settings + strict env checks logic so runtime and test panel use the same rules.

P2. **Phase 2: LLM-enable High-Impact Endpoints (first 3)**
- Selective deterministic rollout for cost/control:
  - **Model-first**: `/api/admin/ai-sales-agent/copilot` intent `draft_reply`, `/api/admin/ai-sales-agent/reply-studio`
  - **Deterministic-only (internal)**: `/api/admin/ai-sales-agent/copilot` intents `followups_today` + `at_risk_deals`, `/api/admin/ai-sales-agent/triage`
- Keep deterministic logic as fallback path for model-enabled flows.
- Preserve existing response contracts; only source behavior changes by feature policy.
- Bind saved model-config prompts to runtime calls for draft workflows.
- Upgrade path: triage/followups/at-risk can be LLM-enabled later by policy change after cost/quality validation.

P3. **Phase 3: LLM-enable Revenue/Operations Endpoints**
- Integrate live LLM into:
  - `/api/admin/ai-sales-agent/quote-recommendation`
  - `/api/admin/ai-sales-agent/quote-copilot`
  - `/api/admin/ai-sales-agent/pipeline-insights`
  - `smart-routing-sla` reasoning text generation (deterministic assignment rules enforced)
- Continue schema-first parsing + fallback on parse failure.
- Bind quote/pipeline runtime prompts from model config prompt templates to avoid prompt drift.

P4. **Phase 4: Observability + Safety Hardening**
- Add per-endpoint LLM telemetry in AI logs:
  - request id, feature, prompt version hash, provider/model, latency, token usage (if available), schema-valid flag, fallback reason
- Add feature flags (env/settings) for staged rollout:
  - `AI_RUNTIME_ENABLE_COPILOT`
  - `AI_RUNTIME_ENABLE_TRIAGE`
  - `AI_RUNTIME_ENABLE_REPLY_STUDIO`
  - etc.
- Add rate limiting/backpressure for model calls at API route layer.

P4 Status (implemented):
- Runtime now writes AI telemetry rows for each structured run path (model success, fallback success, and hard failures) with prompt hash and token usage when OpenAI returns usage.
- Model settings now persist and load staged rollout flags in DB-backed `system_settings`, with env overrides:
  - `AI_RUNTIME_ENABLE_COPILOT`
  - `AI_RUNTIME_ENABLE_TRIAGE`
  - `AI_RUNTIME_ENABLE_REPLY_STUDIO`
  - `AI_RUNTIME_ENABLE_QUOTE`
  - `AI_RUNTIME_ENABLE_PIPELINE`
  - `AI_RUNTIME_ENABLE_SMART_ROUTING_SLA`
  - `AI_RUNTIME_ENABLE_FASTAPI_LEAD_AI`
  - `AI_RUNTIME_ENABLE_FASTAPI_EMAIL_DRAFT`
- API routes now enforce in-memory per-user rate limiting and concurrency backpressure for LLM-heavy endpoints.

P5. **Phase 5: UX Transparency**
- In AI UI cards, surface:
  - “Model Used”, “Primary/Fallback”, “Latency”
  - schema status (“Validated output”)
- Keep this consistent across Copilot, Triage, Reply, Quote, Pipeline cards.

## Public/API/Type Changes
1. Extend contracts (if missing) to include runtime metadata uniformly:
- `provider`, `model`, `source`, `fallbackUsed`, `failureReason`, `processingMs`, `requestId`
2. Keep existing response shapes stable for UI compatibility.
3. Add optional telemetry fields in AI logs payload for model usage tracking.

## Test Plan
1. **Unit**
- schema parsing success/failure handling for each feature
- fallback behavior with `fallbackEnabled` ON/OFF
- strict key checks for primary/fallback provider
2. **Integration**
- each endpoint returns model path when OpenAI is configured
- deterministic fallback activates on upstream/parse failures
- role/permission behavior unchanged
3. **E2E (Playwright)**
- run key flows with seeded lead:
  - Copilot draft reply
  - Triage persistence
  - Reply Studio approve/send
  - Quote Copilot generation
- assert model metadata badges and non-empty structured outputs
4. **Operational**
- latency/error budget checks
- audit log entries verified for both model and fallback runs

## Assumptions / Defaults
1. OpenAI is the first external provider for runtime LLM calls.
2. Deterministic logic remains as mandatory fallback (no destructive behavior change).
3. Existing model settings panel is the control plane for runtime behavior (no duplicate config UI).
4. Rollout is staged: first 3 endpoints, then quote/pipeline stack.

## Missing Product Tracks (Additions)

### Track A: Full Lead-to-Close Process (End-to-End Execution)
Goal: move from feature-level tools to a single orchestrated sales lifecycle from intake to outcome.

P1. **Unified lifecycle state model**
- Standardize stages across lead/deal/quote into one canonical journey:
  - `lead_new -> triaged -> qualified -> reply_sent -> deal_open -> quote_ready -> quote_sent -> negotiation -> won/lost -> post_outcome`
- Map each stage to required evidence, blockers, and next action.

P2. **Lead-to-close orchestration service**
- Add orchestration endpoint/service that:
  - computes current lifecycle stage,
  - validates entry/exit criteria,
  - triggers AI actions and automation in sequence,
  - writes timeline and audit trail.
- Support manual override with reason capture.

P3. **Execution board UI**
- Add a dedicated “Lead-to-Close” board:
  - stage progression rail,
  - blocker reasons,
  - one-click “Run Next Move” actions,
  - evidence panel per stage.
- Keep parity with existing Agent Flow and remove duplicated concepts.

P4. **Outcome quality controls**
- Add stage SLAs (time-in-stage alerts).
- Add guardrails for stage transitions (no quote send if required fields missing).
- Add close-loop summary (what AI did, what human changed, result).

### Track B: Sales Agent Assignment Management + Agent Pipeline (Twenty-style)
Goal: give managers visibility/control over agent workload, assignment quality, and stage progress per agent.

P1. **Assignment policy engine**
- Add assignment modes:
  - round-robin,
  - weighted capacity,
  - skill/tag-based,
  - manual override.
- Add assignment rule config and fallback assignee.

P2. **Sales agent workload model**
- Track per-agent:
  - active leads,
  - active deals,
  - stage distribution,
  - overdue follow-ups,
  - SLA risk count,
  - conversion and response metrics.

P3. **Agent Pipeline view (manager board)**
- Build a dedicated pipeline UI (similar to Twenty workload visibility):
  - left: all agents with KPI chips,
  - center: assigned leads/deals by stage,
  - right: alerts and rebalance suggestions.
- Add filters: team, stage, urgency, inactive days, owner.

P4. **Assignment operations**
- One-click actions:
  - reassign lead/deal,
  - bulk rebalance by criteria,
  - auto-assign unowned records,
  - lock owner for strategic accounts.
- Every assignment change writes timeline/audit event.

## Additional APIs for These Tracks
1. `POST /api/admin/ai-sales-agent/lifecycle/evaluate`
2. `POST /api/admin/ai-sales-agent/lifecycle/advance`
3. `GET /api/admin/ai-sales-agent/agent-pipeline`
4. `POST /api/admin/ai-sales-agent/assignments/rebalance`
5. `PATCH /api/admin/ai-sales-agent/assignments/:entityId`

## Additional KPI Targets
1. Time-to-first-response by agent.
2. Stage aging by agent.
3. Assignment fairness index.
4. Conversion by owner and stage.
5. Reassignment rate and impact on win-rate.

## Positioning Note (Current vs Target)
P1. Current positioning:
- AI-enabled CRM with staged live LLM rollout in progress.
- Deterministic-first operations with partial LLM integration.

P2. Target positioning after this plan is implemented:
- AI-powered Sales CRM.
- With explainable, auditable, workflow-integrated end-to-end lead-to-close AI orchestration, including assignment intelligence and full-lifecycle automation.
