# Twenty-Inspired Agentic CRM Implementation Plan (Full-Project Optimized)

## Goal
Build a premium, multi-tenant, AI-first, automation-native CRM in this repo using Twenty-inspired UX and product patterns, while staying clean-room (no direct code copy).

## Scope Principle
Use Twenty as reference for:
1. UX patterns and information architecture
2. Product primitives (objects, fields, views, roles, workflows)
3. Admin/workspace operability

Do not copy source files directly. Re-implement in this stack:
1. Next.js storefront/admin
2. FastAPI domain APIs
3. PostgreSQL + Redis + workers + n8n

## Product Direction
Baseline CRM quality:
1. Excellent leads/deals/quotes/contact usability
2. Fast pipeline operations and activity visibility
3. Workspace-level customization and governance

Differentiators:
1. Agentic AI actions with policy and approval controls
2. Automation control plane with retries, DLQ, and audit
3. Integration-first and white-label marketplace package

## Missing Areas Identified from Twenty-Inspired Full Scope
1. View engine depth: saved views, filters, sort, group-by, table and kanban parity
2. Object model depth: configurable objects/fields, relation fields, layouts
3. Workspace experience: global search, command palette, user settings, personalization
4. Communication layer: email/calendar/event timeline integration model
5. Admin governance: robust permissions model and policy-driven role matrix
6. Product ecosystem: plugin contracts, docs quality, and demo/readiness assets

## Phase Structure (Revised)

## Phase 0: Platform Stabilization and Security Baseline (1 sprint)
Objective: deterministic deploy/runtime/auth/migrations before expansion.

Tasks:
1. Lock env/runtime conventions and env doctor checks
2. Stabilize deploy pipeline with fail-fast/no-output timeout and smoke tests
3. Enforce auth guardrails and tenant resolver consistency
4. Ensure migration idempotency (`pgcrypto`, `set_updated_at`, trigger safety)
5. Add observability baseline (/metrics, /health, logs, request IDs)

Deliverables:
1. Reproducible deploy and rollback path
2. No login/migration regressions

## Phase 1: Multi-Tenant + RBAC Core Hardening (1 sprint)
Objective: tenant-safe and permission-safe foundation.

Tasks:
1. Verify tenant scoping across all core queries/routes
2. Extend RLS coverage where safe (`users`, `system_settings`, key tenant tables)
3. Enforce tenant-aware session model and server-side guards
4. Complete role/permission enforcement on admin actions
5. Add tenant/permission integrity test suite

Deliverables:
1. Strong tenant isolation
2. Role-gated operations foundation

## Phase 2: CRM UX Shell + Workspace Experience (1-2 sprints)
Objective: Twenty-grade admin shell and productivity UX.

Tasks:
1. Standardize shell (header/nav/global search/quick actions)
2. Add command palette and keyboard shortcut framework
3. Normalize list/detail interactions and entity pages
4. Build shared components (`EntityListView`, `EntityDetailPanel`, `ActivityTimeline`, `PipelineBoard`)
5. Roll out design tokens, motion system, and responsive behavior

Deliverables:
1. Consistent high-quality CRM UX
2. Reusable UI primitives for feature scale

## Phase 3: Object Model + View Engine (1-2 sprints)
Objective: flexible object/field system and advanced views parity.

Tasks:
1. Implement object/field builder (custom fields + relation fields)
2. Add record layout configuration (sections/cards/field visibility)
3. Build view engine: filters, sort, group-by, saved views, kanban/table modes
4. Add per-user and per-tenant view preferences
5. Add import/export and data quality (dedupe/validation)

Deliverables:
1. CRM data model extensibility comparable to modern CRM tools
2. High-adoption daily workflow UX (saved views and boards)

## Phase 4: Workflow and Automation Control Plane (1 sprint)
Objective: automation that is visible, safe, and recoverable.

Tasks:
1. Implement event dispatcher abstraction and event contracts
2. Add workflow catalog + execution history UI
3. Add retry/dead-letter strategy and replay tooling
4. Add outbound webhook subscriptions with signing and retries
5. Add automation failure alerts/runbooks

Deliverables:
1. Enterprise-grade automation operations
2. Auditable workflow lifecycle

## Phase 5: Communication Hub (Email/Calendar/Files/Timeline) (1-2 sprints)
Objective: central timeline and communication parity.

Tasks:
1. Add unified activity timeline model (emails, notes, status changes, files)
2. Add email templates + send/reply classification pipeline
3. Add calendar event model and timeline integration
4. Add file/document management with storage adapters
5. Add communication analytics primitives

Deliverables:
1. Full engagement history per lead/deal/contact
2. Better context for AI and sales reps

## Phase 6: Agentic AI Core (2 sprints)
Objective: controlled agent behavior, not ad-hoc AI helpers.

Tasks:
1. Add AI orchestration layer (intent -> tool selection -> policy -> action)
2. Implement capability registry (scoring, drafting, follow-up planning, reply classification)
3. Add approval gates for high-impact actions
4. Persist full AI trace (`ai_logs`: input/output/model/latency/confidence/reviewer)
5. Add safety policies and guardrails (PII, cost, action limits)

Deliverables:
1. Controlled agentic execution model
2. Audit-ready AI action trail

## Phase 7: AI Quality and ModelOps (1 sprint)
Objective: improve AI quality, reliability, and cost over time.

Tasks:
1. Prompt registry with versioning and rollback
2. Model/provider routing with fallback policy
3. Feedback loop and correction capture (`ai_feedback`)
4. Evaluation pipeline and quality dashboard (acceptance/corrections/latency/cost)
5. AI spend guardrails and alert thresholds

Deliverables:
1. Managed AI lifecycle
2. Measurable AI quality improvements

## Phase 8: Productization - Install, Reconfigure, White-label, Integrations (1-2 sprints)
Objective: maximize buyer adoption and ease of deployment.

Tasks:
1. Harden install wizard + one-time lock and reconfigure mode
2. Complete white-label controls per tenant (logo/colors/theme/domain)
3. Build integration center with health/status (email/slack/telegram/webhooks/storage)
4. Add API key management and usage audit
5. Add plugin/integration contracts for extensibility

Deliverables:
1. Marketplace-grade plug-and-play package
2. Lower support burden for non-technical operators

## Phase 9: Analytics and Forecasting (1 sprint)
Objective: decision-grade visibility for sales leadership.

Tasks:
1. Build KPI aggregates (conversion, velocity, win rate, pipeline value)
2. Add forecast and risk scoring panels
3. Add rep/automation performance views
4. Add optional AI weekly executive summary
5. Add analytics export + scheduled reports

Deliverables:
1. Executive analytics layer
2. Better forecast confidence and coaching insights

## Phase 10: Enterprise Hardening + Release Governance (ongoing)
Objective: operational trust, maintainability, and scale readiness.

Tasks:
1. Define SLO/SLI and incident runbooks
2. Add backup/restore drills and recovery targets
3. Finalize audit retention, secrets policy, and security headers/rate limiting
4. Add release train policy (feature flags, canary, rollback)
5. Expand automated regression coverage for core revenue flows

Deliverables:
1. Enterprise-ready reliability posture
2. Sustainable release operations

## Cross-Phase Non-Negotiables
1. Tenant isolation and permission checks cannot regress
2. Every phase ships with tests + runbook updates
3. Every risky feature requires observability and rollback path
4. API contracts stay versioned and documented
5. UI primitives remain reusable (no page-specific hardcoding)

## Definition of Done per Phase
1. Architecture note and scope freeze
2. DB migration and backfill plan (if needed)
3. API contract updates + examples
4. UI implementation with reusable components
5. Test coverage for happy path + failure path
6. Ops/runbook updates + smoke verification
7. Demo script and sample tenant data updated

## Suggested Execution Order
1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8
10. Phase 9
11. Phase 10

## Practical Timeline (You + Codex)
1. Fast-track scope: 5 to 6 months
2. Balanced market-grade scope: 6.5 to 8.5 months
3. Enterprise-polish scope: 9 to 11 months

## Mapping Note (Twenty-Inspired Coverage)
This plan now explicitly covers the main inspiration areas highlighted in Twenty-style CRM products:
1. Personalized layouts and views (filters/sort/group/kanban/table)
2. Custom objects and fields
3. Custom roles and permissions
4. Workflow triggers/actions
5. Emails/calendar/files in unified timeline
