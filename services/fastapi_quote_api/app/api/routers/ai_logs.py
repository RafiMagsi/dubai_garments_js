from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.db import get_db_connection

router = APIRouter(prefix="/api/v1", tags=["ai-logs"])


@router.get("/ai-logs")
def list_ai_logs(
    workflow_name: Optional[str] = Query(default=None),
    provider: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    trigger_entity_type: Optional[str] = Query(default=None),
    trigger_entity_id: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> Dict[str, List[Dict[str, Any]]]:
    sql = """
        SELECT
          id::text,
          source_service,
          workflow_name,
          provider,
          model,
          trigger_entity_type,
          trigger_entity_id::text,
          status,
          fallback_used,
          input_payload,
          output_payload,
          error_message,
          latency_ms,
          created_at::text,
          updated_at::text
        FROM ai_logs
    """
    where: List[str] = []
    params: List[Any] = []

    if workflow_name:
        where.append("workflow_name = %s")
        params.append(workflow_name.strip())
    if provider:
        where.append("provider = %s")
        params.append(provider.strip())
    if status:
        where.append("status = %s")
        params.append(status.strip().lower())
    if trigger_entity_type:
        where.append("trigger_entity_type = %s")
        params.append(trigger_entity_type.strip())
    if trigger_entity_id:
        where.append("trigger_entity_id = %s::uuid")
        params.append(trigger_entity_id.strip())
    if search:
        term = f"%{search.strip()}%"
        where.append(
            """
            (
              workflow_name ILIKE %s
              OR COALESCE(provider, '') ILIKE %s
              OR COALESCE(error_message, '') ILIKE %s
            )
            """
        )
        params.extend([term, term, term])

    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                rows = cursor.fetchall()
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch AI logs: {error}") from error

    return {"items": rows}


@router.get("/ai-logs/{log_id}")
def get_ai_log(log_id: str) -> Dict[str, Any]:
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      id::text,
                      source_service,
                      workflow_name,
                      provider,
                      model,
                      trigger_entity_type,
                      trigger_entity_id::text,
                      status,
                      fallback_used,
                      input_payload,
                      output_payload,
                      error_message,
                      latency_ms,
                      created_at::text,
                      updated_at::text
                    FROM ai_logs
                    WHERE id = %s::uuid
                    LIMIT 1
                    """,
                    (log_id,),
                )
                item = cursor.fetchone()
                if not item:
                    raise HTTPException(status_code=404, detail="AI log not found.")
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch AI log: {error}") from error

    return {"item": item}
