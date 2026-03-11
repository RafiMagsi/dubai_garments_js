from __future__ import annotations

import re
from email.utils import parseaddr
from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException, Request

from app.core.config import ADMIN_NOTIFICATION_EMAIL, SENDGRID_INBOUND_WEBHOOK_TOKEN
from app.core.db import get_db_connection
from app.services.activities import create_activity
from app.services.email import create_automation_run, finish_automation_run, send_email
from app.services.slack import notify_customer_replied as notify_customer_replied_slack
from app.services.telegram import notify_customer_replied as notify_customer_replied_telegram

router = APIRouter(prefix="/api/v1", tags=["webhooks"])

QUOTE_NUMBER_RE = re.compile(r"\bQ-\d{8}-[A-Z0-9]{6}\b")


def _normalize_email(raw: str) -> str:
    _, addr = parseaddr(raw or "")
    return (addr or raw or "").strip().lower()


def _extract_quote_number(subject: str) -> Optional[str]:
    match = QUOTE_NUMBER_RE.search(subject or "")
    return match.group(0) if match else None


def _get_header(request: Request, name: str) -> Optional[str]:
    value = request.headers.get(name)
    return value.strip() if value else None


def _validate_inbound_token(request: Request, token_header: Optional[str]) -> None:
    expected = SENDGRID_INBOUND_WEBHOOK_TOKEN.strip()
    if not expected:
        return
    candidate = token_header or _get_header(request, "x-sendgrid-inbound-token")
    if not candidate:
        auth = _get_header(request, "authorization") or ""
        if auth.lower().startswith("bearer "):
            candidate = auth[7:].strip()
    if candidate != expected:
        raise HTTPException(status_code=401, detail="Invalid inbound webhook token.")


@router.post("/webhooks/sendgrid/inbound")
async def sendgrid_inbound_webhook(
    request: Request,
    x_sendgrid_inbound_token: Optional[str] = Header(default=None),
) -> Dict[str, object]:
    _validate_inbound_token(request, x_sendgrid_inbound_token)

    content_type = (request.headers.get("content-type") or "").lower()
    payload: Dict[str, Any] = {}
    if "application/json" in content_type:
        parsed = await request.json()
        if isinstance(parsed, dict):
            payload = parsed
    else:
        form = await request.form()
        payload = dict(form)

    sender_email = _normalize_email(str(payload.get("from") or payload.get("sender") or ""))
    recipient_email = _normalize_email(str(payload.get("to") or ""))
    subject = str(payload.get("subject") or "").strip()
    text_body = str(
        payload.get("text")
        or payload.get("stripped-text")
        or payload.get("body-plain")
        or ""
    ).strip()
    html_body = str(payload.get("html") or payload.get("body-html") or "").strip()
    message_text = text_body or html_body or "(no content)"
    message_id = str(
        payload.get("message_id")
        or payload.get("Message-Id")
        or payload.get("message-id")
        or ""
    ).strip() or None

    if not sender_email:
        raise HTTPException(status_code=422, detail="Inbound sender email is required.")

    quote_number = _extract_quote_number(subject)

    try:
        with get_db_connection() as connection:
            run_id = create_automation_run(
                connection=connection,
                workflow_name="email_reply_detection",
                trigger_source="webhook",
                trigger_entity_type="communication",
                trigger_entity_id=None,
                request_payload={
                    "provider": "sendgrid",
                    "senderEmail": sender_email,
                    "recipientEmail": recipient_email,
                    "subject": subject,
                },
            )
            with connection.cursor() as cursor:
                customer_id = None
                lead_id = None
                deal_id = None
                quote_id = None

                if quote_number:
                    cursor.execute(
                        """
                        SELECT
                          id::text,
                          customer_id::text,
                          lead_id::text,
                          deal_id::text
                        FROM quotes
                        WHERE quote_number = %s
                        """,
                        (quote_number,),
                    )
                    quote = cursor.fetchone()
                    if quote:
                        quote_id = quote.get("id")
                        customer_id = quote.get("customer_id")
                        lead_id = quote.get("lead_id")
                        deal_id = quote.get("deal_id")

                if not customer_id and sender_email:
                    cursor.execute(
                        "SELECT id::text FROM customers WHERE LOWER(email) = %s LIMIT 1",
                        (sender_email,),
                    )
                    customer = cursor.fetchone()
                    customer_id = (customer or {}).get("id")

                if not lead_id and sender_email:
                    cursor.execute(
                        """
                        SELECT id::text, customer_id::text
                        FROM leads
                        WHERE LOWER(email) = %s
                        ORDER BY updated_at DESC
                        LIMIT 1
                        """,
                        (sender_email,),
                    )
                    lead = cursor.fetchone()
                    if lead:
                        lead_id = lead.get("id")
                        customer_id = customer_id or lead.get("customer_id")

                if not any([customer_id, lead_id, deal_id, quote_id]):
                    cursor.execute(
                        """
                        SELECT
                          customer_id::text,
                          lead_id::text,
                          deal_id::text,
                          quote_id::text
                        FROM communications
                        WHERE channel = 'email'
                          AND direction = 'outbound'
                          AND message_text ILIKE %s
                        ORDER BY sent_at DESC NULLS LAST, created_at DESC
                        LIMIT 1
                        """,
                        (f"%To: {sender_email}%",),
                    )
                    comm = cursor.fetchone()
                    if comm:
                        customer_id = comm.get("customer_id")
                        lead_id = comm.get("lead_id")
                        deal_id = comm.get("deal_id")
                        quote_id = comm.get("quote_id")

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
                      'inbound',
                      %s,
                      %s,
                      %s,
                      NOW()
                    )
                    RETURNING id::text
                    """,
                    (
                        customer_id,
                        lead_id,
                        deal_id,
                        quote_id,
                        subject or f"Reply from {sender_email}",
                        f"From: {sender_email}\n\n{message_text}",
                        message_id,
                    ),
                )
                communication = cursor.fetchone()
                communication_id = communication["id"] if communication else None

                cursor.execute(
                    """
                    UPDATE followups
                    SET
                      status = 'cancelled',
                      notes = CONCAT(
                        COALESCE(notes, ''),
                        CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n' END,
                        'Paused automatically after customer reply.'
                      ),
                      updated_at = NOW()
                    WHERE status IN ('pending', 'in_progress')
                      AND (
                        (%s::uuid IS NOT NULL AND quote_id = %s::uuid)
                        OR (%s::uuid IS NOT NULL AND deal_id = %s::uuid)
                        OR (%s::uuid IS NOT NULL AND lead_id = %s::uuid)
                        OR (%s::uuid IS NOT NULL AND customer_id = %s::uuid)
                      )
                    """,
                    (
                        quote_id,
                        quote_id,
                        deal_id,
                        deal_id,
                        lead_id,
                        lead_id,
                        customer_id,
                        customer_id,
                    ),
                )
                paused_followups = cursor.rowcount or 0

                create_activity(
                    connection=connection,
                    activity_type="customer_replied",
                    title="Customer replied",
                    customer_id=customer_id,
                    lead_id=lead_id,
                    deal_id=deal_id,
                    quote_id=quote_id,
                    details=f"Inbound email received from {sender_email}.",
                    metadata={
                        "subject": subject,
                        "provider": "sendgrid",
                        "pausedFollowups": paused_followups,
                    },
                )

                notification_sent = False
                if ADMIN_NOTIFICATION_EMAIL.strip():
                    notification_subject = f"Customer Reply Detected: {subject or sender_email}"
                    notification_text = (
                        "A customer replied by email.\n\n"
                        f"From: {sender_email}\n"
                        f"To: {recipient_email or '-'}\n"
                        f"Subject: {subject or '-'}\n"
                        f"Paused follow-ups: {paused_followups}\n\n"
                        f"Message:\n{message_text[:2000]}"
                    )
                    delivery = send_email(
                        recipient_email=ADMIN_NOTIFICATION_EMAIL.strip(),
                        subject=notification_subject,
                        text_body=notification_text,
                        html_body=None,
                    )
                    notification_sent = True
                    create_activity(
                        connection=connection,
                        activity_type="email_sent",
                        title="Sales rep notified",
                        customer_id=customer_id,
                        lead_id=lead_id,
                        deal_id=deal_id,
                        quote_id=quote_id,
                        details=f"Reply notification sent to {ADMIN_NOTIFICATION_EMAIL.strip()}",
                        metadata={"provider": delivery.get("provider")},
                    )

                finish_automation_run(
                    connection=connection,
                    run_id=run_id,
                    status="success",
                    response_payload={
                        "communicationId": communication_id,
                        "pausedFollowups": paused_followups,
                        "notificationSent": notification_sent,
                    },
                )
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to process inbound email webhook: {error}") from error

    notify_customer_replied_slack(
        sender_email=sender_email,
        subject=subject,
        paused_followups=paused_followups,
        quote_id=quote_id,
        lead_id=lead_id,
        deal_id=deal_id,
    )
    notify_customer_replied_telegram(
        sender_email=sender_email,
        subject=subject,
        paused_followups=paused_followups,
        quote_id=quote_id,
        lead_id=lead_id,
        deal_id=deal_id,
    )

    return {
        "ok": True,
        "message": "Inbound reply logged.",
        "senderEmail": sender_email,
        "pausedFollowups": paused_followups,
        "communicationId": communication_id,
    }
