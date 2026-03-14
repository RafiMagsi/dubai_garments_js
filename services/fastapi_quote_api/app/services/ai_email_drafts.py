from __future__ import annotations

import json
from typing import Any, Dict, Optional

from app.core.config import OPENAI_API_KEY, OPENAI_MODEL
from app.core.db import get_db_connection
from app.services.ai_logs import create_ai_log


def _normalize_tone(value: Optional[str]) -> str:
    tone = (value or "professional").strip().lower()
    if tone in {"professional", "friendly", "urgent", "concise"}:
        return tone
    return "professional"


def _openai_draft(prompt: str, fallback_subject: str, fallback_message: str) -> Dict[str, Any]:
    if not OPENAI_API_KEY.strip():
        return {
            "provider": "system",
            "fallback_used": True,
            "subject": fallback_subject,
            "message": fallback_message,
        }

    try:
        from openai import OpenAI

        client = OpenAI(api_key=OPENAI_API_KEY)
        completion = client.chat.completions.create(
            model=OPENAI_MODEL,
            response_format={"type": "json_object"},
            temperature=0.3,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You draft concise B2B sales emails for garment manufacturing workflows. "
                        "Return strict JSON with keys: subject, message. "
                        "message must be plain text with line breaks, no markdown."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        )
        content = completion.choices[0].message.content if completion.choices else None
        if not content:
            raise ValueError("Empty OpenAI response.")
        parsed = json.loads(content)
        subject = str(parsed.get("subject") or "").strip()
        message = str(parsed.get("message") or "").strip()
        if not subject or not message:
            raise ValueError("Missing subject or message in OpenAI draft.")
        return {
            "provider": "openai",
            "fallback_used": False,
            "subject": subject,
            "message": message,
        }
    except Exception:
        return {
            "provider": "system",
            "fallback_used": True,
            "subject": fallback_subject,
            "message": fallback_message,
        }


def draft_lead_reply(lead_id: str, tone: Optional[str], additional_context: Optional[str]) -> Dict[str, Any]:
    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  id::text,
                  contact_name,
                  company_name,
                  email,
                  requested_qty,
                  ai_product,
                  ai_classification,
                  ai_score,
                  notes
                FROM leads
                WHERE id = %s::uuid
                LIMIT 1
                """,
                (lead_id,),
            )
            lead = cursor.fetchone()
            if not lead:
                raise ValueError("Lead not found.")

    normalized_tone = _normalize_tone(tone)
    contact_name = lead.get("contact_name") or "Customer"
    company_name = lead.get("company_name") or "your team"
    requested_qty = lead.get("requested_qty") or "-"
    product = lead.get("ai_product") or "apparel products"
    classification = lead.get("ai_classification") or "N/A"
    score = lead.get("ai_score")
    lead_notes = lead.get("notes") or ""

    fallback_subject = f"Re: Your enquiry for {company_name}"
    fallback_message = (
        f"Hello {contact_name},\n\n"
        f"Thank you for your inquiry regarding {product}. "
        f"We have reviewed your request for approximately {requested_qty} units and are preparing the best options for your team.\n\n"
        "Please share any branding files, preferred fabric, and delivery timeline so we can finalize your quote quickly.\n\n"
        "Regards,\nDubai Garments Sales Team"
    )

    prompt = (
        f"Tone: {normalized_tone}\n"
        "Draft a reply email for this inbound lead.\n"
        f"Contact name: {contact_name}\n"
        f"Company: {company_name}\n"
        f"Requested quantity: {requested_qty}\n"
        f"Product: {product}\n"
        f"AI classification: {classification}\n"
        f"AI score: {score}\n"
        f"Lead notes: {lead_notes}\n"
        f"Additional context: {additional_context or ''}\n"
    )
    draft = _openai_draft(prompt, fallback_subject, fallback_message)

    create_ai_log(
        workflow_name="ai_draft_lead_reply",
        status="success",
        provider=draft.get("provider"),
        model=OPENAI_MODEL,
        trigger_entity_type="lead",
        trigger_entity_id=lead_id,
        fallback_used=bool(draft.get("fallback_used", False)),
        input_payload={"tone": normalized_tone, "additionalContext": additional_context or ""},
        output_payload={"subject": draft.get("subject"), "message": draft.get("message")},
    )

    return {
        "recipient_email": lead.get("email") or "",
        "subject": draft.get("subject"),
        "message": draft.get("message"),
        "provider": draft.get("provider"),
        "fallback_used": bool(draft.get("fallback_used", False)),
    }


def draft_deal_reply(deal_id: str, tone: Optional[str], additional_context: Optional[str]) -> Dict[str, Any]:
    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  d.id::text,
                  d.title,
                  d.stage,
                  d.expected_value::float8 AS expected_value,
                  l.contact_name,
                  l.company_name,
                  l.email,
                  l.ai_product,
                  l.requested_qty
                FROM deals d
                LEFT JOIN leads l ON l.id = d.lead_id
                WHERE d.id = %s::uuid
                LIMIT 1
                """,
                (deal_id,),
            )
            deal = cursor.fetchone()
            if not deal:
                raise ValueError("Deal not found.")

    normalized_tone = _normalize_tone(tone)
    contact_name = deal.get("contact_name") or "Customer"
    company_name = deal.get("company_name") or "your team"
    stage = deal.get("stage") or "qualified"
    title = deal.get("title") or "Order Discussion"
    value = deal.get("expected_value")
    product = deal.get("ai_product") or "apparel products"
    quantity = deal.get("requested_qty") or "-"

    fallback_subject = f"Update on {title}"
    fallback_message = (
        f"Hello {contact_name},\n\n"
        f"Quick update on your request for {product} ({quantity} units). "
        f"We are currently in the {stage} stage and can share final pricing/breakdown next.\n\n"
        "If there are any specification changes, reply with details and we will adjust immediately.\n\n"
        "Regards,\nDubai Garments Sales Team"
    )

    prompt = (
        f"Tone: {normalized_tone}\n"
        "Draft a follow-up email for an active deal.\n"
        f"Contact name: {contact_name}\n"
        f"Company: {company_name}\n"
        f"Deal title: {title}\n"
        f"Deal stage: {stage}\n"
        f"Expected value AED: {value}\n"
        f"Product: {product}\n"
        f"Quantity: {quantity}\n"
        f"Additional context: {additional_context or ''}\n"
    )
    draft = _openai_draft(prompt, fallback_subject, fallback_message)

    create_ai_log(
        workflow_name="ai_draft_deal_reply",
        status="success",
        provider=draft.get("provider"),
        model=OPENAI_MODEL,
        trigger_entity_type="deal",
        trigger_entity_id=deal_id,
        fallback_used=bool(draft.get("fallback_used", False)),
        input_payload={"tone": normalized_tone, "additionalContext": additional_context or ""},
        output_payload={"subject": draft.get("subject"), "message": draft.get("message")},
    )

    return {
        "recipient_email": deal.get("email") or "",
        "subject": draft.get("subject"),
        "message": draft.get("message"),
        "provider": draft.get("provider"),
        "fallback_used": bool(draft.get("fallback_used", False)),
    }


def draft_quote_email(quote_id: str, tone: Optional[str], additional_context: Optional[str]) -> Dict[str, Any]:
    with get_db_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  q.id::text,
                  q.quote_number,
                  q.status,
                  q.currency,
                  q.total_amount::float8 AS total_amount,
                  q.valid_until::text,
                  c.email AS customer_email,
                  c.company_name AS customer_company,
                  l.contact_name AS lead_contact_name,
                  l.email AS lead_email
                FROM quotes q
                LEFT JOIN customers c ON c.id = q.customer_id
                LEFT JOIN leads l ON l.id = q.lead_id
                WHERE q.id = %s::uuid
                LIMIT 1
                """,
                (quote_id,),
            )
            quote = cursor.fetchone()
            if not quote:
                raise ValueError("Quote not found.")

    normalized_tone = _normalize_tone(tone)
    recipient_email = quote.get("customer_email") or quote.get("lead_email") or ""
    contact_name = quote.get("lead_contact_name") or quote.get("customer_company") or "Customer"
    quote_number = quote.get("quote_number") or "N/A"
    currency = quote.get("currency") or "AED"
    total_amount = quote.get("total_amount") or 0
    valid_until = quote.get("valid_until") or "As per terms"
    status = quote.get("status") or "draft"

    fallback_subject = f"Quote {quote_number} from Dubai Garments"
    fallback_message = (
        f"Hello {contact_name},\n\n"
        f"Your quote {quote_number} is ready.\n"
        f"Total: {currency} {float(total_amount):.2f}\n"
        f"Valid until: {valid_until}\n\n"
        "Please review and let us know if you need any revisions before approval.\n\n"
        "Regards,\nDubai Garments Sales Team"
    )

    prompt = (
        f"Tone: {normalized_tone}\n"
        "Draft a quote email for a B2B garment sales workflow.\n"
        f"Contact/company: {contact_name}\n"
        f"Quote number: {quote_number}\n"
        f"Quote status: {status}\n"
        f"Total: {currency} {float(total_amount):.2f}\n"
        f"Valid until: {valid_until}\n"
        f"Additional context: {additional_context or ''}\n"
    )
    draft = _openai_draft(prompt, fallback_subject, fallback_message)

    create_ai_log(
        workflow_name="ai_draft_quote_email",
        status="success",
        provider=draft.get("provider"),
        model=OPENAI_MODEL,
        trigger_entity_type="quote",
        trigger_entity_id=quote_id,
        fallback_used=bool(draft.get("fallback_used", False)),
        input_payload={"tone": normalized_tone, "additionalContext": additional_context or ""},
        output_payload={"subject": draft.get("subject"), "message": draft.get("message")},
    )

    return {
        "recipient_email": recipient_email,
        "subject": draft.get("subject"),
        "message": draft.get("message"),
        "provider": draft.get("provider"),
        "fallback_used": bool(draft.get("fallback_used", False)),
    }
