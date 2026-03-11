from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict

from fastapi import APIRouter

from app.core.observability import metrics_response

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> Dict[str, str]:
    return {"status": "ok", "checkedAt": datetime.now(timezone.utc).isoformat()}


@router.get("/metrics")
def health_metrics():
    return metrics_response()
