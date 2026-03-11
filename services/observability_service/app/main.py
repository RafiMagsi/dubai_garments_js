from __future__ import annotations

import json
import logging
import os
import time
from contextvars import ContextVar
from uuid import uuid4

import httpx
import psycopg
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Query, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Histogram, generate_latest
from redis import Redis
from starlette.middleware.base import BaseHTTPMiddleware

load_dotenv()

logger = logging.getLogger("uvicorn.error")
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")

FASTAPI_URL = os.getenv("FASTAPI_URL", "http://localhost:8000")
STOREFRONT_URL = os.getenv("STOREFRONT_URL", "http://localhost:3000")
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://localhost:8100")
DATABASE_URL = os.getenv("DATABASE_URL", "")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
OBSERVABILITY_SERVICE_TOKEN = os.getenv("OBSERVABILITY_SERVICE_TOKEN", "").strip()

http_requests_total = Counter(
    "observability_http_requests_total",
    "Total HTTP requests processed by observability service.",
    ["method", "path", "status"],
)
http_request_duration_seconds = Histogram(
    "observability_http_request_duration_seconds",
    "HTTP request duration in seconds.",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5),
)
dependency_checks_total = Counter(
    "observability_dependency_checks_total",
    "Dependency checks executed by target and status.",
    ["target", "status"],
)


def log_event(event: str, **fields: object) -> None:
    payload = {
        "event": event,
        "request_id": request_id_ctx.get(),
        **fields,
    }
    logger.info(json.dumps(payload, default=str))


class RequestObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        request_id = request.headers.get("x-request-id") or str(uuid4())
        token = request_id_ctx.set(request_id)
        started_at = time.perf_counter()
        path = request.url.path
        method = request.method.upper()
        status = 500
        log_event("http_request_start", method=method, path=path)
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
            request_id_ctx.reset(token)


app = FastAPI(title="Dubai Garments Observability Service", version="0.1.0")
app.add_middleware(RequestObservabilityMiddleware)


def _require_token(x_observability_token: str | None) -> None:
    if OBSERVABILITY_SERVICE_TOKEN and x_observability_token != OBSERVABILITY_SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized observability token.")


def _http_check(label: str, url: str) -> dict:
    started = time.perf_counter()
    try:
        response = httpx.get(url, timeout=8.0)
        ok = response.status_code < 400
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        dependency_checks_total.labels(target=label, status="ok" if ok else "failed").inc()
        return {
            "key": label,
            "kind": "http",
            "url": url,
            "ok": ok,
            "status": response.status_code,
            "durationMs": duration_ms,
            "detail": response.text[:500] if not ok else "",
        }
    except Exception as error:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        dependency_checks_total.labels(target=label, status="failed").inc()
        return {
            "key": label,
            "kind": "http",
            "url": url,
            "ok": False,
            "status": 0,
            "durationMs": duration_ms,
            "detail": str(error),
        }


def _redis_check() -> dict:
    started = time.perf_counter()
    try:
        redis_client = Redis.from_url(REDIS_URL)
        pong = redis_client.ping()
        ok = bool(pong)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        dependency_checks_total.labels(target="redis", status="ok" if ok else "failed").inc()
        return {
            "key": "redis",
            "kind": "redis",
            "url": REDIS_URL,
            "ok": ok,
            "status": 200 if ok else 503,
            "durationMs": duration_ms,
            "detail": "PONG" if ok else "No PONG",
        }
    except Exception as error:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        dependency_checks_total.labels(target="redis", status="failed").inc()
        return {
            "key": "redis",
            "kind": "redis",
            "url": REDIS_URL,
            "ok": False,
            "status": 0,
            "durationMs": duration_ms,
            "detail": str(error),
        }


def _postgres_check() -> dict:
    started = time.perf_counter()
    if not DATABASE_URL:
        return {
            "key": "postgres",
            "kind": "postgres",
            "url": "",
            "ok": False,
            "status": 0,
            "durationMs": 0,
            "detail": "DATABASE_URL is not configured.",
        }
    try:
        with psycopg.connect(DATABASE_URL) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        dependency_checks_total.labels(target="postgres", status="ok").inc()
        return {
            "key": "postgres",
            "kind": "postgres",
            "url": "postgresql://***",
            "ok": True,
            "status": 200,
            "durationMs": duration_ms,
            "detail": "SELECT 1 successful",
        }
    except Exception as error:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        dependency_checks_total.labels(target="postgres", status="failed").inc()
        return {
            "key": "postgres",
            "kind": "postgres",
            "url": "postgresql://***",
            "ok": False,
            "status": 0,
            "durationMs": duration_ms,
            "detail": str(error),
        }


def _targets() -> dict[str, str]:
    return {
        "fastapi_metrics": f"{FASTAPI_URL.rstrip('/')}/metrics",
        "storefront_metrics": f"{STOREFRONT_URL.rstrip('/')}/api/metrics",
        "ai_health": f"{AI_SERVICE_URL.rstrip('/')}/health",
        "fastapi_health": f"{FASTAPI_URL.rstrip('/')}/health",
        "storefront_health": f"{STOREFRONT_URL.rstrip('/')}/api/health/db",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "observability_service"}


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/api/v1/checks")
def checks(x_observability_token: str | None = Header(default=None)):
    _require_token(x_observability_token)

    target_map = _targets()
    items = [
        _http_check("fastapi_health", target_map["fastapi_health"]),
        _http_check("storefront_health", target_map["storefront_health"]),
        _http_check("ai_health", target_map["ai_health"]),
        _http_check("fastapi_metrics", target_map["fastapi_metrics"]),
        _http_check("storefront_metrics", target_map["storefront_metrics"]),
        _redis_check(),
        _postgres_check(),
    ]
    healthy = sum(1 for item in items if item["ok"])
    failed = len(items) - healthy
    log_event("dependency_checks_executed", healthy=healthy, failed=failed)

    return {
        "generatedAt": time.time(),
        "overallOk": failed == 0,
        "summary": {"healthy": healthy, "failed": failed, "total": len(items)},
        "items": items,
    }


@app.get("/api/v1/scrape")
def scrape(
    target: str = Query(...),
    x_observability_token: str | None = Header(default=None),
):
    _require_token(x_observability_token)
    target_map = _targets()
    if target not in target_map:
        raise HTTPException(status_code=404, detail=f"Unknown target: {target}")

    url = target_map[target]
    started = time.perf_counter()
    try:
        response = httpx.get(url, timeout=8.0)
        body = response.text
        ok = response.status_code < 400
        dependency_checks_total.labels(target=target, status="ok" if ok else "failed").inc()
        return {
            "ok": ok,
            "target": target,
            "url": url,
            "status": response.status_code,
            "durationMs": round((time.perf_counter() - started) * 1000, 2),
            "preview": body[:12000],
        }
    except Exception as error:
        dependency_checks_total.labels(target=target, status="failed").inc()
        return {
            "ok": False,
            "target": target,
            "url": url,
            "status": 0,
            "durationMs": round((time.perf_counter() - started) * 1000, 2),
            "preview": str(error),
        }
