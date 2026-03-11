from __future__ import annotations

from typing import Dict

from fastapi import APIRouter, HTTPException

from app.core.db import get_db_connection
from app.schemas.emails import EmailSendRequest
from app.services.activities import create_activity
from app.services.email import create_automation_run, finish_automation_run, send_email

router = APIRouter(prefix="/api/v1", tags=["emails"])


@router.post("/emails/send")
def send_email_route(payload: EmailSendRequest) -> Dict[str, object]:
    recipient_email = payload.recipient_email.strip()
    subject = payload.subject.strip()
    message = payload.message.strip()
    if not recipient_email or not subject or not message:
        raise HTTPException(status_code=422, detail="recipient_email, subject and message are required.")

    run_id = None
    try:
        with get_db_connection() as connection:
            run_id = create_automation_run(
                connection=connection,
                workflow_name="manual_email_dispatch",
                trigger_source="api",
                trigger_entity_type="lead" if payload.lead_id else "deal" if payload.deal_id else "quote" if payload.quote_id else "customer",
                trigger_entity_id=payload.lead_id or payload.deal_id or payload.quote_id or payload.customer_id,
                request_payload={"recipientEmail": recipient_email, "subject": subject},
            )

            delivery = send_email(
                recipient_email=recipient_email,
                subject=subject,
                text_body=message,
                html_body=payload.html or f"<p>{message.replace(chr(10), '<br/>')}</p>",
            )

            with connection.cursor() as cursor:
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
                        payload.customer_id,
                        payload.lead_id,
                        payload.deal_id,
                        payload.quote_id,
                        subject,
                        f"To: {recipient_email}\n\n{message}",
                        delivery.get("messageId"),
                    ),
                )
                communication = cursor.fetchone()

                create_activity(
                    connection=connection,
                    activity_type="email_sent",
                    title="Email sent",
                    customer_id=payload.customer_id,
                    lead_id=payload.lead_id,
                    deal_id=payload.deal_id,
                    quote_id=payload.quote_id,
                    details=f"Email sent to {recipient_email}",
                    metadata={"provider": delivery.get("provider"), "subject": subject},
                )
                finish_automation_run(
                    connection=connection,
                    run_id=run_id,
                    status="success",
                    response_payload={"provider": delivery.get("provider"), "messageId": delivery.get("messageId")},
                )
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        if run_id:
            try:
                with get_db_connection() as connection:
                    finish_automation_run(connection=connection, run_id=run_id, status="failed", error_message=str(error))
                    connection.commit()
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"Failed to send email: {error}") from error

    return {
        "ok": True,
        "message": "Email sent successfully.",
        "communicationId": communication["id"] if communication else None,
    }

