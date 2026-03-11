from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response

from app.core.config import STORAGE_PROVIDER
from app.core.db import get_db_connection
from app.core.queue import enqueue_quote_pdf_job
from app.schemas.quotes import (
    QuoteCreateRequest,
    QuoteCreateResponse,
    QuoteDetailResponse,
    QuoteStatusUpdateRequest,
)
from app.services.quote_pdf import (
    enqueue_quote_document_placeholder,
    get_latest_quote_document,
)
from app.services.activities import create_activity
from app.services.email import (
    build_quote_sent_email,
    create_automation_run,
    finish_automation_run,
    send_email,
)
from app.services.n8n import trigger_quote_followup_workflow
from app.services.quotes import create_quote
from app.services.storage import read_local_binary

router = APIRouter(prefix="/api/v1", tags=["quotes"])
QUOTE_STATUSES = ("draft", "sent", "approved", "rejected", "expired")


def _normalize_quote_status(status: str) -> str:
    value = status.strip().lower()
    if value not in QUOTE_STATUSES:
        raise HTTPException(
            status_code=422,
            detail="Invalid quote status. Allowed: draft, sent, approved, rejected, expired.",
        )
    return value


@router.get("/quotes")
def list_quotes(
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> Dict[str, List[Dict[str, object]]]:
    sql = """
        SELECT
          q.id::text,
          q.quote_number,
          q.customer_id::text,
          q.lead_id::text,
          q.deal_id::text,
          q.created_by_user_id::text,
          q.status,
          q.currency,
          q.subtotal::float8 AS subtotal,
          q.tax_amount::float8 AS tax_amount,
          q.discount_amount::float8 AS discount_amount,
          q.total_amount::float8 AS total_amount,
          q.valid_until::text,
          q.terms,
          q.notes,
          q.created_at::text,
          q.updated_at::text,
          c.company_name AS customer_company_name
        FROM quotes q
        LEFT JOIN customers c ON c.id = q.customer_id
    """
    params: List[object] = []
    where_clauses: List[str] = []

    if status:
        where_clauses.append("q.status = %s")
        params.append(status.strip().lower())
    if search:
        where_clauses.append(
            "(q.quote_number ILIKE %s OR c.company_name ILIKE %s OR q.notes ILIKE %s)"
        )
        term = f"%{search.strip()}%"
        params.extend([term, term, term])

    if where_clauses:
        sql += " WHERE " + " AND ".join(where_clauses)

    sql += " ORDER BY q.created_at DESC LIMIT %s"
    params.append(limit)

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(sql, params)
                items = cursor.fetchall()
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quotes: {error}") from error

    return {"items": items}


@router.get("/quotes/{quote_id}", response_model=QuoteDetailResponse)
def view_quote(quote_id: str) -> Dict[str, object]:
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
                      q.created_by_user_id::text,
                      q.status,
                      q.currency,
                      q.subtotal::float8 AS subtotal,
                      q.tax_amount::float8 AS tax_amount,
                      q.discount_amount::float8 AS discount_amount,
                      q.total_amount::float8 AS total_amount,
                      q.valid_until::text,
                      q.terms,
                      q.notes,
                      q.created_at::text,
                      q.updated_at::text,
                      c.company_name AS customer_company_name
                    FROM quotes q
                    LEFT JOIN customers c ON c.id = q.customer_id
                    WHERE q.id = %s::uuid
                    """,
                    (quote_id,),
                )
                quote = cursor.fetchone()
                if not quote:
                    raise HTTPException(status_code=404, detail="Quote not found.")

                cursor.execute(
                    """
                    SELECT EXISTS (
                      SELECT 1
                      FROM information_schema.columns
                      WHERE table_schema = 'public'
                        AND table_name = 'quote_items'
                        AND column_name = 'pricing_breakdown'
                    ) AS has_pricing_breakdown
                    """
                )
                has_pricing_breakdown = bool(cursor.fetchone()["has_pricing_breakdown"])

                pricing_breakdown_select = (
                    "pricing_breakdown"
                    if has_pricing_breakdown
                    else "'{}'::jsonb AS pricing_breakdown"
                )

                cursor.execute(
                    f"""
                    SELECT
                      id::text,
                      quote_id::text,
                      product_id::text,
                      product_variant_id::text,
                      item_name,
                      description,
                      quantity,
                      unit_price::float8 AS unit_price,
                      discount_amount::float8 AS discount_amount,
                      line_total::float8 AS line_total,
                      {pricing_breakdown_select},
                      created_at::text,
                      updated_at::text
                    FROM quote_items
                    WHERE quote_id = %s::uuid
                    ORDER BY created_at ASC
                    """,
                    (quote_id,),
                )
                items = cursor.fetchall()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quote: {error}") from error

    return {"item": quote, "items": items}


@router.post("/quotes/{quote_id}/status")
def update_quote_status(quote_id: str, payload: QuoteStatusUpdateRequest) -> Dict[str, object]:
    status = _normalize_quote_status(payload.status)
    now = datetime.now(timezone.utc)
    followup_trigger_payload: Optional[Dict[str, object]] = None

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT id::text, status, lead_id::text, deal_id::text, customer_id::text, quote_number
                    FROM quotes
                    WHERE id = %s::uuid
                    """,
                    (quote_id,),
                )
                current = cursor.fetchone()
                if not current:
                    raise HTTPException(status_code=404, detail="Quote not found.")

                cursor.execute(
                    """
                    UPDATE quotes
                    SET
                      status = %s,
                      sent_at = CASE WHEN %s = 'sent' THEN COALESCE(sent_at, %s) ELSE sent_at END,
                      approved_at = CASE WHEN %s = 'approved' THEN COALESCE(approved_at, %s) ELSE approved_at END,
                      rejected_at = CASE WHEN %s IN ('rejected', 'expired') THEN COALESCE(rejected_at, %s) ELSE rejected_at END,
                      notes = CASE WHEN %s IS NULL OR %s = '' THEN notes ELSE %s END,
                      updated_at = NOW()
                    WHERE id = %s::uuid
                    RETURNING
                      id::text,
                      quote_number,
                      customer_id::text,
                      lead_id::text,
                      deal_id::text,
                      created_by_user_id::text,
                      status,
                      currency,
                      subtotal::float8 AS subtotal,
                      tax_amount::float8 AS tax_amount,
                      discount_amount::float8 AS discount_amount,
                      total_amount::float8 AS total_amount,
                      valid_until::text,
                      terms,
                      notes,
                      created_at::text,
                      updated_at::text
                    """,
                    (
                        status,
                        status,
                        now,
                        status,
                        now,
                        status,
                        now,
                        payload.notes,
                        payload.notes,
                        payload.notes,
                        quote_id,
                    ),
                )
                updated = cursor.fetchone()
                if not updated:
                    raise HTTPException(status_code=500, detail="Failed to update quote status.")

                if updated.get("lead_id"):
                    if status == "approved":
                        cursor.execute(
                            """
                            UPDATE leads
                            SET status = 'won', updated_at = NOW()
                            WHERE id = %s::uuid
                            """,
                            (updated["lead_id"],),
                        )
                    elif status in ("rejected", "expired"):
                        cursor.execute(
                            """
                            UPDATE leads
                            SET status = 'lost', updated_at = NOW()
                            WHERE id = %s::uuid
                              AND status <> 'won'
                            """,
                            (updated["lead_id"],),
                        )
                    elif status == "sent":
                        cursor.execute(
                            """
                            UPDATE leads
                            SET status = 'quoted', updated_at = NOW()
                            WHERE id = %s::uuid
                              AND status IN ('new', 'qualified')
                            """,
                            (updated["lead_id"],),
                        )

                if updated.get("deal_id"):
                    if status == "approved":
                        cursor.execute(
                            """
                            UPDATE deals
                            SET stage = 'won', won_at = NOW(), updated_at = NOW()
                            WHERE id = %s::uuid
                            """,
                            (updated["deal_id"],),
                        )
                    elif status in ("rejected", "expired"):
                        cursor.execute(
                            """
                            UPDATE deals
                            SET stage = 'lost',
                                lost_reason = COALESCE(lost_reason, %s),
                                updated_at = NOW()
                            WHERE id = %s::uuid
                              AND stage <> 'won'
                            """,
                            ("Quote marked as rejected/expired", updated["deal_id"]),
                        )
                    elif status == "sent":
                        cursor.execute(
                            """
                            UPDATE deals
                            SET stage = 'quoted', updated_at = NOW()
                            WHERE id = %s::uuid
                              AND stage IN ('new', 'qualified', 'negotiation')
                            """,
                            (updated["deal_id"],),
                        )

                if current["status"] != status:
                    create_activity(
                        connection=connection,
                        activity_type="quote_status_changed",
                        title=f"Quote moved to {status}",
                        customer_id=updated.get("customer_id"),
                        lead_id=updated.get("lead_id"),
                        deal_id=updated.get("deal_id"),
                        quote_id=updated.get("id"),
                        details=payload.notes,
                        metadata={
                            "quoteNumber": updated.get("quote_number"),
                            "from": current["status"],
                            "to": status,
                        },
                    )

                if current["status"] != status and status == "sent":
                    cursor.execute(
                        """
                        SELECT
                          c.email AS customer_email,
                          c.company_name AS customer_company,
                          l.email AS lead_email,
                          l.company_name AS lead_company
                        FROM quotes q
                        LEFT JOIN customers c ON c.id = q.customer_id
                        LEFT JOIN leads l ON l.id = q.lead_id
                        WHERE q.id = %s::uuid
                        """,
                        (quote_id,),
                    )
                    recipient_row = cursor.fetchone() or {}
                    recipient_email = (
                        recipient_row.get("customer_email")
                        or recipient_row.get("lead_email")
                        or ""
                    ).strip()
                    company_name = (
                        recipient_row.get("customer_company")
                        or recipient_row.get("lead_company")
                        or "Customer"
                    )

                    if recipient_email:
                        mail = build_quote_sent_email(
                            quote_number=updated.get("quote_number") or quote_id[:8].upper(),
                            company_name=company_name,
                            total_amount=float(updated.get("total_amount") or 0.0),
                            currency=updated.get("currency") or "AED",
                            valid_until=updated.get("valid_until"),
                        )
                        run_id = create_automation_run(
                            connection=connection,
                            workflow_name="quote_sent_email",
                            trigger_source="automation",
                            trigger_entity_type="quote",
                            trigger_entity_id=quote_id,
                            request_payload={"recipientEmail": recipient_email},
                        )
                        try:
                            delivery = send_email(
                                recipient_email=recipient_email,
                                subject=mail["subject"],
                                text_body=mail["text"],
                                html_body=mail["html"],
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
                                """,
                                (
                                    updated.get("customer_id"),
                                    updated.get("lead_id"),
                                    updated.get("deal_id"),
                                    updated.get("id"),
                                    mail["subject"],
                                    f"To: {recipient_email}\n\n{mail['text']}",
                                    delivery.get("messageId"),
                                ),
                            )
                            create_activity(
                                connection=connection,
                                activity_type="email_sent",
                                title="Quote email sent",
                                customer_id=updated.get("customer_id"),
                                lead_id=updated.get("lead_id"),
                                deal_id=updated.get("deal_id"),
                                quote_id=updated.get("id"),
                                details=f"Quote sent to {recipient_email}",
                                metadata={
                                    "provider": delivery.get("provider"),
                                    "recipientEmail": recipient_email,
                                },
                            )
                            finish_automation_run(
                                connection=connection,
                                run_id=run_id,
                                status="success",
                                response_payload={
                                    "provider": delivery.get("provider"),
                                    "messageId": delivery.get("messageId"),
                                },
                            )
                        except Exception as email_error:
                            finish_automation_run(
                                connection=connection,
                                run_id=run_id,
                                status="failed",
                                error_message=str(email_error),
                            )

                    followup_trigger_payload = {
                        "event": "quote_sent",
                        "quoteId": quote_id,
                        "quoteNumber": updated.get("quote_number"),
                        "customerId": updated.get("customer_id"),
                        "leadId": updated.get("lead_id"),
                        "dealId": updated.get("deal_id"),
                    }
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to update quote status: {error}") from error

    if followup_trigger_payload:
        try:
            with get_db_connection() as connection:
                run_id = create_automation_run(
                    connection=connection,
                    workflow_name="n8n_quote_followup_trigger",
                    trigger_source="automation",
                    trigger_entity_type="quote",
                    trigger_entity_id=quote_id,
                    request_payload=followup_trigger_payload,
                )
                response = trigger_quote_followup_workflow(followup_trigger_payload)
                if response.get("ok"):
                    finish_automation_run(
                        connection=connection,
                        run_id=run_id,
                        status="success",
                        response_payload=response,
                    )
                else:
                    finish_automation_run(
                        connection=connection,
                        run_id=run_id,
                        status="failed",
                        response_payload=response,
                        error_message=response.get("reason") or response.get("responseText"),
                    )
                connection.commit()
        except Exception:
            # n8n trigger failure should not block quote status update.
            pass

    return {"item": updated}


@router.post("/quotes", response_model=QuoteCreateResponse)
def create_quote_route(payload: QuoteCreateRequest) -> Dict[str, object]:
    quote_id: Optional[str] = None
    try:
        with get_db_connection() as connection:
            with connection.transaction():
                quote, items = create_quote(connection, payload)
                quote_id = quote.get("id")
                if quote_id:
                    enqueue_quote_document_placeholder(connection, quote_id)

        job_id = enqueue_quote_pdf_job(quote_id) if quote_id else None
        return {"item": quote, "items": items, "pdfJobId": job_id}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Quote creation failed: {error}") from error


@router.post("/quotes/{quote_id}/generate-pdf")
def generate_quote_pdf(quote_id: str) -> Dict[str, object]:
    try:
        with get_db_connection() as connection:
            with connection.transaction():
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT id::text FROM quotes WHERE id = %s::uuid",
                        (quote_id,),
                    )
                    quote = cursor.fetchone()
                    if not quote:
                        raise HTTPException(status_code=404, detail="Quote not found.")
                document_id = enqueue_quote_document_placeholder(connection, quote_id)
        job_id = enqueue_quote_pdf_job(quote_id)
        return {
            "ok": True,
            "quoteId": quote_id,
            "documentId": document_id,
            "jobId": job_id,
            "message": "Quote PDF generation queued.",
        }
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to queue quote PDF generation: {error}") from error


@router.get("/quotes/{quote_id}/pdf")
def get_quote_pdf_status(quote_id: str) -> Dict[str, object]:
    try:
        with get_db_connection() as connection:
            document = get_latest_quote_document(connection, quote_id)
            if not document:
                return {"quoteId": quote_id, "status": "not_generated", "document": None}

            download_url: Optional[str] = None
            if document.get("status") == "generated":
                if document.get("storage_provider") == "local":
                    download_url = f"/api/v1/quotes/{quote_id}/pdf/download"
                else:
                    download_url = document.get("storage_key")

            return {
                "quoteId": quote_id,
                "status": document.get("status"),
                "document": document,
                "downloadUrl": download_url,
            }
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch quote PDF status: {error}") from error


@router.get("/quotes/{quote_id}/pdf/download")
def download_quote_pdf(quote_id: str):
    try:
        with get_db_connection() as connection:
            document = get_latest_quote_document(connection, quote_id)
            if not document or document.get("status") != "generated":
                raise HTTPException(status_code=404, detail="Generated quote PDF not found.")

            storage_provider = document.get("storage_provider")
            storage_key = document.get("storage_key")
            if not storage_key:
                raise HTTPException(status_code=404, detail="Quote PDF key is missing.")

            if storage_provider == "local":
                payload = read_local_binary(storage_key)
                file_name = document.get("file_name") or f"quote-{quote_id}.pdf"
                return Response(
                    content=payload,
                    media_type="application/pdf",
                    headers={"Content-Disposition": f'inline; filename="{file_name}"'},
                )

            # For S3/R2, return signed/public URL from status endpoint.
            raise HTTPException(
                status_code=400,
                detail=(
                    "This document is stored on object storage. "
                    "Use GET /api/v1/quotes/{quote_id}/pdf to obtain downloadUrl."
                ),
            )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to download quote PDF: {error}") from error


@router.get("/quotes/files/{file_key:path}")
def download_local_quote_file(file_key: str):
    if STORAGE_PROVIDER != "local":
        raise HTTPException(status_code=404, detail="Local file route is disabled for non-local storage.")
    payload = read_local_binary(file_key)
    file_name = file_key.split("/")[-1] or "quote.pdf"
    return Response(
        content=payload,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{file_name}"'},
    )
