from __future__ import annotations

import json
import logging
import time
from contextvars import ContextVar
from uuid import uuid4

from fastapi import Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("uvicorn.error")
request_id_context: ContextVar[str] = ContextVar("request_id", default="-")

http_requests_total = Counter(
    "fastapi_http_requests_total",
    "Total HTTP requests processed by FastAPI.",
    ["method", "path", "status"],
)
http_request_duration_seconds = Histogram(
    "fastapi_http_request_duration_seconds",
    "HTTP request duration in seconds.",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10),
)

worker_jobs_total = Counter(
    "fastapi_worker_jobs_total",
    "Background worker jobs processed.",
    ["job_name", "status"],
)


def current_request_id() -> str:
    return request_id_context.get()


def log_event(event: str, **fields: object) -> None:
    payload = {
        "event": event,
        "request_id": current_request_id(),
        **fields,
    }
    logger.info(json.dumps(payload, default=str))


def metrics_response() -> Response:
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


class RequestObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        request_id = request.headers.get("x-request-id") or str(uuid4())
        token = request_id_context.set(request_id)
        path = request.url.path
        method = request.method.upper()
        started_at = time.perf_counter()

        log_event("http_request_start", method=method, path=path)
        status = 500
        try:
            response = await call_next(request)
            status = response.status_code
            response.headers["X-Request-ID"] = request_id
            return response
        finally:
            elapsed = time.perf_counter() - started_at
            http_requests_total.labels(method=method, path=path, status=str(status)).inc()
            http_request_duration_seconds.labels(method=method, path=path).observe(elapsed)
            log_event(
                "http_request_end",
                method=method,
                path=path,
                status=status,
                duration_ms=round(elapsed * 1000, 2),
            )
            request_id_context.reset(token)
