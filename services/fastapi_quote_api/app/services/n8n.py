from __future__ import annotations

from typing import Any, Dict

import httpx

from app.core.config import (
    AUTOMATION_SHARED_SECRET,
    N8N_FOLLOWUP_ENABLED,
    N8N_QUOTE_FOLLOWUP_WEBHOOK_URL,
    N8N_REQUEST_TIMEOUT_SECONDS,
)


def trigger_quote_followup_workflow(payload: Dict[str, Any]) -> Dict[str, Any]:
    if not N8N_FOLLOWUP_ENABLED:
        return {"ok": False, "skipped": True, "reason": "n8n_followup_disabled"}
    if not N8N_QUOTE_FOLLOWUP_WEBHOOK_URL.strip():
        return {"ok": False, "skipped": True, "reason": "missing_n8n_webhook_url"}

    headers = {"Content-Type": "application/json"}
    if AUTOMATION_SHARED_SECRET.strip():
        headers["X-Automation-Token"] = AUTOMATION_SHARED_SECRET.strip()

    response = httpx.post(
        N8N_QUOTE_FOLLOWUP_WEBHOOK_URL.strip(),
        json=payload,
        headers=headers,
        timeout=N8N_REQUEST_TIMEOUT_SECONDS,
    )

    if response.status_code >= 300:
        return {
            "ok": False,
            "skipped": False,
            "statusCode": response.status_code,
            "responseText": response.text,
        }

    body: Dict[str, Any]
    try:
        parsed = response.json()
        body = parsed if isinstance(parsed, dict) else {"response": parsed}
    except Exception:
        body = {"responseText": response.text}

    return {"ok": True, "statusCode": response.status_code, "response": body}
