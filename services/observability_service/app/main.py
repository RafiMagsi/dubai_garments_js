from __future__ import annotations

import asyncio
import json
import logging
import os
import re
import time
from contextvars import ContextVar
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

import httpx
import psycopg
from psycopg.rows import dict_row
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
OBS_SAMPLE_INTERVAL_SECONDS = max(5, int(os.getenv("OBS_SAMPLE_INTERVAL_SECONDS", "10")))
OBS_HISTORY_RETENTION_DAYS = max(1, int(os.getenv("OBS_HISTORY_RETENTION_DAYS", "30")))

_METRIC_LINE_RE = re.compile(r"^([a-zA-Z_:][a-zA-Z0-9_:]*)(\{[^}]*\})?\s+(.+)$")
sample_state = {
    "last_time": None,
    "last_total_requests": None,
    "last_total_errors": None,
}

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


app = FastAPI(title="Dubai Garments Observability Service", version="0.2.0")


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


app.add_middleware(RequestObservabilityMiddleware)


def _require_token(x_observability_token: Optional[str]) -> None:
    if OBSERVABILITY_SERVICE_TOKEN and x_observability_token != OBSERVABILITY_SERVICE_TOKEN:
        raise HTTPException(status_code=401, detail="Unauthorized observability token.")


def _targets() -> dict[str, str]:
    return {
        "fastapi_metrics": f"{FASTAPI_URL.rstrip('/')}/metrics",
        "storefront_metrics": f"{STOREFRONT_URL.rstrip('/')}/api/metrics",
        "ai_health": f"{AI_SERVICE_URL.rstrip('/')}/health",
        "fastapi_health": f"{FASTAPI_URL.rstrip('/')}/health",
        "storefront_health": f"{STOREFRONT_URL.rstrip('/')}/api/health/db",
    }


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


def _collect_checks_payload() -> dict:
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


def _scrape_target_payload(target: str) -> dict:
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


def _parse_labels(raw: str) -> dict[str, str]:
    cleaned = raw.strip().strip("{").strip("}")
    if not cleaned:
        return {}
    output: dict[str, str] = {}
    for key, value in re.findall(r"([^=,\s]+)=\"((?:\\.|[^\"])*)\"", cleaned):
        output[key.strip()] = value.replace('\\"', '"')
    return output


def _parse_prometheus(text: str) -> list[dict]:
    rows: list[dict] = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        match = _METRIC_LINE_RE.match(stripped)
        if not match:
            continue
        try:
            value = float(match.group(3))
        except ValueError:
            continue
        rows.append(
            {
                "name": match.group(1),
                "labels": _parse_labels(match.group(2) or ""),
                "value": value,
            }
        )
    return rows


def _sum_metric(rows: list[dict], metric_name: str, label_filter=None) -> float:
    total = 0.0
    for row in rows:
        if row["name"] != metric_name:
            continue
        if label_filter and not label_filter(row["labels"]):
            continue
        total += float(row["value"])
    return total


def _status_code(labels: dict[str, str]) -> int:
    raw = labels.get("status") or labels.get("code") or ""
    try:
        return int(raw)
    except Exception:
        return 0


def _weighted_storefront_latency_ms(rows: list[dict]) -> float:
    latency_by_path: dict[str, float] = {}
    for row in rows:
        if row["name"] != "storefront_api_request_duration_ms_avg":
            continue
        path = row["labels"].get("path", "")
        latency_by_path[path] = float(row["value"])

    weighted_sum = 0.0
    total_count = 0.0
    for row in rows:
        if row["name"] != "storefront_api_requests_total":
            continue
        path = row["labels"].get("path", "")
        if path not in latency_by_path:
            continue
        count = float(row["value"])
        weighted_sum += latency_by_path[path] * count
        total_count += count

    if total_count <= 0:
        return 0.0
    return weighted_sum / total_count


def _compute_combined_red_metrics(fastapi_metrics: str, storefront_metrics: str) -> dict[str, float]:
    fastapi_rows = _parse_prometheus(fastapi_metrics)
    storefront_rows = _parse_prometheus(storefront_metrics)

    fastapi_total = _sum_metric(fastapi_rows, "fastapi_http_requests_total")
    fastapi_errors = _sum_metric(
        fastapi_rows,
        "fastapi_http_requests_total",
        lambda labels: _status_code(labels) >= 400,
    )
    fastapi_duration_sum = _sum_metric(fastapi_rows, "fastapi_http_request_duration_seconds_sum")
    fastapi_duration_count = _sum_metric(fastapi_rows, "fastapi_http_request_duration_seconds_count")
    fastapi_latency_ms = (fastapi_duration_sum / fastapi_duration_count * 1000.0) if fastapi_duration_count > 0 else 0.0

    storefront_total = _sum_metric(storefront_rows, "storefront_api_requests_total")
    storefront_errors = _sum_metric(
        storefront_rows,
        "storefront_api_requests_total",
        lambda labels: _status_code(labels) >= 400,
    )
    storefront_latency_ms = _weighted_storefront_latency_ms(storefront_rows)

    total_requests = fastapi_total + storefront_total
    total_errors = fastapi_errors + storefront_errors

    if total_requests > 0:
        avg_latency_ms = (
            (fastapi_latency_ms * fastapi_total + storefront_latency_ms * storefront_total) / total_requests
        )
    else:
        avg_latency_ms = fastapi_latency_ms or storefront_latency_ms or 0.0

    return {
        "total_requests": total_requests,
        "total_errors": total_errors,
        "avg_latency_ms": avg_latency_ms,
        "fastapi_total_requests": fastapi_total,
        "storefront_total_requests": storefront_total,
    }


def _ensure_history_table() -> None:
    if not DATABASE_URL:
        return

    with psycopg.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS observability_history_samples (
                  id BIGSERIAL PRIMARY KEY,
                  sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                  healthy_checks INTEGER NOT NULL,
                  failed_checks INTEGER NOT NULL,
                  total_checks INTEGER NOT NULL,
                  availability_percent DOUBLE PRECISION NOT NULL,
                  saturation_percent DOUBLE PRECISION NOT NULL,
                  request_rate_rps DOUBLE PRECISION NOT NULL,
                  error_rate_percent DOUBLE PRECISION NOT NULL,
                  avg_latency_ms DOUBLE PRECISION NOT NULL,
                  fastapi_total_requests DOUBLE PRECISION NOT NULL,
                  storefront_total_requests DOUBLE PRECISION NOT NULL,
                  raw JSONB NOT NULL DEFAULT '{}'::jsonb
                )
                """
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_observability_history_samples_sampled_at ON observability_history_samples(sampled_at DESC)"
            )
        connection.commit()


def _insert_history_sample(sample: dict) -> None:
    if not DATABASE_URL:
        return

    with psycopg.connect(DATABASE_URL) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO observability_history_samples (
                  sampled_at,
                  healthy_checks,
                  failed_checks,
                  total_checks,
                  availability_percent,
                  saturation_percent,
                  request_rate_rps,
                  error_rate_percent,
                  avg_latency_ms,
                  fastapi_total_requests,
                  storefront_total_requests,
                  raw
                ) VALUES (
                  %(sampled_at)s,
                  %(healthy_checks)s,
                  %(failed_checks)s,
                  %(total_checks)s,
                  %(availability_percent)s,
                  %(saturation_percent)s,
                  %(request_rate_rps)s,
                  %(error_rate_percent)s,
                  %(avg_latency_ms)s,
                  %(fastapi_total_requests)s,
                  %(storefront_total_requests)s,
                  %(raw)s
                )
                """,
                sample,
            )
            cursor.execute(
                "DELETE FROM observability_history_samples WHERE sampled_at < NOW() - (%s || ' days')::INTERVAL",
                (OBS_HISTORY_RETENTION_DAYS,),
            )
        connection.commit()


def _load_history(limit: int, hours: int) -> list[dict]:
    if not DATABASE_URL:
        return []

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  id,
                  sampled_at,
                  healthy_checks,
                  failed_checks,
                  total_checks,
                  availability_percent,
                  saturation_percent,
                  request_rate_rps,
                  error_rate_percent,
                  avg_latency_ms,
                  fastapi_total_requests,
                  storefront_total_requests
                FROM observability_history_samples
                WHERE sampled_at >= NOW() - (%s || ' hours')::INTERVAL
                ORDER BY sampled_at DESC
                LIMIT %s
                """,
                (hours, limit),
            )
            rows = cursor.fetchall()

    output: list[dict] = []
    for row in rows:
        output.append(
            {
                "id": row["id"],
                "sampledAt": row["sampled_at"].isoformat() if row["sampled_at"] else None,
                "healthyChecks": row["healthy_checks"],
                "failedChecks": row["failed_checks"],
                "totalChecks": row["total_checks"],
                "availabilityPercent": row["availability_percent"],
                "saturationPercent": row["saturation_percent"],
                "requestRateRps": row["request_rate_rps"],
                "errorRatePercent": row["error_rate_percent"],
                "avgLatencyMs": row["avg_latency_ms"],
                "fastapiTotalRequests": row["fastapi_total_requests"],
                "storefrontTotalRequests": row["storefront_total_requests"],
            }
        )
    return output


def _collect_and_store_sample() -> None:
    checks_payload = _collect_checks_payload()
    fastapi_metrics = _scrape_target_payload("fastapi_metrics")
    storefront_metrics = _scrape_target_payload("storefront_metrics")

    combined = _compute_combined_red_metrics(
        fastapi_metrics.get("preview", ""),
        storefront_metrics.get("preview", ""),
    )

    now = time.time()
    previous_time = sample_state["last_time"]
    previous_requests = sample_state["last_total_requests"]
    previous_errors = sample_state["last_total_errors"]

    request_rate_rps = 0.0
    error_rate_percent = 0.0

    if (
        previous_time is not None
        and previous_requests is not None
        and previous_errors is not None
        and now > previous_time
    ):
        elapsed = max(1.0, now - previous_time)
        delta_requests = max(0.0, combined["total_requests"] - previous_requests)
        delta_errors = max(0.0, combined["total_errors"] - previous_errors)
        request_rate_rps = delta_requests / elapsed
        error_rate_percent = (delta_errors / delta_requests * 100.0) if delta_requests > 0 else 0.0

    sample_state["last_time"] = now
    sample_state["last_total_requests"] = combined["total_requests"]
    sample_state["last_total_errors"] = combined["total_errors"]

    summary = checks_payload["summary"]
    total_checks = int(summary["total"])
    healthy_checks = int(summary["healthy"])
    failed_checks = int(summary["failed"])
    availability_percent = (healthy_checks / total_checks * 100.0) if total_checks > 0 else 0.0
    saturation_percent = (
        (len([item for item in checks_payload["items"] if (not item["ok"]) or item["durationMs"] >= 500]) / total_checks)
        * 100.0
        if total_checks > 0
        else 0.0
    )

    sample = {
        "sampled_at": datetime.now(timezone.utc),
        "healthy_checks": healthy_checks,
        "failed_checks": failed_checks,
        "total_checks": total_checks,
        "availability_percent": availability_percent,
        "saturation_percent": saturation_percent,
        "request_rate_rps": request_rate_rps,
        "error_rate_percent": error_rate_percent,
        "avg_latency_ms": combined["avg_latency_ms"],
        "fastapi_total_requests": combined["fastapi_total_requests"],
        "storefront_total_requests": combined["storefront_total_requests"],
        "raw": json.dumps(
            {
                "checks": checks_payload,
                "fastapiMetricsStatus": fastapi_metrics.get("status", 0),
                "storefrontMetricsStatus": storefront_metrics.get("status", 0),
            }
        ),
    }

    _insert_history_sample(sample)
    log_event(
        "history_sample_stored",
        availability_percent=round(availability_percent, 2),
        request_rate_rps=round(request_rate_rps, 3),
        error_rate_percent=round(error_rate_percent, 3),
        avg_latency_ms=round(combined["avg_latency_ms"], 2),
    )


async def _sampling_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(_collect_and_store_sample)
        except Exception as error:
            log_event("history_sample_failed", error=str(error))
        await asyncio.sleep(OBS_SAMPLE_INTERVAL_SECONDS)


@app.on_event("startup")
async def startup_event() -> None:
    try:
        await asyncio.to_thread(_ensure_history_table)
    except Exception as error:
        log_event("history_table_init_failed", error=str(error))
    app.state.sampling_task = asyncio.create_task(_sampling_loop())
    log_event("sampling_worker_started", interval_seconds=OBS_SAMPLE_INTERVAL_SECONDS)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    task = getattr(app.state, "sampling_task", None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "observability_service",
        "sampleIntervalSeconds": OBS_SAMPLE_INTERVAL_SECONDS,
        "historyRetentionDays": OBS_HISTORY_RETENTION_DAYS,
    }


@app.get("/metrics")
def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.get("/api/v1/checks")
def checks(x_observability_token: Optional[str] = Header(default=None)):
    _require_token(x_observability_token)
    return _collect_checks_payload()


@app.get("/api/v1/scrape")
def scrape(
    target: str = Query(...),
    x_observability_token: Optional[str] = Header(default=None),
):
    _require_token(x_observability_token)
    return _scrape_target_payload(target)


@app.get("/api/v1/history")
def history(
    limit: int = Query(240, ge=1, le=5000),
    hours: int = Query(24, ge=1, le=24 * 365),
    x_observability_token: Optional[str] = Header(default=None),
):
    _require_token(x_observability_token)
    try:
        items = _load_history(limit=limit, hours=hours)
        return {
            "generatedAt": time.time(),
            "summary": {
                "count": len(items),
                "limit": limit,
                "hours": hours,
            },
            "items": items,
        }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to load observability history: {error}")
