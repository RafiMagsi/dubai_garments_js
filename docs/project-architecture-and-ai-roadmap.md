# Project Architecture, Tooling, and AI Automation Roadmap

## 1. Executive Summary

This project is a multi-service AI sales automation platform built around:

1. Customer-facing storefront + quote capture
2. Internal sales/admin CRM workflows
3. FastAPI backend domain services
4. PostgreSQL as system of record
5. Redis + workers for asynchronous jobs
6. n8n for automation orchestration
7. Multi-channel notifications and integrations
8. AI service for extraction, scoring, and workflow intelligence

It is structured as a deployable product (Docker + CI/CD + server runbooks), not just a demo app.

## 2. Current Architecture

High-level runtime architecture:

1. `Next.js Storefront/Admin (apps/storefront-dubai_garments)`
2. `FastAPI Core API (services/fastapi_quote_api)`
3. `PostgreSQL`
4. `Redis`
5. `RQ Workers (lead_ai, quote_pdf)`
6. `Dedicated AI Service (services/ai_openai_service)`
7. `n8n workflows (automation/n8n/workflows)`
8. `Observability service (services/observability_service)`
9. `Integrations: email, Slack, Telegram, storage`

Data/control flow:

1. Customer submits quote intent in storefront
2. Lead/deal/quote data is persisted in PostgreSQL
3. Async tasks are queued in Redis
4. Workers process AI scoring and PDF generation
5. n8n handles follow-up automation and scheduler flows
6. Notifications are emitted to email/Slack/Telegram
7. Metrics and health are exposed via observability endpoints

## 3. Repository Structure (Functional)

Top-level modules:

1. `apps/storefront-dubai_garments`
2. `services/fastapi_quote_api`
3. `services/ai_openai_service`
4. `services/observability_service`
5. `automation/n8n/workflows`
6. `scripts` (deploy/setup/DB ops)
7. `docs` (runbooks/architecture)
8. `.github/workflows` (CI/CD deploy)

Within storefront app:

1. Public pages: home, products, product details, quote
2. Admin pages: dashboard, leads, deals, quotes, analytics, observability, configuration
3. API routes: admin/customer auth, proxy/BFF endpoints, install/reconfigure, observability proxy
4. Tenant/session/auth logic and runtime settings provider

Within FastAPI service:

1. Routers: leads, deals, quotes, webhooks, automation, admin config
2. Services: email, lead_ai, quote_pdf, storage, notifications
3. Queue/worker integration
4. Multi-tenant context and scoped data access
5. API schemas and config module

## 4. Tooling Coverage (What Is Already Used)

Frontend and BFF:

1. Next.js
2. React
3. React Query
4. Recharts

Backend and workers:

1. FastAPI
2. Python services layer
3. RQ worker pattern
4. Redis queue broker

Data and migrations:

1. PostgreSQL
2. SQL migration chain in `apps/.../database/migrations`
3. Prisma client usage in storefront-side services

Automation:

1. n8n workflow engine
2. Follow-up cadence workflows
3. Scheduler/cron workflows
4. Inbound webhook simulation workflows

Integrations:

1. SendGrid/Resend/SMTP adapters
2. Slack webhook notifications
3. Telegram bot notifications
4. Storage abstraction (`local` / S3 / R2-ready)

Operations and deployment:

1. Docker + Docker Compose
2. GitHub Actions SSH deploy
3. Server-mode scripts (systemd path)
4. Env validation (`env-doctor`)
5. Command runbooks and troubleshooting docs

Observability:

1. Request IDs
2. Structured service logs
3. Prometheus-style metrics endpoints
4. History sampling service

## 5. Architecture Quality Assessment

### Strengths

1. Strong domain separation between storefront, backend, workers, and automations
2. Explicit migration-based schema evolution
3. Multi-tenant foundation is already in place
4. Good deployment operability (scripts + docs + health checks)
5. AI is isolated as a dedicated service (clean future provider switch path)

### Current Gaps to Reach Marketplace/Enterprise Grade

1. No formal event bus abstraction (webhook fan-out exists but not a central event contract)
2. Limited evaluation loop for AI quality drift
3. Need stricter RBAC maturity and permission matrix enforcement audit
4. Need stronger install/reconfigure governance for production hardening
5. Need first-class integration/plugin SDK contracts for external adopters

## 6. AI + Automation Capability Matrix (Current vs Next)

Current implemented/partially implemented:

1. Lead extraction/scoring
2. Quote/PDF generation workflow
3. Follow-up automation via n8n
4. Reply detection + follow-up pause
5. Team notifications for important sales events

Recommended next AI layers:

1. Agentic sales assistant per deal
2. Multi-model routing (cost/latency/quality aware)
3. Prompt/version registry + A/B testing
4. AI output evaluation and feedback loop (human-in-the-loop)
5. Autonomous workflow policy guardrails

## 7. AI Market Direction (2026) and Alignment Strategy

To stay aligned with current AI product market direction, prioritize these patterns:

1. `Agentic workflows` over single-shot prompts
2. `Multi-model strategy` over single provider lock-in
3. `Eval + observability` as mandatory production AI layer
4. `Workflow-native AI` (inside CRM steps) rather than chatbot-only UX
5. `Human approval checkpoints` for high-impact actions (quote send, discount, contract)
6. `Data moat` through tenant-specific memory and feedback loops

Practical implication for this project:

1. Keep AI orchestration in service layer, not in UI components
2. Add AI policy engine (`allowed_action`, `requires_approval`, `auto_execute`)
3. Add model registry table + runtime selection by use case
4. Add AI run logs with latency/token/cost/success and reviewer feedback

## 8. Recommended Improvement Roadmap

### Phase A: Product Hardening (near-term)

1. Finish auth hardening and endpoint-level permission coverage
2. Add deterministic install completion checks + post-install smoke tests
3. Add centralized secrets sanity checks in admin configuration
4. Add backup/restore automation for PostgreSQL and uploaded files

### Phase B: AI Maturity

1. Introduce `ai_prompts` + versioning UI + rollback
2. Add `ai_logs` and `ai_feedback` tables with review workflow
3. Add model/provider abstraction with fallback and policy routing
4. Add confidence scores + escalation rules to sales rep queue

### Phase C: Automation and Integration Ecosystem

1. Build integration registry (metadata + health + credentials + scopes)
2. Add outbound webhook event dispatcher with retry/dead-letter semantics
3. Add import/export jobs with progress and audit trail
4. Add plugin SDK contract for third-party channels/CRMs

### Phase D: Commercial Readiness

1. White-label branding controls per tenant
2. Metering/usage reports per tenant (AI + automation + notifications)
3. Billing hooks (Stripe/Paddle) and plan-based feature flags
4. Security and compliance package (audit trails, retention controls, DPA-ready docs)

## 9. Suggested KPI Framework

Track these KPIs to validate AI/automation ROI:

1. Lead-to-qualified conversion rate
2. Quote acceptance rate
3. Median time-to-first-response
4. Follow-up completion rate
5. AI-assisted action adoption rate
6. AI correction rate (human overrides)
7. Cost per closed deal (with AI/automation attribution)

## 10. Target End-State Architecture

Recommended target architecture for scale:

1. `Presentation` — Next.js storefront/admin + embeddable widgets
2. `Core APIs` — FastAPI domain APIs + auth + tenant middleware
3. `Async Layer` — Redis/RQ (or Celery) with dedicated queue partitions
4. `AI Orchestration` — provider abstraction + prompts + eval + guardrails
5. `Automation` — n8n workflows + scheduler + webhook dispatcher
6. `Data` — PostgreSQL (OLTP) + analytics views/materializations
7. `Observability` — metrics, traces, logs, SLO dashboard, alerting
8. `Extensibility` — integration registry + plugin interface + event contracts

## 11. Immediate Next Actions (Highest Value)

1. Add central event dispatcher module (domain event -> webhook/integration fan-out)
2. Implement `ai_logs` + `ai_feedback` and connect admin review UI
3. Add model/provider selection table with failover policy
4. Add automation dead-letter + retry dashboard in admin
5. Add deployment smoke-test script to CI (health + auth + DB + tenant checks)

---

This document should be treated as the product architecture baseline for roadmap, investor/client demos, and engineering execution planning.
