from __future__ import annotations

from app.services.quote_pdf import generate_quote_pdf_document


def run_quote_pdf_job(quote_id: str) -> dict:
    return generate_quote_pdf_document(quote_id)
