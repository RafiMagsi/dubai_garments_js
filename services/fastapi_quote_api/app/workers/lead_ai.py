from __future__ import annotations

from app.services.lead_ai import process_lead_with_ai


def run_lead_ai_job(lead_id: str) -> dict:
    return process_lead_with_ai(lead_id)
