from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.db import get_db_connection
from app.core.queue import enqueue_lead_ai_job, enqueue_quote_pdf_job
from app.services.email import create_automation_run, finish_automation_run
from app.services.n8n import trigger_quote_followup_workflow

router = APIRouter(prefix="/api/v1", tags=["automation-runs"])

RETRYABLE_WORKFLOWS = {
    "lead_ai_processing",
    "quote_pdf_generation",
    "n8n_quote_followup_trigger",
}


def _is_retryable(workflow_name: str) -> bool:
    return workflow_name in RETRYABLE_WORKFLOWS


@router.get("/automation-runs")
def list_automation_runs(
    workflow_name: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    failed_only: bool = Query(default=False),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> Dict[str, List[Dict[str, Any]]]:
    sql = """
        SELECT
          id::text,
          workflow_name,
          trigger_source,
          trigger_entity_type,
          trigger_entity_id::text,
          status,
          request_payload,
          response_payload,
          error_message,
          started_at::text,
          finished_at::text,
          created_at::text,
          updated_at::text
        FROM automation_runs
    """
    params: List[Any] = []
    where: List[str] = []

    if workflow_name:
        where.append("workflow_name = %s")
        params.append(workflow_name.strip())
    if status:
        where.append("status = %s")
        params.append(status.strip().lower())
    if failed_only:
        where.append("status = 'failed'")
    if search:
        where.append("(workflow_name ILIKE %s OR COALESCE(error_message, '') ILIKE %s)")
        term = f"%{search.strip()}%"
        params.extend([term, term])

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
        raise HTTPException(status_code=500, detail=f"Failed to fetch automation runs: {error}") from error

    items = [{**row, "retryable": _is_retryable(row["workflow_name"])} for row in rows]
    return {"items": items}


@router.get("/automation-runs/{run_id}")
def get_automation_run(run_id: str) -> Dict[str, Any]:
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      id::text,
                      workflow_name,
                      trigger_source,
                      trigger_entity_type,
                      trigger_entity_id::text,
                      status,
                      request_payload,
                      response_payload,
                      error_message,
                      started_at::text,
                      finished_at::text,
                      created_at::text,
                      updated_at::text
                    FROM automation_runs
                    WHERE id = %s::uuid
                    """,
                    (run_id,),
                )
                item = cursor.fetchone()
                if not item:
                    raise HTTPException(status_code=404, detail="Automation run not found.")
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch automation run: {error}") from error

    return {"item": {**item, "retryable": _is_retryable(item["workflow_name"])}}


@router.post("/automation-runs/{run_id}/retry")
def retry_automation_run(run_id: str) -> Dict[str, Any]:
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      id::text,
                      workflow_name,
                      trigger_source,
                      trigger_entity_type,
                      trigger_entity_id::text,
                      status,
                      request_payload
                    FROM automation_runs
                    WHERE id = %s::uuid
                    """,
                    (run_id,),
                )
                run = cursor.fetchone()
                if not run:
                    raise HTTPException(status_code=404, detail="Automation run not found.")

                workflow_name = run["workflow_name"]
                if not _is_retryable(workflow_name):
                    raise HTTPException(
                        status_code=422,
                        detail=f"Retry is not supported for workflow '{workflow_name}'.",
                    )

                entity_id = run.get("trigger_entity_id")
                request_payload = run.get("request_payload") or {}

                retry_run_id = create_automation_run(
                    connection=connection,
                    workflow_name=workflow_name,
                    trigger_source="retry",
                    trigger_entity_type=run.get("trigger_entity_type") or "system",
                    trigger_entity_id=entity_id,
                    request_payload={
                        "retryOfRunId": run_id,
                        "originalRequest": request_payload,
                    },
                )

                if workflow_name == "lead_ai_processing":
                    if not entity_id:
                        raise HTTPException(status_code=422, detail="Missing trigger_entity_id for lead AI retry.")
                    job_id = enqueue_lead_ai_job(entity_id)
                    if not job_id:
                        finish_automation_run(
                            connection=connection,
                            run_id=retry_run_id,
                            status="failed",
                            error_message="Failed to enqueue lead AI retry job.",
                        )
                        connection.commit()
                        raise HTTPException(status_code=500, detail="Failed to enqueue lead AI retry job.")
                    finish_automation_run(
                        connection=connection,
                        run_id=retry_run_id,
                        status="success",
                        response_payload={"jobId": job_id, "workflow": workflow_name},
                    )
                    connection.commit()
                    return {
                        "ok": True,
                        "message": "Lead AI retry queued.",
                        "retryRunId": retry_run_id,
                        "jobId": job_id,
                    }

                if workflow_name == "quote_pdf_generation":
                    if not entity_id:
                        raise HTTPException(status_code=422, detail="Missing trigger_entity_id for quote PDF retry.")
                    job_id = enqueue_quote_pdf_job(entity_id)
                    if not job_id:
                        finish_automation_run(
                            connection=connection,
                            run_id=retry_run_id,
                            status="failed",
                            error_message="Failed to enqueue quote PDF retry job.",
                        )
                        connection.commit()
                        raise HTTPException(status_code=500, detail="Failed to enqueue quote PDF retry job.")
                    finish_automation_run(
                        connection=connection,
                        run_id=retry_run_id,
                        status="success",
                        response_payload={"jobId": job_id, "workflow": workflow_name},
                    )
                    connection.commit()
                    return {
                        "ok": True,
                        "message": "Quote PDF retry queued.",
                        "retryRunId": retry_run_id,
                        "jobId": job_id,
                    }

                if workflow_name == "n8n_quote_followup_trigger":
                    result = trigger_quote_followup_workflow(request_payload if isinstance(request_payload, dict) else {})
                    if result.get("ok"):
                        finish_automation_run(
                            connection=connection,
                            run_id=retry_run_id,
                            status="success",
                            response_payload=result,
                        )
                        connection.commit()
                        return {
                            "ok": True,
                            "message": "n8n follow-up trigger retried successfully.",
                            "retryRunId": retry_run_id,
                            "result": result,
                        }

                    finish_automation_run(
                        connection=connection,
                        run_id=retry_run_id,
                        status="failed",
                        response_payload=result,
                        error_message=result.get("reason") or result.get("responseText") or "Retry failed.",
                    )
                    connection.commit()
                    raise HTTPException(status_code=500, detail="n8n follow-up trigger retry failed.")

                raise HTTPException(status_code=422, detail=f"Unsupported workflow retry: {workflow_name}")
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to retry automation run: {error}") from error
