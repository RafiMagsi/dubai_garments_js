# n8n Follow-up Automation (Step 14)

## Goal
Trigger automated quote follow-ups at:
- Day 2
- Day 5
- Day 10

## Files
- n8n workflow export:
  - `automation/n8n/workflows/quote-followup-workflow.json`
  - test workflow for inbound reply simulation:
    - `automation/n8n/workflows/sendgrid-inbound-test-workflow.json`

## FastAPI Endpoints Used
- Triggered by quote status update (`sent`) from FastAPI to n8n webhook URL:
  - `N8N_QUOTE_FOLLOWUP_WEBHOOK_URL`
- Called by n8n to dispatch each step:
  - `POST /api/v1/automation/followups/dispatch`
  - body: `{"quote_id":"<uuid>","step":"day_2|day_5|day_10"}`
  - header: `X-Automation-Token: <AUTOMATION_SHARED_SECRET>` (if configured)

## Environment Variables (FastAPI)
- `N8N_FOLLOWUP_ENABLED=true`
- `N8N_QUOTE_FOLLOWUP_WEBHOOK_URL=http://localhost:5678/webhook/quote-sent-followup`
- `N8N_REQUEST_TIMEOUT_SECONDS=10`
- `AUTOMATION_SHARED_SECRET=<your-shared-secret>`

## Environment Variables (n8n)
Set these in n8n:
- `FASTAPI_INTERNAL_URL=http://fastapi:8000` (docker) or `http://localhost:8000` (local)
- `AUTOMATION_SHARED_SECRET=<same-as-fastapi>`

## Setup Steps
1. Import workflow JSON into n8n.
2. Set workflow env vars in n8n.
3. Activate workflow.
4. Set FastAPI env vars above and restart FastAPI.
5. Move any quote to `sent` status in admin.
6. Verify:
   - `automation_runs` includes `n8n_quote_followup_trigger` and `quote_followup_dispatch`
   - `communications` receives day_2/day_5/day_10 outbound emails
   - `activities` receives `followup_triggered` and `email_sent`

## Notes
- Dispatch endpoint is idempotent per `quote_id + subject` to avoid duplicate sends.
- If n8n is down, quote status update still succeeds; trigger failure is logged in `automation_runs`.
