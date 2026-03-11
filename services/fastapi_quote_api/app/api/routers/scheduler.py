from __future__ import annotations

from typing import Dict, Optional

from fastapi import APIRouter, Header, HTTPException

from app.core.config import (
    ADMIN_NOTIFICATION_EMAIL,
    AUTOMATION_SHARED_SECRET,
    COLD_LEAD_THRESHOLD_DAYS,
    SCHEDULER_FOLLOWUP_BATCH_SIZE,
)
from app.core.db import get_db_connection
from app.schemas.scheduler import (
    ColdLeadDetectionRequest,
    DigestReportRequest,
    FollowupSweepRequest,
)
from app.services.activities import create_activity
from app.services.email import create_automation_run, finish_automation_run, send_email

router = APIRouter(prefix="/api/v1", tags=["scheduler"])


def _enforce_automation_token(token: Optional[str]) -> None:
    expected = AUTOMATION_SHARED_SECRET.strip()
    if not expected:
        return
    if not token or token.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid automation token.")


@router.post("/automation/scheduler/followups/run")
def run_followup_sweep(
    payload: FollowupSweepRequest,
    x_automation_token: Optional[str] = Header(default=None),
) -> Dict[str, object]:
    _enforce_automation_token(x_automation_token)
    batch_limit = payload.limit or SCHEDULER_FOLLOWUP_BATCH_SIZE
    if batch_limit <= 0:
        raise HTTPException(status_code=422, detail="limit must be greater than 0.")

    with get_db_connection() as connection:
        run_id = create_automation_run(
            connection=connection,
            workflow_name="scheduler_followup_sweep",
            trigger_source="cron",
            trigger_entity_type="followup",
            trigger_entity_id=None,
            request_payload={"limit": batch_limit},
        )
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      f.id::text,
                      f.customer_id::text,
                      f.lead_id::text,
                      f.deal_id::text,
                      f.quote_id::text,
                      f.subject,
                      f.notes,
                      c.email AS customer_email,
                      c.company_name AS customer_company_name,
                      l.email AS lead_email,
                      l.company_name AS lead_company_name
                    FROM followups f
                    LEFT JOIN customers c ON c.id = f.customer_id
                    LEFT JOIN leads l ON l.id = f.lead_id
                    WHERE f.status = 'pending'
                      AND COALESCE(f.channel, 'email') = 'email'
                      AND f.due_at <= NOW()
                    ORDER BY f.due_at ASC
                    LIMIT %s
                    """,
                    (batch_limit,),
                )
                due_followups = cursor.fetchall()

            processed = 0
            skipped = 0
            for followup in due_followups:
                recipient_email = (
                    followup.get("customer_email")
                    or followup.get("lead_email")
                    or ""
                ).strip()
                if not recipient_email:
                    skipped += 1
                    continue

                company_name = (
                    followup.get("customer_company_name")
                    or followup.get("lead_company_name")
                    or "Customer"
                )
                subject = followup.get("subject") or "Follow-up Reminder"
                notes = followup.get("notes") or "Friendly reminder from Dubai Garments."
                text_body = (
                    f"Hello {company_name},\n\n"
                    f"{notes}\n\n"
                    "Please reply to this email if you need support.\n\n"
                    "Dubai Garments Sales Team"
                )
                html_body = (
                    f"<p>Hello {company_name},</p>"
                    f"<p>{notes}</p>"
                    "<p>Please reply to this email if you need support.</p>"
                    "<p>Dubai Garments Sales Team</p>"
                )

                delivery = send_email(
                    recipient_email=recipient_email,
                    subject=subject,
                    text_body=text_body,
                    html_body=html_body,
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
                        """,
                        (
                            followup.get("customer_id"),
                            followup.get("lead_id"),
                            followup.get("deal_id"),
                            followup.get("quote_id"),
                            subject,
                            f"To: {recipient_email}\n\n{text_body}",
                            delivery.get("messageId"),
                        ),
                    )
                    cursor.execute(
                        """
                        UPDATE followups
                        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
                        WHERE id = %s::uuid
                        """,
                        (followup["id"],),
                    )
                    create_activity(
                        connection=connection,
                        activity_type="followup_triggered",
                        title="Scheduled follow-up triggered",
                        customer_id=followup.get("customer_id"),
                        lead_id=followup.get("lead_id"),
                        deal_id=followup.get("deal_id"),
                        quote_id=followup.get("quote_id"),
                        details=f"Scheduler sent follow-up to {recipient_email}.",
                        metadata={"provider": delivery.get("provider"), "channel": "email"},
                    )
                    create_activity(
                        connection=connection,
                        activity_type="email_sent",
                        title="Scheduled follow-up email sent",
                        customer_id=followup.get("customer_id"),
                        lead_id=followup.get("lead_id"),
                        deal_id=followup.get("deal_id"),
                        quote_id=followup.get("quote_id"),
                        details=f"Follow-up email sent to {recipient_email}.",
                        metadata={"provider": delivery.get("provider"), "channel": "email"},
                    )
                processed += 1

            finish_automation_run(
                connection=connection,
                run_id=run_id,
                status="success",
                response_payload={
                    "scanned": len(due_followups),
                    "processed": processed,
                    "skipped": skipped,
                },
            )
            connection.commit()
            return {
                "ok": True,
                "scanned": len(due_followups),
                "processed": processed,
                "skipped": skipped,
            }
        except Exception as error:
            connection.rollback()
            with connection.cursor() as cursor:
                # Mark running automation as failed even after rollback.
                finish_automation_run(
                    connection=connection,
                    run_id=run_id,
                    status="failed",
                    error_message=str(error),
                )
            connection.commit()
            raise HTTPException(status_code=500, detail=f"Failed to run follow-up sweep: {error}") from error


@router.post("/automation/scheduler/digest/run")
def run_digest_report(
    payload: DigestReportRequest,
    x_automation_token: Optional[str] = Header(default=None),
) -> Dict[str, object]:
    _enforce_automation_token(x_automation_token)
    recipient_email = (payload.recipient_email or ADMIN_NOTIFICATION_EMAIL).strip()
    if not recipient_email:
        return {"ok": True, "skipped": True, "reason": "missing_digest_recipient"}

    with get_db_connection() as connection:
        run_id = create_automation_run(
            connection=connection,
            workflow_name="scheduler_digest_report",
            trigger_source="cron",
            trigger_entity_type="system",
            trigger_entity_id=None,
            request_payload={"recipientEmail": recipient_email},
        )
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*)::int AS count FROM leads WHERE created_at >= NOW() - INTERVAL '1 day'")
                leads_last_24h = cursor.fetchone()["count"]
                cursor.execute("SELECT COUNT(*)::int AS count FROM quotes WHERE sent_at IS NOT NULL AND sent_at >= NOW() - INTERVAL '1 day'")
                quotes_sent_last_24h = cursor.fetchone()["count"]
                cursor.execute("SELECT COUNT(*)::int AS count FROM deals WHERE won_at IS NOT NULL AND won_at >= NOW() - INTERVAL '1 day'")
                deals_won_last_24h = cursor.fetchone()["count"]
                cursor.execute("SELECT COUNT(*)::int AS count FROM followups WHERE status = 'pending'")
                pending_followups = cursor.fetchone()["count"]
                cursor.execute(
                    """
                    SELECT COUNT(*)::int AS count
                    FROM leads
                    WHERE status IN ('new', 'qualified', 'quoted')
                      AND updated_at <= NOW() - (%s || ' days')::interval
                    """,
                    (COLD_LEAD_THRESHOLD_DAYS,),
                )
                cold_leads = cursor.fetchone()["count"]

            subject = "Daily Sales Automation Digest"
            text = (
                "Daily Digest\n\n"
                f"Leads (24h): {leads_last_24h}\n"
                f"Quotes sent (24h): {quotes_sent_last_24h}\n"
                f"Deals won (24h): {deals_won_last_24h}\n"
                f"Pending follow-ups: {pending_followups}\n"
                f"Cold leads (>{COLD_LEAD_THRESHOLD_DAYS} days): {cold_leads}\n"
            )
            html = (
                "<p><strong>Daily Digest</strong></p>"
                f"<p>Leads (24h): {leads_last_24h}<br/>"
                f"Quotes sent (24h): {quotes_sent_last_24h}<br/>"
                f"Deals won (24h): {deals_won_last_24h}<br/>"
                f"Pending follow-ups: {pending_followups}<br/>"
                f"Cold leads (&gt;{COLD_LEAD_THRESHOLD_DAYS} days): {cold_leads}</p>"
            )
            delivery = send_email(
                recipient_email=recipient_email,
                subject=subject,
                text_body=text,
                html_body=html,
            )

            create_activity(
                connection=connection,
                activity_type="email_sent",
                title="Digest report sent",
                details=f"Daily digest sent to {recipient_email}.",
                metadata={"provider": delivery.get("provider")},
            )
            finish_automation_run(
                connection=connection,
                run_id=run_id,
                status="success",
                response_payload={
                    "recipientEmail": recipient_email,
                    "provider": delivery.get("provider"),
                    "leads24h": leads_last_24h,
                    "quotesSent24h": quotes_sent_last_24h,
                    "dealsWon24h": deals_won_last_24h,
                    "pendingFollowups": pending_followups,
                    "coldLeads": cold_leads,
                },
            )
            connection.commit()
            return {
                "ok": True,
                "recipientEmail": recipient_email,
                "leads24h": leads_last_24h,
                "quotesSent24h": quotes_sent_last_24h,
                "dealsWon24h": deals_won_last_24h,
                "pendingFollowups": pending_followups,
                "coldLeads": cold_leads,
            }
        except Exception as error:
            connection.rollback()
            finish_automation_run(
                connection=connection,
                run_id=run_id,
                status="failed",
                error_message=str(error),
            )
            connection.commit()
            raise HTTPException(status_code=500, detail=f"Failed to send digest report: {error}") from error


@router.post("/automation/scheduler/cold-leads/run")
def run_cold_lead_detection(
    payload: ColdLeadDetectionRequest,
    x_automation_token: Optional[str] = Header(default=None),
) -> Dict[str, object]:
    _enforce_automation_token(x_automation_token)
    threshold_days = payload.threshold_days or COLD_LEAD_THRESHOLD_DAYS
    limit = payload.limit or 200
    if threshold_days <= 0:
        raise HTTPException(status_code=422, detail="threshold_days must be greater than 0.")

    with get_db_connection() as connection:
        run_id = create_automation_run(
            connection=connection,
            workflow_name="scheduler_cold_lead_detection",
            trigger_source="cron",
            trigger_entity_type="lead",
            trigger_entity_id=None,
            request_payload={"thresholdDays": threshold_days, "limit": limit},
        )
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                      l.id::text,
                      l.customer_id::text,
                      l.company_name,
                      l.contact_name
                    FROM leads l
                    WHERE l.status IN ('new', 'qualified', 'quoted')
                      AND l.updated_at <= NOW() - (%s || ' days')::interval
                      AND NOT EXISTS (
                        SELECT 1
                        FROM followups f
                        WHERE f.lead_id = l.id
                          AND f.status = 'pending'
                          AND f.subject = 'Cold lead re-engagement'
                      )
                    ORDER BY l.updated_at ASC
                    LIMIT %s
                    """,
                    (threshold_days, limit),
                )
                candidates = cursor.fetchall()

                flagged = 0
                for lead in candidates:
                    cursor.execute(
                        """
                        INSERT INTO followups (
                          customer_id,
                          lead_id,
                          status,
                          priority,
                          channel,
                          subject,
                          notes,
                          due_at
                        )
                        VALUES (
                          %s::uuid,
                          %s::uuid,
                          'pending',
                          'high',
                          'email',
                          'Cold lead re-engagement',
                          'Auto-created by scheduler cold lead detection.',
                          NOW() + INTERVAL '1 day'
                        )
                        """,
                        (lead.get("customer_id"), lead["id"]),
                    )
                    cursor.execute(
                        """
                        UPDATE leads
                        SET
                          lead_score = GREATEST(0, COALESCE(lead_score, 0) - 10),
                          notes = CONCAT(COALESCE(notes, ''), CASE WHEN COALESCE(notes, '') = '' THEN '' ELSE E'\n' END, 'Cold lead detected by scheduler.'),
                          updated_at = NOW()
                        WHERE id = %s::uuid
                        """,
                        (lead["id"],),
                    )
                    create_activity(
                        connection=connection,
                        activity_type="followup_triggered",
                        title="Cold lead detected",
                        customer_id=lead.get("customer_id"),
                        lead_id=lead["id"],
                        details="Cold lead detected and re-engagement follow-up scheduled.",
                        metadata={"thresholdDays": threshold_days},
                    )
                    flagged += 1

            finish_automation_run(
                connection=connection,
                run_id=run_id,
                status="success",
                response_payload={"flagged": flagged, "thresholdDays": threshold_days},
            )
            connection.commit()
            return {"ok": True, "flagged": flagged, "thresholdDays": threshold_days}
        except Exception as error:
            connection.rollback()
            finish_automation_run(
                connection=connection,
                run_id=run_id,
                status="failed",
                error_message=str(error),
            )
            connection.commit()
            raise HTTPException(status_code=500, detail=f"Failed to run cold lead detection: {error}") from error

