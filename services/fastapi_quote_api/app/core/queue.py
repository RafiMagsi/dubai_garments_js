from __future__ import annotations

import json
import logging
from typing import Optional

from redis import Redis
from rq import Queue, Retry

from app.core.config import (
    DEFAULT_TENANT_SLUG,
    LEAD_AI_JOB_TIMEOUT,
    LEAD_AI_QUEUE_NAME,
    LEAD_AI_RETRY_MAX,
    QUOTE_PDF_JOB_TIMEOUT,
    QUOTE_PDF_QUEUE_NAME,
    QUOTE_PDF_RETRY_MAX,
    REDIS_URL,
)
from app.core.tenant import current_tenant_value

logger = logging.getLogger("uvicorn.error")


def get_redis_connection() -> Redis:
    return Redis.from_url(REDIS_URL)


def get_lead_ai_queue() -> Queue:
    return Queue(
        LEAD_AI_QUEUE_NAME,
        connection=get_redis_connection(),
        default_timeout=LEAD_AI_JOB_TIMEOUT,
    )


def enqueue_lead_ai_job(lead_id: str, tenant_value: Optional[str] = None) -> Optional[str]:
    try:
        resolved_tenant = (tenant_value or current_tenant_value() or DEFAULT_TENANT_SLUG).strip() or DEFAULT_TENANT_SLUG
        queue = get_lead_ai_queue()
        job = queue.enqueue(
            "app.workers.lead_ai.run_lead_ai_job",
            lead_id,
            resolved_tenant,
            retry=Retry(max=LEAD_AI_RETRY_MAX, interval=[10, 30, 90]),
            job_timeout=LEAD_AI_JOB_TIMEOUT,
        )
        logger.info(
            json.dumps(
                {
                    "event": "lead_ai_enqueued",
                    "lead_id": lead_id,
                    "tenant": resolved_tenant,
                    "queue": LEAD_AI_QUEUE_NAME,
                    "job_id": job.id,
                }
            )
        )
        return job.id
    except Exception as error:
        logger.error(
            json.dumps(
                {
                    "event": "lead_ai_enqueue_failed",
                    "lead_id": lead_id,
                    "tenant": tenant_value or "",
                    "queue": LEAD_AI_QUEUE_NAME,
                    "error": str(error),
                }
            )
        )
        return None


def get_quote_pdf_queue() -> Queue:
    return Queue(
        QUOTE_PDF_QUEUE_NAME,
        connection=get_redis_connection(),
        default_timeout=QUOTE_PDF_JOB_TIMEOUT,
    )


def enqueue_quote_pdf_job(quote_id: str, tenant_value: Optional[str] = None) -> Optional[str]:
    try:
        resolved_tenant = (tenant_value or current_tenant_value() or DEFAULT_TENANT_SLUG).strip() or DEFAULT_TENANT_SLUG
        queue = get_quote_pdf_queue()
        job = queue.enqueue(
            "app.workers.quote_pdf.run_quote_pdf_job",
            quote_id,
            resolved_tenant,
            retry=Retry(max=QUOTE_PDF_RETRY_MAX, interval=[15, 45]),
            job_timeout=QUOTE_PDF_JOB_TIMEOUT,
        )
        logger.info(
            json.dumps(
                {
                    "event": "quote_pdf_enqueued",
                    "quote_id": quote_id,
                    "tenant": resolved_tenant,
                    "queue": QUOTE_PDF_QUEUE_NAME,
                    "job_id": job.id,
                }
            )
        )
        return job.id
    except Exception as error:
        logger.error(
            json.dumps(
                {
                    "event": "quote_pdf_enqueue_failed",
                    "quote_id": quote_id,
                    "tenant": tenant_value or "",
                    "queue": QUOTE_PDF_QUEUE_NAME,
                    "error": str(error),
                }
            )
        )
        return None
