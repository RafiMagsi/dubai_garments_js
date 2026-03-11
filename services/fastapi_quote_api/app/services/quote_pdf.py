from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import HTTPException
from psycopg import Connection
from psycopg.errors import UndefinedTable

from app.core.db import get_db_connection
from app.services.activities import create_activity
from app.services.storage import store_binary


def _quote_documents_table_exists(connection: Connection) -> bool:
    with connection.cursor() as cursor:
        cursor.execute("SELECT to_regclass('public.quote_documents') IS NOT NULL AS exists")
        row = cursor.fetchone()
    return bool(row and row.get("exists"))


def _fetch_quote_payload(connection: Connection, quote_id: str) -> Dict[str, Any]:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
              q.id::text,
              q.quote_number,
              q.customer_id::text,
              q.lead_id::text,
              q.deal_id::text,
              q.status,
              q.currency,
              q.subtotal::float8 AS subtotal,
              q.tax_amount::float8 AS tax_amount,
              q.discount_amount::float8 AS discount_amount,
              q.total_amount::float8 AS total_amount,
              q.valid_until::text,
              q.terms,
              q.notes,
              c.company_name AS customer_name
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
            SELECT
              id::text,
              item_name,
              description,
              quantity,
              unit_price::float8 AS unit_price,
              line_total::float8 AS line_total
            FROM quote_items
            WHERE quote_id = %s::uuid
            ORDER BY created_at ASC
            """,
            (quote_id,),
        )
        items = cursor.fetchall()
    return {"quote": quote, "items": items}


def _render_quote_html(context: Dict[str, Any]) -> str:
    try:
        from jinja2 import Environment, FileSystemLoader, select_autoescape
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"jinja2 is required for quote PDF rendering: {error}") from error

    template_dir = Path(__file__).resolve().parents[1] / "templates"
    env = Environment(
        loader=FileSystemLoader(str(template_dir)),
        autoescape=select_autoescape(["html", "xml"]),
    )
    template = env.get_template("quote_proposal.html")
    return template.render(context)


def _html_to_pdf_bytes(html: str) -> bytes:
    try:
        from playwright.sync_api import sync_playwright
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"playwright is required for PDF generation: {error}",
        ) from error

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page()
        page.set_content(html, wait_until="networkidle")
        pdf = page.pdf(format="A4", print_background=True, margin={"top": "16mm", "bottom": "16mm", "left": "14mm", "right": "14mm"})
        browser.close()
    return pdf


def get_latest_quote_document(connection: Connection, quote_id: str) -> Optional[Dict[str, Any]]:
    if not _quote_documents_table_exists(connection):
        return None
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                  id::text,
                  quote_id::text,
                  storage_provider,
                  storage_bucket,
                  storage_key,
                  file_name,
                  mime_type,
                  file_size,
                  status,
                  error_message,
                  generated_at,
                  created_at,
                  updated_at
                FROM quote_documents
                WHERE quote_id = %s::uuid
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (quote_id,),
            )
            return cursor.fetchone()
    except UndefinedTable:
        return None


def enqueue_quote_document_placeholder(connection: Connection, quote_id: str) -> str:
    if not _quote_documents_table_exists(connection):
        return ""
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO quote_documents (quote_id, status)
                VALUES (%s::uuid, 'queued')
                RETURNING id::text
                """,
                (quote_id,),
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=500, detail="Failed to queue quote document.")
            return row["id"]
    except UndefinedTable:
        return ""


def generate_quote_pdf_document(quote_id: str) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    with get_db_connection() as connection:
        try:
            has_quote_documents = _quote_documents_table_exists(connection)
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
                    VALUES ('quote_pdf_generation', 'worker', 'quote', %s::uuid, 'running', %s::jsonb, %s)
                    RETURNING id::text
                    """,
                    (quote_id, '{"quoteId": "%s"}' % quote_id, now),
                )
                run = cursor.fetchone()
                run_id = run["id"] if run else None

            payload = _fetch_quote_payload(connection, quote_id)
            html = _render_quote_html(
                {
                    "quote": payload["quote"],
                    "items": payload["items"],
                    "customer_name": payload["quote"].get("customer_name") or "-",
                    "generated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
                }
            )
            pdf_bytes = _html_to_pdf_bytes(html)

            quote_number = payload["quote"]["quote_number"] or quote_id[:8].upper()
            storage_key = f"quotes/{quote_id}/proposal-{quote_number}.pdf"
            stored = store_binary(storage_key, pdf_bytes, "application/pdf")

            with connection.cursor() as cursor:
                if has_quote_documents:
                    cursor.execute(
                        """
                        INSERT INTO quote_documents (
                          quote_id,
                          storage_provider,
                          storage_bucket,
                          storage_key,
                          file_name,
                          mime_type,
                          file_size,
                          status,
                          generated_at
                        )
                        VALUES (%s::uuid, %s, %s, %s, %s, 'application/pdf', %s, 'generated', NOW())
                        RETURNING id::text
                        """,
                        (
                            quote_id,
                            stored["provider"],
                            stored["bucket"],
                            stored["key"],
                            f"{quote_number}.pdf",
                            len(pdf_bytes),
                        ),
                    )
                    row = cursor.fetchone()
                    doc_id = row["id"] if row else None
                else:
                    doc_id = None

                create_activity(
                    connection=connection,
                    activity_type="quote_generated",
                    title="Quote PDF generated",
                    quote_id=quote_id,
                    details=f"Proposal PDF generated for quote {quote_number}.",
                    metadata={"storageProvider": stored["provider"], "storageKey": stored["key"]},
                )

                if run_id:
                    cursor.execute(
                        """
                        UPDATE automation_runs
                        SET
                          status = 'success',
                          response_payload = %s::jsonb,
                          finished_at = NOW()
                        WHERE id = %s::uuid
                        """,
                        (
                            '{"quoteId": "%s", "documentId": "%s"}' % (quote_id, doc_id or ""),
                            run_id,
                        ),
                    )
            connection.commit()
            return {"ok": True, "quoteId": quote_id, "documentId": doc_id}
        except Exception as error:
            # Reset the failed transaction state before writing failure records.
            connection.rollback()
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    UPDATE automation_runs
                    SET
                      status = 'failed',
                      error_message = %s,
                      finished_at = NOW()
                    WHERE workflow_name = 'quote_pdf_generation'
                      AND trigger_entity_type = 'quote'
                      AND trigger_entity_id = %s::uuid
                      AND status = 'running'
                    """,
                    (str(error), quote_id),
                )
                if _quote_documents_table_exists(connection):
                    cursor.execute(
                        """
                        INSERT INTO quote_documents (quote_id, status, error_message)
                        VALUES (%s::uuid, 'failed', %s)
                        """,
                        (quote_id, str(error)),
                    )
            connection.commit()
            raise
