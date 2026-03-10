from __future__ import annotations

import json
from typing import Dict, List, Optional

import psycopg
from fastapi import HTTPException

ALLOWED_ACTIVITY_TYPES = {
    "lead_created",
    "lead_updated",
    "lead_status_changed",
    "ai_processed_lead",
    "quote_generated",
    "email_sent",
    "followup_triggered",
    "customer_replied",
    "deal_created",
    "deal_stage_changed",
}


def normalize_activity_type(activity_type: str) -> str:
    value = activity_type.strip().lower()
    if value not in ALLOWED_ACTIVITY_TYPES:
        raise HTTPException(
            status_code=422,
            detail=(
                "Invalid activity_type. Allowed: lead_created, lead_updated, "
                "lead_status_changed, ai_processed_lead, quote_generated, "
                "email_sent, followup_triggered, customer_replied, deal_created, "
                "deal_stage_changed."
            ),
        )
    return value


def create_activity(
    connection: psycopg.Connection,
    activity_type: str,
    title: str,
    user_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    quote_id: Optional[str] = None,
    details: Optional[str] = None,
    metadata: Optional[Dict[str, object]] = None,
) -> str:
    normalized_type = normalize_activity_type(activity_type)
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO activities (
              user_id,
              customer_id,
              lead_id,
              deal_id,
              quote_id,
              activity_type,
              title,
              details,
              metadata
            )
            VALUES (
              %s::uuid,
              %s::uuid,
              %s::uuid,
              %s::uuid,
              %s::uuid,
              %s,
              %s,
              %s,
              %s::jsonb
            )
            RETURNING id::text
            """,
            (
                user_id,
                customer_id,
                lead_id,
                deal_id,
                quote_id,
                normalized_type,
                title.strip(),
                details,
                json.dumps(metadata or {}),
            ),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=500, detail="Failed to create activity.")
        return row["id"]


def get_activity_by_id(connection: psycopg.Connection, activity_id: str) -> Optional[Dict]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
              id::text,
              user_id::text,
              customer_id::text,
              lead_id::text,
              deal_id::text,
              quote_id::text,
              activity_type,
              title,
              details,
              metadata,
              occurred_at,
              created_at,
              updated_at
            FROM activities
            WHERE id = %s::uuid
            """,
            (activity_id,),
        )
        return cursor.fetchone()


def list_activities(
    connection: psycopg.Connection,
    activity_type: Optional[str] = None,
    lead_id: Optional[str] = None,
    deal_id: Optional[str] = None,
    limit: int = 100,
) -> List[Dict]:
    sql = """
        SELECT
          id::text,
          user_id::text,
          customer_id::text,
          lead_id::text,
          deal_id::text,
          quote_id::text,
          activity_type,
          title,
          details,
          metadata,
          occurred_at,
          created_at,
          updated_at
        FROM activities
    """
    params: List[object] = []
    where_clauses: List[str] = []

    if activity_type:
        where_clauses.append("activity_type = %s")
        params.append(normalize_activity_type(activity_type))
    if lead_id:
        where_clauses.append("lead_id = %s::uuid")
        params.append(lead_id)
    if deal_id:
        where_clauses.append("deal_id = %s::uuid")
        params.append(deal_id)

    if where_clauses:
        sql += " WHERE " + " AND ".join(where_clauses)

    sql += " ORDER BY created_at DESC LIMIT %s"
    params.append(limit)

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        return cursor.fetchall()
