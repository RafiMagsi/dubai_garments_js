from __future__ import annotations

from typing import Dict, Optional

from fastapi import APIRouter, Header, HTTPException

from app.core.config import AUTOMATION_SHARED_SECRET
from app.core.db import get_db_connection
from app.schemas.followups import QuoteFollowupDispatchRequest
from app.services.activities import create_activity
from app.services.email import (
    build_quote_followup_email,
    create_automation_run,
    finish_automation_run,
    send_email,
)

router = APIRouter(prefix="/api/v1", tags=["followups"])
ALLOWED_STEPS = {"day_2", "day_5", "day_10"}


def _enforce_automation_token(token: Optional[str]) -> None:
    expected = AUTOMATION_SHARED_SECRET.strip()
    if not expected:
        return
    if not token or token.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid automation token.")


@router.post("/automation/followups/dispatch")
def dispatch_quote_followup(
    payload: QuoteFollowupDispatchRequest,
    x_automation_token: Optional[str] = Header(default=None),
) -> Dict[str, object]:
    _enforce_automation_token(x_automation_token)
    step = payload.step.strip().lower()
    if step not in ALLOWED_STEPS:
        raise HTTPException(status_code=422, detail="Invalid step. Allowed: day_2, day_5, day_10.")

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      q.id::text,
                      q.quote_number,
                      q.customer_id::text,
                      q.lead_id::text,
                      q.deal_id::text,
                      q.currency,
                      q.total_amount::float8 AS total_amount,
                      c.email AS customer_email,
                      c.company_name AS customer_company,
                      l.email AS lead_email,
                      l.company_name AS lead_company
                    FROM quotes q
                    LEFT JOIN customers c ON c.id = q.customer_id
                    LEFT JOIN leads l ON l.id = q.lead_id
                    WHERE q.id = %s::uuid
                    """,
                    (payload.quote_id,),
                )
                quote = cursor.fetchone()
                if not quote:
                    raise HTTPException(status_code=404, detail="Quote not found.")

                recipient_email = (quote.get("customer_email") or quote.get("lead_email") or "").strip()
                company_name = quote.get("customer_company") or quote.get("lead_company") or "Customer"
                if not recipient_email:
                    raise HTTPException(status_code=422, detail="No recipient email found for quote.")

                quote_number = quote.get("quote_number") or quote["id"][:8].upper()
                template = build_quote_followup_email(
                    quote_number=quote_number,
                    company_name=company_name,
                    step=step,
                    total_amount=float(quote.get("total_amount") or 0.0),
                    currency=quote.get("currency") or "AED",
                )

                cursor.execute(
                    """
                    SELECT id::text
                    FROM communications
                    WHERE quote_id = %s::uuid
                      AND channel = 'email'
                      AND direction = 'outbound'
                      AND subject = %s
                    LIMIT 1
                    """,
                    (payload.quote_id, template["subject"]),
                )
                existing = cursor.fetchone()
                if existing:
                    return {
                        "ok": True,
                        "skipped": True,
                        "reason": "already_sent",
                        "communicationId": existing["id"],
                    }

                run_id = create_automation_run(
                    connection=connection,
                    workflow_name="quote_followup_dispatch",
                    trigger_source="automation",
                    trigger_entity_type="quote",
                    trigger_entity_id=payload.quote_id,
                    request_payload={"quoteId": payload.quote_id, "step": step, "recipientEmail": recipient_email},
                )

                delivery = send_email(
                    recipient_email=recipient_email,
                    subject=template["subject"],
                    text_body=template["text"],
                    html_body=template["html"],
                )

                cursor.execute(
                    """
                    INSERT INTO communications (
                      customer_id,
                      lead_id,
                      deal_id,
                      quote_id,
                      channel,
                      direction,
                      subject,
                      message_text,
                      external_message_id,
                      sent_at
                    )
                    VALUES (
                      %s::uuid,
                      %s::uuid,
                      %s::uuid,
                      %s::uuid,
                      'email',
                      'outbound',
                      %s,
                      %s,
                      %s,
                      NOW()
                    )
                    RETURNING id::text
                    """,
                    (
                        quote.get("customer_id"),
                        quote.get("lead_id"),
                        quote.get("deal_id"),
                        payload.quote_id,
                        template["subject"],
                        f"To: {recipient_email}\n\n{template['text']}",
                        delivery.get("messageId"),
                    ),
                )
                communication = cursor.fetchone()

                cursor.execute(
                    """
                    INSERT INTO followups (
                      customer_id,
                      lead_id,
                      deal_id,
                      quote_id,
                      status,
                      priority,
                      channel,
                      subject,
                      notes,
                      due_at,
                      completed_at
                    )
                    VALUES (
                      %s::uuid,
                      %s::uuid,
                      %s::uuid,
                      %s::uuid,
                      'completed',
                      'high',
                      'email',
                      %s,
                      %s,
                      NOW(),
                      NOW()
                    )
                    """,
                    (
                        quote.get("customer_id"),
                        quote.get("lead_id"),
                        quote.get("deal_id"),
                        payload.quote_id,
                        template["subject"],
                        f"Automated quote follow-up sent for {step}.",
                    ),
                )

                create_activity(
                    connection=connection,
                    activity_type="followup_triggered",
                    title="Quote follow-up triggered",
                    customer_id=quote.get("customer_id"),
                    lead_id=quote.get("lead_id"),
                    deal_id=quote.get("deal_id"),
                    quote_id=payload.quote_id,
                    details=f"Automated {step} follow-up sent to {recipient_email}.",
                    metadata={"step": step, "provider": delivery.get("provider")},
                )
                create_activity(
                    connection=connection,
                    activity_type="email_sent",
                    title="Follow-up email sent",
                    customer_id=quote.get("customer_id"),
                    lead_id=quote.get("lead_id"),
                    deal_id=quote.get("deal_id"),
                    quote_id=payload.quote_id,
                    details=f"Follow-up email ({step}) sent to {recipient_email}.",
                    metadata={"step": step, "provider": delivery.get("provider")},
                )
                finish_automation_run(
                    connection=connection,
                    run_id=run_id,
                    status="success",
                    response_payload={
                        "step": step,
                        "recipientEmail": recipient_email,
                        "provider": delivery.get("provider"),
                        "messageId": delivery.get("messageId"),
                    },
                )
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch follow-up: {error}") from error

    return {
        "ok": True,
        "skipped": False,
        "step": step,
        "message": "Automated follow-up sent.",
        "communicationId": communication["id"] if communication else None,
    }
