from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

import httpx

from app.core.config import (
    SLACK_BOT_TOKEN,
    SLACK_CHANNEL,
    SLACK_ENABLED,
    SLACK_WEBHOOK_URL,
)

logger = logging.getLogger("uvicorn.error")


def _log_event(event: str, **fields: Any) -> None:
    payload = {"event": event, **fields}
    logger.info(json.dumps(payload, default=str))


def send_slack_message(text: str) -> Dict[str, Any]:
    if not SLACK_ENABLED:
        return {"ok": False, "skipped": True, "reason": "slack_disabled"}

    if SLACK_WEBHOOK_URL.strip():
        response = httpx.post(
            SLACK_WEBHOOK_URL.strip(),
            json={"text": text},
            timeout=10.0,
        )
        if response.status_code >= 300:
            return {"ok": False, "statusCode": response.status_code, "responseText": response.text}
        return {"ok": True, "provider": "webhook"}

    if SLACK_BOT_TOKEN.strip():
        if not SLACK_CHANNEL.strip():
            return {"ok": False, "reason": "missing_slack_channel_for_bot_token"}
        response = httpx.post(
            "https://slack.com/api/chat.postMessage",
            headers={
                "Authorization": f"Bearer {SLACK_BOT_TOKEN.strip()}",
                "Content-Type": "application/json; charset=utf-8",
            },
            json={"channel": SLACK_CHANNEL.strip(), "text": text},
            timeout=10.0,
        )
        if response.status_code >= 300:
            return {"ok": False, "statusCode": response.status_code, "responseText": response.text}
        body = response.json()
        return {"ok": bool(body.get("ok")), "provider": "bot", "response": body}

    return {"ok": False, "skipped": True, "reason": "missing_slack_configuration"}


def _safe_send(text: str) -> None:
    try:
        result = send_slack_message(text)
        _log_event("slack_notify_result", result=result)
    except Exception as error:
        _log_event("slack_notify_failed", error=str(error))


def notify_hot_lead(lead_id: str, company_name: str, contact_name: str, ai_score: Optional[int]) -> None:
    _safe_send(
        "\n".join(
            [
                ":fire: *New HOT Lead Detected*",
                f"Lead: `{lead_id}`",
                f"Company: {company_name or '-'}",
                f"Contact: {contact_name or '-'}",
                f"AI Score: {ai_score if ai_score is not None else '-'}",
            ]
        )
    )


def notify_quote_accepted(
    quote_id: str,
    quote_number: str,
    total_amount: float,
    currency: str,
) -> None:
    _safe_send(
        "\n".join(
            [
                ":white_check_mark: *Quote Accepted*",
                f"Quote: `{quote_number or quote_id}`",
                f"Quote ID: `{quote_id}`",
                f"Total: {currency} {total_amount:.2f}",
            ]
        )
    )


def notify_customer_replied(
    sender_email: str,
    subject: str,
    paused_followups: int,
    quote_id: Optional[str] = None,
    lead_id: Optional[str] = None,
    deal_id: Optional[str] = None,
) -> None:
    _safe_send(
        "\n".join(
            [
                ":incoming_envelope: *Customer Replied*",
                f"From: {sender_email}",
                f"Subject: {subject or '-'}",
                f"Paused Follow-ups: {paused_followups}",
                f"Quote: {quote_id or '-'}",
                f"Lead: {lead_id or '-'}",
                f"Deal: {deal_id or '-'}",
            ]
        )
    )


def notify_automation_error(
    workflow_name: str,
    error_message: str,
    trigger_entity_type: Optional[str] = None,
    trigger_entity_id: Optional[str] = None,
) -> None:
    _safe_send(
        "\n".join(
            [
                ":warning: *Automation Error*",
                f"Workflow: `{workflow_name}`",
                f"Entity: {trigger_entity_type or '-'} {trigger_entity_id or '-'}",
                f"Error: {error_message[:1200]}",
            ]
        )
    )
