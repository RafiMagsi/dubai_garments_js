from __future__ import annotations

import json
import smtplib
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, Optional
from uuid import uuid4

import httpx
from fastapi import HTTPException
from psycopg import Connection

from app.core.config import (
    EMAIL_ENABLED,
    EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME,
    EMAIL_PROVIDER,
    RESEND_API_KEY,
    SENDGRID_API_KEY,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_PORT,
    SMTP_STARTTLS,
    SMTP_USERNAME,
)


def _format_sender() -> str:
    if EMAIL_FROM_NAME.strip():
        return f"{EMAIL_FROM_NAME.strip()} <{EMAIL_FROM_ADDRESS.strip()}>"
    return EMAIL_FROM_ADDRESS.strip()


def _send_via_log(
    recipient_email: str,
    subject: str,
    text_body: str,
    html_body: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "provider": "log",
        "accepted": True,
        "messageId": f"log-{uuid4()}",
        "response": {
            "recipient": recipient_email,
            "subject": subject,
            "textLength": len(text_body or ""),
            "htmlLength": len(html_body or ""),
        },
    }


def _send_via_resend(
    recipient_email: str,
    subject: str,
    text_body: str,
    html_body: Optional[str] = None,
) -> Dict[str, Any]:
    if not RESEND_API_KEY:
        raise HTTPException(status_code=500, detail="RESEND_API_KEY is not configured.")

    payload: Dict[str, Any] = {
        "from": _format_sender(),
        "to": [recipient_email],
        "subject": subject,
        "text": text_body,
    }
    if html_body:
        payload["html"] = html_body

    response = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
        json=payload,
        timeout=15.0,
    )
    if response.status_code >= 300:
        raise HTTPException(
            status_code=502,
            detail=f"Resend API error: {response.status_code} {response.text}",
        )
    data = response.json()
    return {
        "provider": "resend",
        "accepted": True,
        "messageId": data.get("id"),
        "response": data,
    }


def _send_via_sendgrid(
    recipient_email: str,
    subject: str,
    text_body: str,
    html_body: Optional[str] = None,
) -> Dict[str, Any]:
    if not SENDGRID_API_KEY:
        raise HTTPException(status_code=500, detail="SENDGRID_API_KEY is not configured.")

    content = [{"type": "text/plain", "value": text_body}]
    if html_body:
        content.append({"type": "text/html", "value": html_body})

    payload = {
        "personalizations": [{"to": [{"email": recipient_email}]}],
        "from": {"email": EMAIL_FROM_ADDRESS, "name": EMAIL_FROM_NAME or None},
        "subject": subject,
        "content": content,
    }

    response = httpx.post(
        "https://api.sendgrid.com/v3/mail/send",
        headers={"Authorization": f"Bearer {SENDGRID_API_KEY}", "Content-Type": "application/json"},
        json=payload,
        timeout=15.0,
    )
    if response.status_code >= 300:
        raise HTTPException(
            status_code=502,
            detail=f"SendGrid API error: {response.status_code} {response.text}",
        )
    return {
        "provider": "sendgrid",
        "accepted": True,
        "messageId": response.headers.get("X-Message-Id"),
        "response": {"statusCode": response.status_code},
    }


def _send_via_smtp(
    recipient_email: str,
    subject: str,
    text_body: str,
    html_body: Optional[str] = None,
) -> Dict[str, Any]:
    if not SMTP_HOST:
        raise HTTPException(status_code=500, detail="SMTP_HOST is not configured.")

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = _format_sender()
    message["To"] = recipient_email
    message.attach(MIMEText(text_body, "plain", "utf-8"))
    if html_body:
        message.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        if SMTP_STARTTLS:
            smtp.starttls()
        if SMTP_USERNAME:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.sendmail(EMAIL_FROM_ADDRESS, [recipient_email], message.as_string())

    return {
        "provider": "smtp",
        "accepted": True,
        "messageId": f"smtp-{uuid4()}",
        "response": {"statusCode": 250},
    }


def send_email(
    recipient_email: str,
    subject: str,
    text_body: str,
    html_body: Optional[str] = None,
) -> Dict[str, Any]:
    if not EMAIL_ENABLED:
        return _send_via_log(recipient_email, subject, text_body, html_body)

    provider = EMAIL_PROVIDER.strip().lower()
    if provider == "resend":
        return _send_via_resend(recipient_email, subject, text_body, html_body)
    if provider == "sendgrid":
        return _send_via_sendgrid(recipient_email, subject, text_body, html_body)
    if provider == "smtp":
        return _send_via_smtp(recipient_email, subject, text_body, html_body)
    return _send_via_log(recipient_email, subject, text_body, html_body)


def create_automation_run(
    connection: Connection,
    workflow_name: str,
    trigger_source: str,
    trigger_entity_type: str,
    trigger_entity_id: Optional[str],
    request_payload: Dict[str, Any],
) -> Optional[str]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO automation_runs (
              workflow_name,
              trigger_source,
              trigger_entity_type,
              trigger_entity_id,
              status,
              request_payload,
              started_at
            )
            VALUES (%s, %s, %s, %s::uuid, 'running', %s::jsonb, %s)
            RETURNING id::text
            """,
            (
                workflow_name,
                trigger_source,
                trigger_entity_type,
                trigger_entity_id,
                json.dumps(request_payload),
                datetime.now(timezone.utc),
            ),
        )
        row = cursor.fetchone()
    return row["id"] if row else None


def finish_automation_run(
    connection: Connection,
    run_id: Optional[str],
    status: str,
    response_payload: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
) -> None:
    if not run_id:
        return
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE automation_runs
            SET
              status = %s,
              response_payload = %s::jsonb,
              error_message = %s,
              finished_at = NOW()
            WHERE id = %s::uuid
            """,
            (
                status,
                json.dumps(response_payload or {}),
                error_message,
                run_id,
            ),
        )


def build_quote_sent_email(
    quote_number: str,
    company_name: str,
    total_amount: float,
    currency: str,
    valid_until: Optional[str],
) -> Dict[str, str]:
    subject = f"Your Quote {quote_number} from Dubai Garments"
    text = (
        f"Hello {company_name or 'Customer'},\n\n"
        f"Your quote {quote_number} is ready.\n"
        f"Total: {currency} {total_amount:.2f}\n"
        f"Valid until: {valid_until or 'As per terms'}\n\n"
        "Please reply to this email if you would like to proceed.\n\n"
        "Dubai Garments Sales Team"
    )
    html = (
        f"<p>Hello {company_name or 'Customer'},</p>"
        f"<p>Your quote <strong>{quote_number}</strong> is ready.</p>"
        f"<p><strong>Total:</strong> {currency} {total_amount:.2f}<br/>"
        f"<strong>Valid until:</strong> {valid_until or 'As per terms'}</p>"
        "<p>Please reply to this email if you would like to proceed.</p>"
        "<p>Dubai Garments Sales Team</p>"
    )
    return {"subject": subject, "text": text, "html": html}


def build_followup_email(deal_title: str, stage: str) -> Dict[str, str]:
    label = stage.capitalize()
    subject = f"Follow-up: {deal_title}"
    text = (
        "Hello,\n\n"
        f"We are following up regarding \"{deal_title}\" currently in {label} stage.\n"
        "Let us know if you need any updates, revisions, or support.\n\n"
        "Dubai Garments Sales Team"
    )
    html = (
        "<p>Hello,</p>"
        f"<p>We are following up regarding <strong>{deal_title}</strong> currently in <strong>{label}</strong> stage.</p>"
        "<p>Let us know if you need any updates, revisions, or support.</p>"
        "<p>Dubai Garments Sales Team</p>"
    )
    return {"subject": subject, "text": text, "html": html}


def build_lead_notification_email(
    lead_code: str,
    contact_name: str,
    company_name: str,
    product: str,
    quantity: int,
) -> Dict[str, str]:
    subject = f"New Lead Received: {lead_code}"
    text = (
        "A new lead has been created.\n\n"
        f"Lead Code: {lead_code}\n"
        f"Contact: {contact_name}\n"
        f"Company: {company_name}\n"
        f"Product: {product}\n"
        f"Quantity: {quantity}\n"
    )
    html = (
        "<p>A new lead has been created.</p>"
        f"<p><strong>Lead Code:</strong> {lead_code}<br/>"
        f"<strong>Contact:</strong> {contact_name}<br/>"
        f"<strong>Company:</strong> {company_name}<br/>"
        f"<strong>Product:</strong> {product}<br/>"
        f"<strong>Quantity:</strong> {quantity}</p>"
    )
    return {"subject": subject, "text": text, "html": html}
