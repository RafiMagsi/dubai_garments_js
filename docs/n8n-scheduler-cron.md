# Scheduler / Cron System (Step 15)

## Purpose
Run scheduled tasks through n8n Cron triggers:
- Follow-up sweep
- Daily digest report
- Cold lead detection

## n8n Workflow
- Import:
  - `automation/n8n/workflows/scheduler-cron-workflow.json`

## FastAPI Scheduler Endpoints
- `POST /api/v1/automation/scheduler/followups/run`
- `POST /api/v1/automation/scheduler/digest/run`
- `POST /api/v1/automation/scheduler/cold-leads/run`

All endpoints support auth via:
- Header: `X-Automation-Token: <AUTOMATION_SHARED_SECRET>`

## FastAPI Env
- `AUTOMATION_SHARED_SECRET=<secret>`
- `COLD_LEAD_THRESHOLD_DAYS=10`
- `SCHEDULER_FOLLOWUP_BATCH_SIZE=100`
- `ADMIN_NOTIFICATION_EMAIL=<digest-recipient>`

## n8n Env
- `FASTAPI_INTERNAL_URL=http://fastapi:8000` (docker)
- `AUTOMATION_SHARED_SECRET=<same secret>`

## Task Behavior
- Follow-up sweep:
  - Processes due `followups` (`pending`, `channel=email`, `due_at <= now`)
  - Sends email, logs `communications`, marks follow-up `completed`
  - Creates `followup_triggered` and `email_sent` activities

- Digest report:
  - Calculates 24h metrics and pending queues
  - Sends digest email to `ADMIN_NOTIFICATION_EMAIL`

- Cold lead detection:
  - Detects leads idle for threshold days (`new|qualified|quoted`)
  - Creates re-engagement follow-up
  - Reduces lead score and logs activity

## Verification
1. Activate workflow in n8n.
2. Trigger nodes manually in n8n first.
3. Confirm `automation_runs` has:
   - `scheduler_followup_sweep`
   - `scheduler_digest_report`
   - `scheduler_cold_lead_detection`
4. Confirm `activities`, `communications`, and `followups` updates.
