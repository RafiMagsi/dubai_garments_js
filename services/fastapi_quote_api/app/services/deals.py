from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Optional

import psycopg
from fastapi import HTTPException

from app.core.config import DEAL_STAGES
from app.services.activities import create_activity
from app.services.email import (
    build_followup_email,
    create_automation_run,
    finish_automation_run,
    send_email,
)


def normalize_stage(stage: str) -> str:
    value = stage.strip().lower()
    if value not in DEAL_STAGES:
        raise HTTPException(
            status_code=422,
            detail=(
                "Invalid stage. Allowed: New, Qualified, Quoted, "
                "Negotiation, Won, Lost."
            ),
        )
    return value


def stage_label(stage: str) -> str:
    return stage.capitalize()


def maybe_schedule_followup(
    connection: psycopg.Connection, deal_id: str, lead_id: Optional[str], stage: str
) -> None:
    now = datetime.now(timezone.utc)

    if stage == "quoted":
        due_at = now + timedelta(days=2)
        subject = "Follow up on quoted deal"
    elif stage == "negotiation":
        due_at = now + timedelta(days=1)
        subject = "Negotiation touchpoint follow-up"
    else:
        return

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO followups (
              lead_id, deal_id, status, priority, channel, subject, notes, due_at
            )
            VALUES (%s, %s, 'pending', 'high', 'email', %s, %s, %s)
            """,
            (
                lead_id,
                deal_id,
                subject,
                f"Auto-created when deal moved to {stage_label(stage)} stage.",
                due_at,
            ),
        )

        cursor.execute(
            """
            INSERT INTO automation_runs (
                workflow_name,
                trigger_source,
                trigger_entity_type,
                trigger_entity_id,
                status,
                request_payload,
                response_payload,
                started_at,
                finished_at
            )
            VALUES (%s, %s, %s, %s::uuid, %s, %s::jsonb, %s::jsonb, %s, %s)
            """,
            (
                "deal_stage_followup",
                "api",
                "deal",
                deal_id,
                "success",
                json.dumps({"dealId": deal_id, "leadId": lead_id, "stage": stage}),
                json.dumps({"followupScheduled": True, "dueAt": due_at.isoformat()}),
                now,
                now,
            ),
        )

        if lead_id:
            cursor.execute(
                """
                SELECT l.email, l.company_name, d.title AS deal_title
                FROM leads l
                LEFT JOIN deals d ON d.id = %s::uuid
                WHERE l.id = %s::uuid
                """,
                (deal_id, lead_id),
            )
            lead = cursor.fetchone()
            recipient_email = (lead or {}).get("email")
            company_name = (lead or {}).get("company_name") or "Customer"
            deal_title = (lead or {}).get("deal_title") or "Deal Follow-up"
            if recipient_email:
                email_payload = build_followup_email(
                    deal_title=deal_title,
                    stage=stage,
                )
                email_run_id = create_automation_run(
                    connection=connection,
                    workflow_name="followup_email_dispatch",
                    trigger_source="automation",
                    trigger_entity_type="deal",
                    trigger_entity_id=deal_id,
                    request_payload={
                        "recipientEmail": recipient_email,
                        "stage": stage,
                    },
                )
                try:
                    delivery = send_email(
                        recipient_email=recipient_email,
                        subject=email_payload["subject"],
                        text_body=email_payload["text"],
                        html_body=email_payload["html"],
                    )
                    cursor.execute(
                        """
                        INSERT INTO communications (
                          customer_id,
                          lead_id,
                          deal_id,
                          channel,
                          direction,
                          subject,
                          message_text,
                          external_message_id,
                          sent_at
                        )
                        VALUES (
                          (SELECT customer_id FROM deals WHERE id = %s::uuid),
                          %s::uuid,
                          %s::uuid,
                          'email',
                          'outbound',
                          %s,
                          %s,
                          %s,
                          NOW()
                        )
                        """,
                        (
                            deal_id,
                            lead_id,
                            deal_id,
                            email_payload["subject"],
                            f"To: {recipient_email}\n\n{email_payload['text']}",
                            delivery.get("messageId"),
                        ),
                    )
                    finish_automation_run(
                        connection=connection,
                        run_id=email_run_id,
                        status="success",
                        response_payload={
                            "provider": delivery.get("provider"),
                            "messageId": delivery.get("messageId"),
                            "companyName": company_name,
                        },
                    )
                    create_activity(
                        connection=connection,
                        activity_type="email_sent",
                        title="Follow-up email sent",
                        lead_id=lead_id,
                        deal_id=deal_id,
                        details=f"Follow-up email sent to {recipient_email}",
                        metadata={"stage": stage, "provider": delivery.get("provider")},
                    )
                except Exception as error:
                    finish_automation_run(
                        connection=connection,
                        run_id=email_run_id,
                        status="failed",
                        error_message=str(error),
                    )

    create_activity(
        connection=connection,
        activity_type="followup_triggered",
        title="Follow-up triggered",
        lead_id=lead_id,
        deal_id=deal_id,
        details=f"Follow-up scheduled automatically for {stage_label(stage)} stage.",
        metadata={"stage": stage},
    )


def update_lead_status_from_deal(
    connection: psycopg.Connection, lead_id: Optional[str], stage: str
) -> None:
    if not lead_id:
        return

    mapped_status = {
        "new": "new",
        "qualified": "qualified",
        "quoted": "quoted",
        "negotiation": "quoted",
        "won": "won",
        "lost": "lost",
    }[stage]

    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE leads
            SET status = %s, updated_at = NOW()
            WHERE id = %s::uuid
            """,
            (mapped_status, lead_id),
        )


def ensure_customer_from_lead(
    connection: psycopg.Connection, lead_id: str
) -> Optional[str]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
              id::text,
              customer_id::text,
              company_name,
              contact_name,
              email,
              phone
            FROM leads
            WHERE id = %s::uuid
            """,
            (lead_id,),
        )
        lead = cursor.fetchone()
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found.")

        if lead["customer_id"]:
            return lead["customer_id"]

        company_name = (lead.get("company_name") or "Unassigned Company").strip()
        contact_name = lead.get("contact_name")
        email = lead.get("email")
        phone = lead.get("phone")

        cursor.execute(
            """
            INSERT INTO customers (company_name, contact_name, email, phone)
            VALUES (%s, %s, %s, %s)
            RETURNING id::text
            """,
            (company_name, contact_name, email, phone),
        )
        customer = cursor.fetchone()
        if not customer:
            raise HTTPException(status_code=500, detail="Failed to create customer.")

        cursor.execute(
            "UPDATE leads SET customer_id = %s::uuid, updated_at = NOW() WHERE id = %s::uuid",
            (customer["id"], lead_id),
        )
        return customer["id"]


def track_deal_activity(
    connection: psycopg.Connection,
    deal_id: str,
    activity_type: str,
    title: str,
    lead_id: Optional[str] = None,
    details: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> None:
    create_activity(
        connection=connection,
        activity_type=activity_type,
        title=title,
        lead_id=lead_id,
        deal_id=deal_id,
        details=details,
        metadata=metadata,
    )
