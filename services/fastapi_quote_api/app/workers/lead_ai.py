from __future__ import annotations

from typing import Optional

from app.core.observability import log_event, worker_jobs_total
from app.core.tenant import reset_current_tenant_value, set_current_tenant_value
from app.services.lead_ai import process_lead_with_ai


def run_lead_ai_job(lead_id: str, tenant_value: Optional[str] = None) -> dict:
    token = set_current_tenant_value(tenant_value)
    log_event("worker_job_start", job_name="lead_ai", lead_id=lead_id, tenant=tenant_value or "")
    try:
        result = process_lead_with_ai(lead_id)
        worker_jobs_total.labels(job_name="lead_ai", status="success").inc()
        log_event("worker_job_success", job_name="lead_ai", lead_id=lead_id, tenant=tenant_value or "")
        return result
    except Exception:
        worker_jobs_total.labels(job_name="lead_ai", status="failed").inc()
        log_event("worker_job_failure", job_name="lead_ai", lead_id=lead_id, tenant=tenant_value or "")
        raise
    finally:
        reset_current_tenant_value(token)
