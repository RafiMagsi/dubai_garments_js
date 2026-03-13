# FastAPI Quote API

Minimal backend service for quote requests.

## Endpoints

- `GET /health`
- `GET /metrics`
- `POST /api/v1/quote-requests`
- `GET /api/v1/leads`
- `GET /api/v1/leads/{lead_id}`
- `POST /api/v1/leads`
- `PATCH /api/v1/leads/{lead_id}`
- `PATCH /api/v1/leads/{lead_id}/status`
- `GET /api/v1/deals`
- `POST /api/v1/deals`
- `POST /api/v1/leads/{lead_id}/convert-to-deal`
- `POST /api/v1/deals/{deal_id}/stage`
- `GET /api/v1/pipeline`
- `GET /api/v1/activities`
- `GET /api/v1/activities/{activity_id}`
- `GET /api/v1/automation-runs`
- `GET /api/v1/automation-runs/{run_id}`
- `POST /api/v1/automation-runs/{run_id}/retry`
- `POST /api/v1/emails/send`
- `POST /api/v1/automation/followups/dispatch`
- `POST /api/v1/automation/scheduler/followups/run`
- `POST /api/v1/automation/scheduler/digest/run`
- `POST /api/v1/automation/scheduler/cold-leads/run`
- `POST /api/v1/webhooks/sendgrid/inbound`
- `POST /api/v1/admin/config/demo-data/seed`
- `POST /api/v1/quotes/{quote_id}/generate-pdf`
- `GET /api/v1/quotes/{quote_id}/pdf`
- `GET /api/v1/quotes/{quote_id}/pdf/download`

## Multi-tenant foundation

- Migration: `0015_multi_tenant_foundation`
- Adds `tenants` table and `tenant_id` to core tables.
- FastAPI resolves tenant context from:
  - `X-Tenant-ID` (UUID) or
  - `X-Tenant-Slug` (slug), fallback `DEFAULT_TENANT_SLUG`.
- Row-level security (RLS) is enabled on sales operational tables:
  - `customers`, `leads`, `deals`, `quotes`, `quote_items`,
  - `communications`, `activities`, `automation_runs`, `followups`, `quote_documents`.
- Middleware sets per-request tenant context and DB connection sets `app.tenant_id`.
- Queue workers carry tenant context per job for `lead_ai` and `quote_pdf`.

## Slack integration

Set these in `services/fastapi_quote_api/.env`:

- `SLACK_ENABLED=true`
- `SLACK_WEBHOOK_URL=...` (recommended), or `SLACK_BOT_TOKEN=...` + `SLACK_CHANNEL=...`

Events that send Slack notifications:

- New HOT lead detected (LeadAIService result)
- Quote accepted (`/api/v1/quotes/{quote_id}/status` -> `approved`)
- Customer replied (`/api/v1/webhooks/sendgrid/inbound`)
- Automation run failed (`finish_automation_run(..., status='failed')`) and quote PDF generation failures

## Telegram integration

Set these in `services/fastapi_quote_api/.env`:

- `TELEGRAM_ENABLED=true`
- `TELEGRAM_BOT_TOKEN=...`
- `TELEGRAM_CHAT_ID=...`
- `TELEGRAM_PARSE_MODE=Markdown` (optional)

Events that send Telegram notifications:

- New HOT lead detected (LeadAIService result)
- Quote accepted (`/api/v1/quotes/{quote_id}/status` -> `approved`)
- Customer replied (`/api/v1/webhooks/sendgrid/inbound`)
- Automation run failed (`finish_automation_run(..., status='failed')`) and quote PDF generation failures

## Request fields (`multipart/form-data`)

- `name`
- `email`
- `company`
- `product`
- `quantity`
- `delivery_date` (optional, `YYYY-MM-DD`)
- `message` (optional)
- `file_upload` (optional)

## Local run

```bash
cd services/fastapi_quote_api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.test .env
set -a && source .env && set +a
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Config mode

Use `CONFIG_MODE=auto` (recommended):

- Non-production: reads from local `.env`
- Production (`NODE_ENV=production` or `APP_ENV=production`): reads from DB-backed `system_settings` (scope `fastapi`, fallback `global`)

Override explicitly if needed:

- `CONFIG_MODE=env`
- `CONFIG_MODE=db`

## Observability

- Request IDs:
  - FastAPI accepts `X-Request-ID` and returns it on response headers.
  - If missing, FastAPI generates one.
- Structured logs:
  - JSON log events for request lifecycle, AI processing, and worker jobs.
- Metrics endpoint:
  - `GET /metrics` (Prometheus format)

## Redis worker

Lead AI processing is queued through Redis/RQ.

Start Redis, then run:

```bash
cd services/fastapi_quote_api
source .venv/bin/activate
python worker.py
```

Worker listens to:
- `lead_ai`
- `quote_pdf`

Run a dedicated worker per queue (recommended in production):

```bash
source .venv/bin/activate
WORKER_QUEUES=lead_ai python worker.py
WORKER_QUEUES=quote_pdf python worker.py
```

## Separate AI service (OpenAI)

You can run OpenAI calls through dedicated service:

- `services/ai_openai_service`
- Endpoint used by FastAPI: `POST /api/v1/lead-ai/analyze`

FastAPI config:

- `AI_SERVICE_ENABLED=true`
- `AI_SERVICE_URL=http://localhost:8100` (or Docker internal URL)
- `AI_SERVICE_AUTH_TOKEN=...` (optional shared token)

## Demo Data Seeder

Generate realistic demo records for:
- leads
- deals
- quotes (with quote_items)

Run from `services/fastapi_quote_api`:

```bash
source .venv/bin/activate
python scripts/seed_demo_data.py --leads 40 --deals 28 --quotes 22
```

Optional override:

```bash
python scripts/seed_demo_data.py --database-url "postgresql://user:pass@localhost:5432/dbname"
```

## Notes

- Records are inserted into the `leads` table.
- Uploaded files are stored in `uploads/` by default.
- LeadAIService runs automatically via Redis worker when a lead is created and extracts `product`, `quantity`, `urgency`, and `complexity`, plus `ai_score`, `classification`, and reasoning.
- Lead AI failures do not block lead creation; they are recorded in `automation_runs`.
- LeadAIService uses heuristic system fallback when OpenAI is disabled, missing, or fails.
- Deal stages: `new`, `qualified`, `quoted`, `negotiation`, `won`, `lost`.
- Automation: stage changes to `quoted` or `negotiation` auto-create follow-ups and `automation_runs` records.
- Quote PDF generation is asynchronous and runs via Redis queue worker.
- Storage supports `local` (default) and `s3`/`r2` via `STORAGE_PROVIDER`.
- Email service supports `log`, `smtp`, `resend`, `sendgrid` via `EMAIL_PROVIDER`.
- Automation emails:
  - New lead notification (to `ADMIN_NOTIFICATION_EMAIL`)
  - Follow-up emails on deal stage automation
  - Quote sent email when quote status changes to `sent`
- n8n follow-up automation:
  - Quote `sent` status triggers n8n webhook (`N8N_QUOTE_FOLLOWUP_WEBHOOK_URL`)
  - n8n should call `POST /api/v1/automation/followups/dispatch` on day_2/day_5/day_10
  - Secure this endpoint with `AUTOMATION_SHARED_SECRET` via `X-Automation-Token`
- Scheduler / Cron automation:
  - Run via n8n cron or any scheduler
  - Endpoints available for follow-up sweep, digest report, and cold lead detection
  - `AUTOMATION_SHARED_SECRET` protects scheduler endpoints
- Customer reply detection:
  - SendGrid inbound webhook posts to `/api/v1/webhooks/sendgrid/inbound`
  - Logs inbound communication (`direction=inbound`)
  - Creates `customer_replied` activity
  - Pauses pending follow-ups for related quote/deal/lead/customer
  - Sends internal sales/admin notification email
- Activity log is append-only and system-generated. It is not manually created from the admin UI.
- Activity log event types: `lead_created`, `ai_processed_lead`, `quote_generated`, `email_sent`, `followup_triggered`, `customer_replied`, plus lead and deal update events.
