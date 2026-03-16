from __future__ import annotations

from app.core.observability import log_event, worker_jobs_total
from app.services.lead_ai import process_lead_with_ai


def run_lead_ai_job(lead_id: str) -> dict:
    log_event("worker_job_start", job_name="lead_ai", lead_id=lead_id)
    try:
        result = process_lead_with_ai(lead_id)
        worker_jobs_total.labels(job_name="lead_ai", status="success").inc()
        log_event("worker_job_success", job_name="lead_ai", lead_id=lead_id)
        return result
    except Exception:
        worker_jobs_total.labels(job_name="lead_ai", status="failed").inc()
        log_event("worker_job_failure", job_name="lead_ai", lead_id=lead_id)
        raise
