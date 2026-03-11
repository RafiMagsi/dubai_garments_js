# Architecture Overview

This repository is aligned to the target stack:

Customer Storefront (Next.js)  
-> Backend API (FastAPI)  
-> PostgreSQL  
-> Redis Queue  
-> RQ Workers  
-> OpenAI API  
-> n8n Automation  
-> Integrations (Email / Slack / Telegram / Storage)

## Layer Mapping

1. Customer Storefront (`Next.js`)
- Path: `apps/storefront-dubai_garments`
- Public storefront pages: `app/page.tsx`, `app/products`, `app/quote`
- Internal admin pages: `app/admin/*`
- BFF routes (proxy/admin APIs): `app/api/*`

2. Backend API (`FastAPI`)
- Path: `services/fastapi_quote_api/app`
- Routers: `app/api/routers/*`
- Core infra: `app/core/*`
- Domain services: `app/services/*`
- Schemas: `app/schemas/*`

3. Database (`PostgreSQL`)
- SQL migrations (source of truth): `apps/storefront-dubai_garments/database/migrations`
- Schema docs: `apps/storefront-dubai_garments/database/schema.sql`, `database/schema.dbml`

4. Queue (`Redis`)
- Queue connection and enqueue APIs: `services/fastapi_quote_api/app/core/queue.py`
- Uses `REDIS_URL`

5. Workers (`RQ`)
- Worker entrypoint: `services/fastapi_quote_api/worker.py`
- Jobs: `app/workers/lead_ai.py`, `app/workers/quote_pdf.py`
- Docker services:
  - `worker_lead_ai` (queue: `lead_ai`)
  - `worker_quote_pdf` (queue: `quote_pdf`)

6. AI Service (`OpenAI API`)
- Dedicated microservice: `services/ai_openai_service`
- FastAPI orchestration service: `services/fastapi_quote_api/app/services/lead_ai.py`
- Queue-triggered after lead creation, with fallback processing

7. Automation (`n8n workflows`)
- Workflows: `automation/n8n/workflows/*`
- FastAPI scheduler/followup endpoints consumed by n8n

8. Integrations
- Email providers: `app/services/email.py` (`smtp`, `resend`, `sendgrid`, `log`)
- Slack notifications: `app/services/slack.py`
- Telegram notifications: `app/services/telegram.py`
- Storage (local/S3/R2): `app/services/storage.py`

## Quality Notes

Current structure is strong and modular, especially on FastAPI (`routers/services/schemas/core`) and Next.js feature modules.

To make this “store-ready” at enterprise quality:

1. Keep all runtime config in `system_settings` for production (`CONFIG_MODE=auto`).
2. Keep workers independently scalable by queue (already done in compose).
3. Add observability baseline:
   - request IDs
   - structured logs in storefront API routes
   - metrics endpoint (Prometheus style) for FastAPI
4. Add CI gates:
   - lint + typecheck + unit tests
   - migration safety checks
5. Add backup/restore runbook for Postgres and object storage.

## Observability Layer

1. Request IDs
- Storefront middleware injects `X-Request-ID`: `apps/storefront-dubai_garments/middleware.ts`
- FastAPI middleware propagates/generates request IDs: `app/core/observability.py`

2. Structured Logs
- Storefront API JSON logs: `lib/observability/logger.ts`
- FastAPI JSON logs + worker lifecycle logs: `app/core/observability.py`, `worker.py`, `app/workers/*`

3. Metrics Endpoints
- Storefront BFF: `GET /api/metrics` (Prometheus text)
- FastAPI: `GET /metrics` (Prometheus text)
