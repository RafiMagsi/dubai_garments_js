from __future__ import annotations

from app.core.observability import log_event, worker_jobs_total
from app.services.quote_pdf import generate_quote_pdf_document


def run_quote_pdf_job(quote_id: str) -> dict:
    log_event("worker_job_start", job_name="quote_pdf", quote_id=quote_id)
    try:
        result = generate_quote_pdf_document(quote_id)
        worker_jobs_total.labels(job_name="quote_pdf", status="success").inc()
        log_event("worker_job_success", job_name="quote_pdf", quote_id=quote_id)
        return result
    except Exception:
        worker_jobs_total.labels(job_name="quote_pdf", status="failed").inc()
        log_event("worker_job_failure", job_name="quote_pdf", quote_id=quote_id)
        raise
