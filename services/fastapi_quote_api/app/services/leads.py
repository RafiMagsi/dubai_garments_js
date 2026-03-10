from __future__ import annotations

from typing import Dict, Optional

import psycopg
from fastapi import HTTPException

from app.core.config import LEAD_STATUSES
from app.services.activities import create_activity


def normalize_lead_status(status: str) -> str:
    value = status.strip().lower()
    if value not in LEAD_STATUSES:
        raise HTTPException(
            status_code=422,
            detail="Invalid lead status. Allowed: New, Qualified, Quoted, Won, Lost.",
        )
    return value


def track_lead_activity(
    connection: psycopg.Connection,
    lead_id: str,
    activity_type: str,
    title: str,
    details: Optional[str] = None,
    metadata: Optional[Dict[str, object]] = None,
) -> None:
    create_activity(
        connection=connection,
        activity_type=activity_type,
        title=title,
        lead_id=lead_id,
        details=details,
        metadata=metadata,
    )


def get_lead_by_id(connection: psycopg.Connection, lead_id: str) -> Optional[Dict]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
              l.id::text,
              l.customer_id::text,
              l.assigned_to_user_id::text,
              l.source,
              l.status,
              l.lead_score,
              l.company_name,
              l.contact_name,
              l.email,
              l.phone,
              l.requested_qty,
              l.ai_score,
              l.ai_classification,
              l.ai_reasoning,
              l.ai_product,
              l.ai_quantity,
              l.ai_urgency,
              l.ai_complexity,
              l.ai_provider,
              l.ai_fallback_used,
              l.ai_processed_at,
              l.budget::float8 AS budget,
              l.timeline_date,
              l.notes,
              l.last_contacted_at,
              l.created_at,
              l.updated_at,
              c.company_name AS customer_company_name
            FROM leads l
            LEFT JOIN customers c ON c.id = l.customer_id
            WHERE l.id = %s::uuid
            """,
            (lead_id,),
        )
        return cursor.fetchone()
