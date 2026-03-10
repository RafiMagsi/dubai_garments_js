from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.db import get_db_connection
from app.schemas.quotes import QuoteCreateRequest, QuoteCreateResponse
from app.services.quotes import create_quote

router = APIRouter(prefix="/api/v1", tags=["quotes"])


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


@router.post("/quotes", response_model=QuoteCreateResponse)
def create_quote_route(payload: QuoteCreateRequest) -> Dict[str, object]:
    try:
        with get_db_connection() as connection:
            with connection.transaction():
                quote, items = create_quote(connection, payload)
        return {"item": quote, "items": items}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Quote creation failed: {error}") from error
