from __future__ import annotations

import json
from typing import Any, Dict, Optional

from app.core.db import get_db_connection


def create_ai_log(
    *,
    workflow_name: str,
    status: str,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    trigger_entity_type: Optional[str] = None,
    trigger_entity_id: Optional[str] = None,
    fallback_used: bool = False,
    input_payload: Optional[Dict[str, Any]] = None,
    output_payload: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    latency_ms: Optional[int] = None,
) -> None:
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO ai_logs (
                        source_service,
                        workflow_name,
                        provider,
                        model,
                        trigger_entity_type,
                        trigger_entity_id,
                        status,
                        fallback_used,
                        input_payload,
                        output_payload,
                        error_message,
                        latency_ms
                    )
                    VALUES (
                        %s, %s, %s, %s, %s, %s::uuid, %s, %s, %s::jsonb, %s::jsonb, %s, %s
                    )
                    """,
                    (
                        "fastapi_quote_api",
                        workflow_name,
                        provider,
                        model,
                        trigger_entity_type,
                        trigger_entity_id,
                        status,
                        fallback_used,
                        json.dumps(input_payload or {}),
                        json.dumps(output_payload or {}),
                        error_message,
                        latency_ms,
                    ),
                )
            connection.commit()
    except Exception:
        # Logging is fail-open to avoid blocking lead processing.
        return
