# FastAPI Quote API

Minimal backend service for quote requests.

## Endpoints

- `GET /health`
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
cp .env.example .env
set -a && source .env && set +a
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Notes

- Records are inserted into the `leads` table.
- Uploaded files are stored in `uploads/` by default.
- LeadAIService runs automatically when a lead is created and extracts `product`, `quantity`, `urgency`, and `complexity` using the OpenAI API.
- Lead AI failures do not block lead creation; they are recorded in `automation_runs`.
- Deal stages: `new`, `qualified`, `quoted`, `negotiation`, `won`, `lost`.
- Automation: stage changes to `quoted` or `negotiation` auto-create follow-ups and `automation_runs` records.
- Activity log is append-only and system-generated. It is not manually created from the admin UI.
- Activity log event types: `lead_created`, `ai_processed_lead`, `quote_generated`, `email_sent`, `followup_triggered`, `customer_replied`, plus lead and deal update events.
