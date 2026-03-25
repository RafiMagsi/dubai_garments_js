from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict

import psycopg
from fastapi import APIRouter, HTTPException

from app.core.observability import metrics_response
from app.core.db import get_db_connection

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok", "checkedAt": datetime.now(timezone.utc).isoformat()}


@router.get("/health/db")
def health_db_check() -> Dict[str, str]:
    checked_at = datetime.now(timezone.utc).isoformat()
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        return {"status": "ok", "checkedAt": checked_at}
    except HTTPException:
        raise
    except psycopg.Error as error:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {error.__class__.__name__}") from error


@router.get("/metrics")
def health_metrics():
    return metrics_response()
