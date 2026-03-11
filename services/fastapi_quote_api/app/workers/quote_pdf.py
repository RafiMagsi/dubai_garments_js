from __future__ import annotations

from typing import Optional

from app.core.observability import log_event, worker_jobs_total
from app.core.tenant import reset_current_tenant_value, set_current_tenant_value
from app.services.quote_pdf import generate_quote_pdf_document


def run_quote_pdf_job(quote_id: str, tenant_value: Optional[str] = None) -> dict:
    token = set_current_tenant_value(tenant_value)
    log_event("worker_job_start", job_name="quote_pdf", quote_id=quote_id, tenant=tenant_value or "")
    try:
        result = generate_quote_pdf_document(quote_id)
        worker_jobs_total.labels(job_name="quote_pdf", status="success").inc()
        log_event("worker_job_success", job_name="quote_pdf", quote_id=quote_id, tenant=tenant_value or "")
        return result
    except Exception:
        worker_jobs_total.labels(job_name="quote_pdf", status="failed").inc()
        log_event("worker_job_failure", job_name="quote_pdf", quote_id=quote_id, tenant=tenant_value or "")
        raise
    finally:
        reset_current_tenant_value(token)
