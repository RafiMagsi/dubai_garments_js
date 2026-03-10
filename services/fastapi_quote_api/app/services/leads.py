from __future__ import annotations

import json
from typing import Dict, Optional

import psycopg
from fastapi import HTTPException

from app.core.config import LEAD_STATUSES


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
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO activities (lead_id, activity_type, title, details, metadata)
            VALUES (%s::uuid, %s, %s, %s, %s::jsonb)
            """,
            (lead_id, activity_type, title, details, json.dumps(metadata or {})),
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
