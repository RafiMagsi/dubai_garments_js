# n8n Test Workflow: SendGrid Inbound Reply Simulation

## Purpose
Test customer reply detection without real SendGrid inbound traffic.

## Workflow File
- `automation/n8n/workflows/sendgrid-inbound-test-workflow.json`

## What It Does
- Uses `Manual Trigger`
- Sends two simulated inbound payloads to FastAPI:
  - One with quote number in subject (`Re: Q-...`)
  - One generic fallback payload without quote number

## Required n8n Environment Variables
- `FASTAPI_INTERNAL_URL`
  - Docker: `http://fastapi:8000`
  - Local: `http://localhost:8000`
- `SENDGRID_INBOUND_WEBHOOK_TOKEN`
  - Must match `SENDGRID_INBOUND_WEBHOOK_TOKEN` in FastAPI env
  - If FastAPI token is empty, header can be blank

## How To Run
1. Import workflow JSON in n8n.
2. Set env vars in n8n.
3. Open workflow and click `Execute workflow`.
4. Check FastAPI data:
   - `communications`: new `channel=email`, `direction=inbound` records
   - `activities`: `customer_replied`
   - `followups`: pending/in-progress items related to the context should be cancelled

## Expected API Response
Each HTTP node should receive:
- `ok: true`
- `communicationId`
- `pausedFollowups` (can be `0` if nothing pending)
