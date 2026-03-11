from __future__ import annotations

import json
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Tuple
from uuid import uuid4

import psycopg
from fastapi import HTTPException

from app.schemas.pricing import PricingCalculateRequest
from app.schemas.quotes import QuoteCreateRequest, QuoteLineItemCreateRequest
from app.services.activities import create_activity
from app.services.pricing import calculate_price

TWOPLACES = Decimal("0.01")


def _as_money(value: Decimal) -> Decimal:
    return value.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _to_decimal(value: float) -> Decimal:
    return Decimal(str(value))


def _generate_quote_number() -> str:
    # Deterministic formatting, uniqueness via random suffix.
    date_part = datetime.now(timezone.utc).strftime("%Y%m%d")
    suffix = uuid4().hex[:6].upper()
    return f"Q-{date_part}-{suffix}"


def _assert_customer_exists(connection: psycopg.Connection, customer_id: str) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT 1 FROM customers WHERE id = %s::uuid LIMIT 1",
            (customer_id,),
        )
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Customer not found.")


def _fetch_product_name(
    connection: psycopg.Connection, product_id: str, product_variant_id: str | None
) -> str:
    with connection.cursor() as cursor:
        if product_variant_id:
            cursor.execute(
                """
                SELECT p.name, pv.variant_name
                FROM products p
                JOIN product_variants pv ON pv.product_id = p.id
                WHERE p.id = %s::uuid
                  AND pv.id = %s::uuid
                """,
                (product_id, product_variant_id),
            )
            row = cursor.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Product variant not found.")
            return f"{row['name']} - {row['variant_name']}"

        cursor.execute(
            "SELECT name FROM products WHERE id = %s::uuid",
            (product_id,),
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Product not found.")
        return row["name"]


def _calculate_line_item(
    connection: psycopg.Connection, currency: str, line_item: QuoteLineItemCreateRequest
) -> Dict[str, object]:
    pricing_payload = PricingCalculateRequest(
        product_id=line_item.product_id,
        product_variant_id=line_item.product_variant_id,
        quantity=line_item.quantity,
        customization_cost_per_unit=line_item.customization_cost_per_unit,
        customization_flat_cost=line_item.customization_flat_cost,
        is_rush=line_item.is_rush,
        requested_delivery_days=line_item.requested_delivery_days,
        rush_fee_pct=line_item.rush_fee_pct,
        margin_pct=line_item.margin_pct,
        currency=currency,
    )
    breakdown = calculate_price(connection, pricing_payload)
    line_total = _to_decimal(float(breakdown["total_amount"]))
    unit_price = _as_money(line_total / Decimal(line_item.quantity))
    item_name = _fetch_product_name(connection, line_item.product_id, line_item.product_variant_id)

    return {
        "product_id": line_item.product_id,
        "product_variant_id": line_item.product_variant_id,
        "item_name": item_name,
        "description": line_item.note,
        "quantity": line_item.quantity,
        "unit_price": unit_price,
        "discount_amount": Decimal("0.00"),
        "line_total": _as_money(line_total),
        "pricing_breakdown": breakdown,
    }


def create_quote(
    connection: psycopg.Connection, payload: QuoteCreateRequest
) -> Tuple[Dict[str, object], List[Dict[str, object]]]:
    _assert_customer_exists(connection, payload.customer_id)

    currency = (payload.currency or "AED").strip().upper()
    discount_amount = _as_money(_to_decimal(payload.discount_amount))
    tax_pct = _to_decimal(payload.tax_pct)

    calculated_items: List[Dict[str, object]] = []
    subtotal = Decimal("0.00")

    for line_item in payload.items:
        calculated = _calculate_line_item(connection, currency, line_item)
        calculated_items.append(calculated)
        subtotal += calculated["line_total"]

    subtotal = _as_money(subtotal)
    if discount_amount > subtotal:
        raise HTTPException(status_code=422, detail="discount_amount cannot exceed subtotal.")

    tax_amount = _as_money((subtotal - discount_amount) * (tax_pct / Decimal("100")))
    total_amount = _as_money(subtotal - discount_amount + tax_amount)

    quote_number = _generate_quote_number()

    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO quotes (
              quote_number,
              customer_id,
              lead_id,
              deal_id,
              created_by_user_id,
              status,
              currency,
              subtotal,
              tax_amount,
              discount_amount,
              total_amount,
              valid_until,
              terms,
              notes
            )
            VALUES (
              %s,
              %s::uuid,
              %s::uuid,
              %s::uuid,
              %s::uuid,
              'draft',
              %s,
              %s,
              %s,
              %s,
              %s,
              %s,
              %s,
              %s
            )
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
                quote_number,
                payload.customer_id,
                payload.lead_id,
                payload.deal_id,
                payload.created_by_user_id,
                currency,
                subtotal,
                tax_amount,
                discount_amount,
                total_amount,
                payload.valid_until,
                payload.terms,
                payload.notes,
            ),
        )
        quote_row = cursor.fetchone()
        if not quote_row:
            raise HTTPException(status_code=500, detail="Failed to create quote.")

        quote_id = quote_row["id"]
        created_items: List[Dict[str, object]] = []

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

        for calculated in calculated_items:
            if has_pricing_breakdown:
                cursor.execute(
                    """
                    INSERT INTO quote_items (
                      quote_id,
                      product_id,
                      product_variant_id,
                      item_name,
                      description,
                      quantity,
                      unit_price,
                      discount_amount,
                      line_total,
                      pricing_breakdown
                    )
                    VALUES (
                      %s::uuid,
                      %s::uuid,
                      %s::uuid,
                      %s,
                      %s,
                      %s,
                      %s,
                      %s,
                      %s,
                      %s::jsonb
                    )
                    RETURNING
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
                      pricing_breakdown,
                      created_at::text,
                      updated_at::text
                    """,
                    (
                        quote_id,
                        calculated["product_id"],
                        calculated["product_variant_id"],
                        calculated["item_name"],
                        calculated["description"],
                        calculated["quantity"],
                        calculated["unit_price"],
                        calculated["discount_amount"],
                        calculated["line_total"],
                        json.dumps(calculated["pricing_breakdown"]),
                    ),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO quote_items (
                      quote_id,
                      product_id,
                      product_variant_id,
                      item_name,
                      description,
                      quantity,
                      unit_price,
                      discount_amount,
                      line_total
                    )
                    VALUES (
                      %s::uuid,
                      %s::uuid,
                      %s::uuid,
                      %s,
                      %s,
                      %s,
                      %s,
                      %s,
                      %s
                    )
                    RETURNING
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
                      '{}'::jsonb AS pricing_breakdown,
                      created_at::text,
                      updated_at::text
                    """,
                    (
                        quote_id,
                        calculated["product_id"],
                        calculated["product_variant_id"],
                        calculated["item_name"],
                        calculated["description"],
                        calculated["quantity"],
                        calculated["unit_price"],
                        calculated["discount_amount"],
                        calculated["line_total"],
                    ),
                )
            item_row = cursor.fetchone()
            if not item_row:
                raise HTTPException(status_code=500, detail="Failed to create quote item.")
            created_items.append(item_row)

        create_activity(
            connection=connection,
            activity_type="quote_generated",
            title="Quote generated",
            customer_id=payload.customer_id,
            lead_id=payload.lead_id,
            deal_id=payload.deal_id,
            quote_id=quote_id,
            details=f"Quote {quote_row['quote_number']} generated with deterministic pricing engine.",
            metadata={
                "quoteNumber": quote_row["quote_number"],
                "itemCount": len(created_items),
                "subtotal": float(subtotal),
                "taxAmount": float(tax_amount),
                "discountAmount": float(discount_amount),
                "totalAmount": float(total_amount),
            },
        )

        if payload.lead_id:
            cursor.execute(
                """
                UPDATE leads
                SET status = 'quoted', updated_at = NOW()
                WHERE id = %s::uuid
                  AND status IN ('new', 'qualified')
                """,
                (payload.lead_id,),
            )
        if payload.deal_id:
            cursor.execute(
                """
                UPDATE deals
                SET stage = 'quoted', updated_at = NOW()
                WHERE id = %s::uuid
                  AND stage IN ('new', 'qualified', 'negotiation')
                """,
                (payload.deal_id,),
            )

    return quote_row, created_items
