from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.db import get_db_connection
from app.core.queue import enqueue_lead_ai_job
from app.schemas.leads import (
    LeadCreateRequest,
    LeadSendEmailRequest,
    LeadStatusUpdateRequest,
    LeadUpdateRequest,
)
from app.services.deals import stage_label
from app.services.leads import get_lead_by_id, normalize_lead_status, track_lead_activity

router = APIRouter(prefix="/api/v1", tags=["leads"])


@router.get("/leads")
def list_leads(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> Dict[str, List[Dict]]:
    selected_status = normalize_lead_status(status) if status else None
    search_value = search.strip() if search else None

    sql = """
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
    """
    params: List[object] = []
    where_clauses: List[str] = []

    if selected_status:
        where_clauses.append("l.status = %s")
        params.append(selected_status)
    if search_value:
        where_clauses.append(
            "(l.contact_name ILIKE %s OR l.company_name ILIKE %s OR l.email ILIKE %s)"
        )
        like_term = f"%{search_value}%"
        params.extend([like_term, like_term, like_term])

    if where_clauses:
        sql += " WHERE " + " AND ".join(where_clauses)

    sql += " ORDER BY l.created_at DESC LIMIT %s"
    params.append(limit)

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                items = cursor.fetchall()
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch leads: {error}") from error

    return {"items": items}


@router.get("/leads/{lead_id}")
def view_lead(lead_id: str) -> Dict[str, object]:
    try:
        with get_db_connection() as connection:
            lead = get_lead_by_id(connection, lead_id)
            if not lead:
                raise HTTPException(status_code=404, detail="Lead not found.")

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      d.id::text,
                      d.stage,
                      d.title,
                      d.expected_value::float8 AS expected_value,
                      d.probability_pct,
                      d.created_at
                    FROM deals d
                    WHERE d.lead_id = %s::uuid
                    ORDER BY d.created_at DESC
                    LIMIT 1
                    """,
                    (lead_id,),
                )
                deal = cursor.fetchone()

                cursor.execute(
                    """
                    SELECT
                      id::text,
                      channel,
                      direction,
                      subject,
                      message_text,
                      COALESCE(sent_at, created_at) AS sent_at,
                      created_at
                    FROM communications
                    WHERE lead_id = %s::uuid
                    ORDER BY created_at DESC
                    LIMIT 25
                    """,
                    (lead_id,),
                )
                communications = cursor.fetchall()

                cursor.execute(
                    """
                    SELECT
                      id::text,
                      activity_type,
                      title,
                      details,
                      metadata,
                      occurred_at,
                      created_at
                    FROM activities
                    WHERE lead_id = %s::uuid
                    ORDER BY created_at DESC
                    LIMIT 25
                    """,
                    (lead_id,),
                )
                activities = cursor.fetchall()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch lead: {error}") from error

    return {"item": lead, "deal": deal, "communications": communications, "activities": activities}


@router.post("/leads")
def create_lead(payload: LeadCreateRequest) -> Dict[str, object]:
    status = normalize_lead_status(payload.status)
    if payload.requested_qty is not None and payload.requested_qty <= 0:
        raise HTTPException(status_code=422, detail="requested_qty must be greater than 0.")
    if payload.budget is not None and payload.budget < 0:
        raise HTTPException(status_code=422, detail="budget must be >= 0.")
    if payload.lead_score is not None and (payload.lead_score < 0 or payload.lead_score > 100):
        raise HTTPException(status_code=422, detail="lead_score must be between 0 and 100.")

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO leads (
                      customer_id,
                      assigned_to_user_id,
                      source,
                      status,
                      lead_score,
                      company_name,
                      contact_name,
                      email,
                      phone,
                      requested_qty,
                      budget,
                      timeline_date,
                      notes
                    )
                    VALUES (
                      %s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    RETURNING id::text
                    """,
                    (
                        payload.customer_id,
                        payload.assigned_to_user_id,
                        payload.source.strip() if payload.source else "website",
                        status,
                        payload.lead_score,
                        payload.company_name.strip() if payload.company_name else None,
                        payload.contact_name.strip(),
                        payload.email.strip() if payload.email else None,
                        payload.phone.strip() if payload.phone else None,
                        payload.requested_qty,
                        payload.budget,
                        payload.timeline_date,
                        payload.notes,
                    ),
                )
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=500, detail="Failed to create lead.")
                lead_id = row["id"]

                track_lead_activity(
                    connection,
                    lead_id,
                    "lead_created",
                    "Lead created",
                    details="Lead created via Lead Module API.",
                    metadata={"status": status},
                )

            lead = get_lead_by_id(connection, lead_id)
            connection.commit()

        job_id = enqueue_lead_ai_job(lead_id)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lead creation failed: {error}") from error

    return {"item": lead, "aiJobId": job_id}


@router.patch("/leads/{lead_id}")
def update_lead(lead_id: str, payload: LeadUpdateRequest) -> Dict[str, object]:
    if payload.requested_qty is not None and payload.requested_qty <= 0:
        raise HTTPException(status_code=422, detail="requested_qty must be greater than 0.")
    if payload.budget is not None and payload.budget < 0:
        raise HTTPException(status_code=422, detail="budget must be >= 0.")
    if payload.lead_score is not None and (payload.lead_score < 0 or payload.lead_score > 100):
        raise HTTPException(status_code=422, detail="lead_score must be between 0 and 100.")

    updates: List[str] = []
    values: List[object] = []

    mapping = {
        "assigned_to_user_id": payload.assigned_to_user_id,
        "lead_score": payload.lead_score,
        "company_name": payload.company_name.strip() if payload.company_name else None,
        "contact_name": payload.contact_name.strip() if payload.contact_name else None,
        "email": payload.email.strip() if payload.email else None,
        "phone": payload.phone.strip() if payload.phone else None,
        "requested_qty": payload.requested_qty,
        "budget": payload.budget,
        "timeline_date": payload.timeline_date,
        "notes": payload.notes,
    }

    for field_name, field_value in mapping.items():
        if field_value is None:
            continue
        cast = "::uuid" if field_name == "assigned_to_user_id" else ""
        updates.append(f"{field_name} = %s{cast}")
        values.append(field_value)

    if not updates:
        raise HTTPException(status_code=422, detail="No fields provided for update.")

    values.append(lead_id)
    sql = f"""
        UPDATE leads
        SET {", ".join(updates)}, updated_at = NOW()
        WHERE id = %s::uuid
        RETURNING id::text
    """

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, values)
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=404, detail="Lead not found.")

                track_lead_activity(
                    connection,
                    lead_id,
                    "lead_updated",
                    "Lead details updated",
                    details="Lead fields were updated via Lead Module API.",
                    metadata={"updatedFields": [u.split("=")[0].strip() for u in updates]},
                )

            lead = get_lead_by_id(connection, lead_id)
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lead update failed: {error}") from error

    return {"item": lead}


@router.patch("/leads/{lead_id}/status")
def update_lead_status(lead_id: str, payload: LeadStatusUpdateRequest) -> Dict[str, object]:
    status = normalize_lead_status(payload.status)

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT status FROM leads WHERE id = %s::uuid",
                    (lead_id,),
                )
                current = cursor.fetchone()
                if not current:
                    raise HTTPException(status_code=404, detail="Lead not found.")

                cursor.execute(
                    """
                    UPDATE leads
                    SET status = %s, updated_at = NOW()
                    WHERE id = %s::uuid
                    RETURNING id::text
                    """,
                    (status, lead_id),
                )
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=500, detail="Failed to update lead status.")

                if current["status"] != status:
                    track_lead_activity(
                        connection,
                        lead_id,
                        "lead_status_changed",
                        f"Lead moved to {stage_label(status)}",
                        details=payload.notes,
                        metadata={"from": current["status"], "to": status},
                    )

            lead = get_lead_by_id(connection, lead_id)
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lead status update failed: {error}") from error

    return {"item": lead}


@router.post("/leads/{lead_id}/send-email")
def send_lead_email(lead_id: str, payload: LeadSendEmailRequest) -> Dict[str, object]:
    recipient_email = payload.recipient_email.strip()
    subject = payload.subject.strip()
    message = payload.message.strip()

    if not recipient_email or not subject or not message:
        raise HTTPException(
            status_code=422,
            detail="recipient_email, subject, and message are required.",
        )

    try:
        with get_db_connection() as connection:
            lead = get_lead_by_id(connection, lead_id)
            if not lead:
                raise HTTPException(status_code=404, detail="Lead not found.")

            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO communications (
                      customer_id,
                      lead_id,
                      channel,
                      direction,
                      subject,
                      message_text,
                      sent_at
                    )
                    VALUES (%s::uuid, %s::uuid, 'email', 'outbound', %s, %s, NOW())
                    RETURNING
                      id::text,
                      channel,
                      direction,
                      subject,
                      message_text,
                      sent_at,
                      created_at
                    """,
                    (
                        lead.get("customer_id"),
                        lead_id,
                        subject,
                        f"To: {recipient_email}\n\n{message}",
                    ),
                )
                communication = cursor.fetchone()
                if not communication:
                    raise HTTPException(status_code=500, detail="Failed to log communication.")

                track_lead_activity(
                    connection,
                    lead_id,
                    "email_sent",
                    "Email sent",
                    details=f"Email sent to {recipient_email}",
                    metadata={"channel": "email", "recipientEmail": recipient_email, "subject": subject},
                )

            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {error}") from error

    return {
        "ok": True,
        "message": "Email communication logged successfully.",
        "item": communication,
    }
