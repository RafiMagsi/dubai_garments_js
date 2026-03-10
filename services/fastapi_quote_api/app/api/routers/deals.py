from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.config import DEAL_STAGES
from app.core.db import get_db_connection
from app.schemas.deals import (
    ConvertLeadRequest,
    DealCreateRequest,
    DealSendEmailRequest,
    DealStageUpdateRequest,
    DealUpdateRequest,
)
from app.services.deals import (
    ensure_customer_from_lead,
    maybe_schedule_followup,
    normalize_stage,
    stage_label,
    track_deal_activity,
    update_lead_status_from_deal,
)

router = APIRouter(prefix="/api/v1", tags=["deals"])


@router.get("/deals")
def list_deals(
    stage: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> Dict[str, List[Dict]]:
    selected_stage: Optional[str] = normalize_stage(stage) if stage else None

    sql = """
        SELECT
          d.id::text,
          d.lead_id::text,
          d.customer_id::text,
          d.owner_user_id::text,
          d.title,
          d.stage,
          d.expected_value::float8 AS expected_value,
          d.probability_pct,
          d.expected_close_date,
          d.won_at,
          d.lost_reason,
          d.notes,
          d.created_at,
          d.updated_at,
          l.contact_name AS lead_contact_name,
          l.company_name AS lead_company_name,
          l.email AS lead_email,
          l.ai_product AS lead_product_name,
          l.requested_qty AS lead_quantity,
          c.company_name AS customer_company_name
        FROM deals d
        LEFT JOIN leads l ON l.id = d.lead_id
        LEFT JOIN customers c ON c.id = d.customer_id
    """
    params: List[object] = []
    where_clauses: List[str] = []
    if selected_stage:
        where_clauses.append("d.stage = %s")
        params.append(selected_stage)
    if search:
        term = f"%{search.strip()}%"
        where_clauses.append(
            "(d.title ILIKE %s OR l.contact_name ILIKE %s OR l.company_name ILIKE %s OR l.email ILIKE %s OR l.ai_product ILIKE %s)"
        )
        params.extend([term, term, term, term, term])
    if where_clauses:
        sql += " WHERE " + " AND ".join(where_clauses)
    sql += " ORDER BY d.created_at DESC LIMIT %s"
    params.append(limit)

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                items = cursor.fetchall()
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch deals: {error}") from error

    return {"items": items}


@router.get("/deals/{deal_id}")
def view_deal(deal_id: str) -> Dict[str, object]:
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      d.id::text,
                      d.lead_id::text,
                      d.customer_id::text,
                      d.owner_user_id::text,
                      d.title,
                      d.stage,
                      d.expected_value::float8 AS expected_value,
                      d.probability_pct,
                      d.expected_close_date,
                      d.won_at,
                      d.lost_reason,
                      d.notes,
                      d.created_at,
                      d.updated_at,
                      l.contact_name AS lead_contact_name,
                      l.company_name AS lead_company_name,
                      l.email AS lead_email,
                      l.ai_product AS lead_product_name,
                      l.requested_qty AS lead_quantity,
                      c.company_name AS customer_company_name
                    FROM deals d
                    LEFT JOIN leads l ON l.id = d.lead_id
                    LEFT JOIN customers c ON c.id = d.customer_id
                    WHERE d.id = %s::uuid
                    """,
                    (deal_id,),
                )
                deal = cursor.fetchone()
                if not deal:
                    raise HTTPException(status_code=404, detail="Deal not found.")

                cursor.execute(
                    """
                    SELECT
                      q.id::text,
                      q.quote_number,
                      q.customer_id::text,
                      q.lead_id::text,
                      q.deal_id::text,
                      q.created_by_user_id::text,
                      q.status,
                      q.currency,
                      q.subtotal::float8 AS subtotal,
                      q.tax_amount::float8 AS tax_amount,
                      q.discount_amount::float8 AS discount_amount,
                      q.total_amount::float8 AS total_amount,
                      q.valid_until::text,
                      q.terms,
                      q.notes,
                      q.created_at::text,
                      q.updated_at::text,
                      c.company_name AS customer_company_name
                    FROM quotes q
                    LEFT JOIN customers c ON c.id = q.customer_id
                    WHERE q.deal_id = %s::uuid
                    ORDER BY q.created_at DESC
                    LIMIT 25
                    """,
                    (deal_id,),
                )
                quotes = cursor.fetchall()

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
                    WHERE deal_id = %s::uuid
                    ORDER BY created_at DESC
                    LIMIT 25
                    """,
                    (deal_id,),
                )
                communications = cursor.fetchall()

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch deal: {error}") from error

    return {"item": deal, "quotes": quotes, "communications": communications}


@router.get("/pipeline")
def get_pipeline(limit_per_stage: int = Query(default=25, ge=1, le=100)) -> Dict[str, object]:
    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      d.id::text,
                      d.lead_id::text,
                      d.customer_id::text,
                      d.title,
                      d.stage,
                      d.expected_value::float8 AS expected_value,
                      d.probability_pct,
                      d.expected_close_date,
                      d.created_at,
                      c.company_name AS customer_company_name
                    FROM deals d
                    LEFT JOIN customers c ON c.id = d.customer_id
                    ORDER BY d.created_at DESC
                    """
                )
                all_deals = cursor.fetchall()
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch pipeline: {error}") from error

    stages_payload: List[Dict[str, object]] = []
    for stage in DEAL_STAGES:
        stage_items = [deal for deal in all_deals if deal["stage"] == stage][:limit_per_stage]
        stages_payload.append(
            {
                "stageKey": stage,
                "stageLabel": stage_label(stage),
                "count": len([deal for deal in all_deals if deal["stage"] == stage]),
                "items": stage_items,
            }
        )

    return {"stages": stages_payload}


@router.post("/deals")
def create_deal(payload: DealCreateRequest) -> Dict[str, object]:
    stage = normalize_stage(payload.stage)
    if payload.expected_value < 0:
        raise HTTPException(status_code=422, detail="expected_value must be >= 0.")
    if payload.probability_pct < 0 or payload.probability_pct > 100:
        raise HTTPException(status_code=422, detail="probability_pct must be between 0 and 100.")

    customer_id = payload.customer_id
    if payload.lead_id and not customer_id:
        try:
            with get_db_connection() as connection:
                customer_id = ensure_customer_from_lead(connection, payload.lead_id)
                connection.commit()
        except HTTPException:
            raise
        except Exception as error:
            raise HTTPException(
                status_code=500, detail=f"Failed to resolve customer from lead: {error}"
            ) from error

    if not customer_id:
        raise HTTPException(
            status_code=422,
            detail="customer_id is required (or provide a lead_id with resolvable customer).",
        )

    sql = """
        INSERT INTO deals (
          lead_id, customer_id, owner_user_id, title, stage, expected_value,
          probability_pct, expected_close_date, notes
        )
        VALUES (%s::uuid, %s::uuid, %s::uuid, %s, %s, %s, %s, %s, %s)
        RETURNING id::text, lead_id::text, customer_id::text, title, stage, created_at
    """

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    sql,
                    (
                        payload.lead_id,
                        customer_id,
                        payload.owner_user_id,
                        payload.title.strip(),
                        stage,
                        payload.expected_value,
                        payload.probability_pct,
                        payload.expected_close_date,
                        payload.notes,
                    ),
                )
                deal = cursor.fetchone()
                if not deal:
                    raise HTTPException(status_code=500, detail="Failed to create deal.")

                update_lead_status_from_deal(connection, payload.lead_id, stage)
                track_deal_activity(
                    connection,
                    deal["id"],
                    "deal_created",
                    "Deal created",
                    lead_id=payload.lead_id,
                    details="Deal created from Deal Module API.",
                    metadata={"stage": stage},
                )
                maybe_schedule_followup(connection, deal["id"], payload.lead_id, stage)
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Deal creation failed: {error}") from error

    return {"item": deal}


@router.post("/leads/{lead_id}/convert-to-deal")
def convert_lead_to_deal(lead_id: str, payload: ConvertLeadRequest) -> Dict[str, object]:
    if payload.expected_value < 0:
        raise HTTPException(status_code=422, detail="expected_value must be >= 0.")
    if payload.probability_pct < 0 or payload.probability_pct > 100:
        raise HTTPException(status_code=422, detail="probability_pct must be between 0 and 100.")

    try:
        with get_db_connection() as connection:
            customer_id = ensure_customer_from_lead(connection, lead_id)
            if not customer_id:
                raise HTTPException(status_code=422, detail="Unable to resolve customer for lead.")

            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT contact_name, company_name FROM leads WHERE id = %s::uuid",
                    (lead_id,),
                )
                lead = cursor.fetchone()
                if not lead:
                    raise HTTPException(status_code=404, detail="Lead not found.")

                title = payload.title or (
                    f"{(lead.get('company_name') or 'Company').strip()} Opportunity"
                )

                cursor.execute(
                    """
                    INSERT INTO deals (
                      lead_id, customer_id, owner_user_id, title, stage, expected_value,
                      probability_pct, expected_close_date, notes
                    )
                    VALUES (%s::uuid, %s::uuid, %s::uuid, %s, 'new', %s, %s, %s, %s)
                    RETURNING id::text, lead_id::text, customer_id::text, title, stage, created_at
                    """,
                    (
                        lead_id,
                        customer_id,
                        payload.owner_user_id,
                        title,
                        payload.expected_value,
                        payload.probability_pct,
                        payload.expected_close_date,
                        payload.notes,
                    ),
                )
                deal = cursor.fetchone()
                if not deal:
                    raise HTTPException(status_code=500, detail="Failed to convert lead to deal.")

                update_lead_status_from_deal(connection, lead_id, "qualified")
                track_deal_activity(
                    connection,
                    deal["id"],
                    "deal_created",
                    "Lead converted to deal",
                    lead_id=lead_id,
                    details="Lead converted into a sales opportunity.",
                    metadata={"stage": "new"},
                )
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Lead conversion failed: {error}") from error

    return {"item": deal}


@router.post("/deals/{deal_id}/stage")
def update_deal_stage(deal_id: str, payload: DealStageUpdateRequest) -> Dict[str, object]:
    stage = normalize_stage(payload.stage)
    won_at = datetime.now(timezone.utc) if stage == "won" else None
    lost_reason = payload.lost_reason if stage == "lost" else None

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id::text, lead_id::text, stage FROM deals WHERE id = %s::uuid",
                    (deal_id,),
                )
                current = cursor.fetchone()
                if not current:
                    raise HTTPException(status_code=404, detail="Deal not found.")

                cursor.execute(
                    """
                    UPDATE deals
                    SET
                      stage = %s,
                      won_at = %s,
                      lost_reason = %s,
                      notes = COALESCE(%s, notes),
                      updated_at = NOW()
                    WHERE id = %s::uuid
                    RETURNING
                      id::text,
                      lead_id::text,
                      customer_id::text,
                      title,
                      stage,
                      expected_value::float8 AS expected_value,
                      probability_pct,
                      expected_close_date,
                      won_at,
                      lost_reason,
                      notes,
                      updated_at
                    """,
                    (stage, won_at, lost_reason, payload.notes, deal_id),
                )
                updated = cursor.fetchone()
                if not updated:
                    raise HTTPException(status_code=500, detail="Failed to update deal stage.")

                lead_id = updated.get("lead_id")
                update_lead_status_from_deal(connection, lead_id, stage)
                if current["stage"] != stage:
                    track_deal_activity(
                        connection,
                        deal_id,
                        "deal_stage_changed",
                        f"Deal moved to {stage_label(stage)}",
                        lead_id=lead_id,
                        details=payload.notes,
                        metadata={"from": current["stage"], "to": stage},
                    )
                    maybe_schedule_followup(connection, deal_id, lead_id, stage)

            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Stage update failed: {error}") from error

    return {"item": updated}


@router.patch("/deals/{deal_id}")
def update_deal(deal_id: str, payload: DealUpdateRequest) -> Dict[str, object]:
    updates: List[str] = []
    values: List[object] = []

    if payload.stage is not None:
        stage = normalize_stage(payload.stage)
        updates.append("stage = %s")
        values.append(stage)
    if payload.owner_user_id is not None:
        updates.append("owner_user_id = %s::uuid")
        values.append(payload.owner_user_id or None)
    if payload.expected_value is not None:
        if payload.expected_value < 0:
            raise HTTPException(status_code=422, detail="expected_value must be >= 0.")
        updates.append("expected_value = %s")
        values.append(payload.expected_value)
    if payload.probability_pct is not None:
        if payload.probability_pct < 0 or payload.probability_pct > 100:
            raise HTTPException(status_code=422, detail="probability_pct must be between 0 and 100.")
        updates.append("probability_pct = %s")
        values.append(payload.probability_pct)
    if payload.expected_close_date is not None:
        updates.append("expected_close_date = %s")
        values.append(payload.expected_close_date)
    if payload.notes is not None:
        updates.append("notes = %s")
        values.append(payload.notes)

    if not updates:
        raise HTTPException(status_code=422, detail="No fields provided for update.")

    values.append(deal_id)
    sql = f"""
        UPDATE deals
        SET {", ".join(updates)}, updated_at = NOW()
        WHERE id = %s::uuid
        RETURNING id::text, lead_id::text, customer_id::text, owner_user_id::text, title, stage,
          expected_value::float8 AS expected_value, probability_pct, expected_close_date, won_at,
          lost_reason, notes, created_at, updated_at
    """

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, values)
                updated = cursor.fetchone()
                if not updated:
                    raise HTTPException(status_code=404, detail="Deal not found.")

                track_deal_activity(
                    connection,
                    deal_id,
                    "deal_updated",
                    "Deal updated",
                    lead_id=updated.get("lead_id"),
                    details="Deal details were updated from admin.",
                    metadata={"updatedFields": [u.split("=")[0].strip() for u in updates]},
                )
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to update deal: {error}") from error

    return {"item": updated}


@router.post("/deals/{deal_id}/send-email")
def send_deal_email(deal_id: str, payload: DealSendEmailRequest) -> Dict[str, object]:
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
            with connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id::text, lead_id::text, customer_id::text FROM deals WHERE id = %s::uuid",
                    (deal_id,),
                )
                deal = cursor.fetchone()
                if not deal:
                    raise HTTPException(status_code=404, detail="Deal not found.")

                cursor.execute(
                    """
                    INSERT INTO communications (
                      customer_id, lead_id, deal_id, channel, direction, subject, message_text, sent_at
                    )
                    VALUES (%s::uuid, %s::uuid, %s::uuid, 'email', 'outbound', %s, %s, NOW())
                    RETURNING id::text, channel, direction, subject, message_text, sent_at, created_at
                    """,
                    (
                        deal.get("customer_id"),
                        deal.get("lead_id"),
                        deal_id,
                        subject,
                        f"To: {recipient_email}\n\n{message}",
                    ),
                )
                communication = cursor.fetchone()
                if not communication:
                    raise HTTPException(status_code=500, detail="Failed to log communication.")

                track_deal_activity(
                    connection,
                    deal_id,
                    "email_sent",
                    "Email sent",
                    lead_id=deal.get("lead_id"),
                    details=f"Email sent to {recipient_email}",
                    metadata={"channel": "email", "recipientEmail": recipient_email, "subject": subject},
                )
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to send deal email: {error}") from error

    return {"ok": True, "message": "Email communication logged successfully.", "item": communication}
