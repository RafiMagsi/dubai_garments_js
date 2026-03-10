from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple

import psycopg
from fastapi import HTTPException

from app.schemas.pricing import PricingCalculateRequest

TWOPLACES = Decimal("0.01")


def _as_money(value: Decimal) -> Decimal:
    return value.quantize(TWOPLACES, rounding=ROUND_HALF_UP)


def _to_decimal(value: Any) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(value))


def _normalize_price_tiers(raw_tiers: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_tiers, list):
        return []

    normalized: List[Dict[str, Any]] = []
    for tier in raw_tiers:
        if not isinstance(tier, dict):
            continue

        min_qty = tier.get("min_qty", tier.get("minQty"))
        max_qty = tier.get("max_qty", tier.get("maxQty"))
        unit_price = tier.get(
            "unit_price",
            tier.get("unitPrice", tier.get("unitPriceAED")),
        )

        if min_qty is None or unit_price is None:
            continue

        try:
            min_qty_int = int(min_qty)
            max_qty_int = int(max_qty) if max_qty is not None else None
            unit_price_decimal = _to_decimal(unit_price)
        except (TypeError, ValueError):
            continue

        if min_qty_int <= 0 or unit_price_decimal < 0:
            continue
        if max_qty_int is not None and max_qty_int < min_qty_int:
            continue

        normalized.append(
            {
                "min_qty": min_qty_int,
                "max_qty": max_qty_int,
                "unit_price": unit_price_decimal,
            }
        )

    normalized.sort(key=lambda t: t["min_qty"])
    return normalized


def _select_tier_for_quantity(
    tiers: List[Dict[str, Any]], quantity: int
) -> Optional[Dict[str, Any]]:
    if not tiers:
        return None

    exact_matches = [
        tier
        for tier in tiers
        if quantity >= tier["min_qty"]
        and (tier["max_qty"] is None or quantity <= tier["max_qty"])
    ]
    if exact_matches:
        return exact_matches[-1]

    fallback_matches = [tier for tier in tiers if quantity >= tier["min_qty"]]
    if fallback_matches:
        return fallback_matches[-1]

    return tiers[0]


def _fetch_pricing_context(
    connection: psycopg.Connection, product_id: str, product_variant_id: Optional[str]
) -> Dict[str, Any]:
    with connection.cursor() as cursor:
        if product_variant_id:
            cursor.execute(
                """
                SELECT
                  p.id::text AS product_id,
                  p.min_order_qty,
                  p.lead_time_days,
                  p.price_tiers,
                  p.is_active AS product_active,
                  pv.id::text AS product_variant_id,
                  pv.unit_price::float8 AS variant_unit_price,
                  pv.is_active AS variant_active
                FROM products p
                JOIN product_variants pv ON pv.product_id = p.id
                WHERE p.id = %s::uuid
                  AND pv.id = %s::uuid
                """,
                (product_id, product_variant_id),
            )
        else:
            cursor.execute(
                """
                SELECT
                  p.id::text AS product_id,
                  p.min_order_qty,
                  p.lead_time_days,
                  p.price_tiers,
                  p.is_active AS product_active,
                  NULL::text AS product_variant_id,
                  NULL::float8 AS variant_unit_price,
                  NULL::bool AS variant_active
                FROM products p
                WHERE p.id = %s::uuid
                """,
                (product_id,),
            )

        row = cursor.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Product or variant not found.")
    if not row["product_active"]:
        raise HTTPException(status_code=422, detail="Product is not active.")
    if product_variant_id and not row["variant_active"]:
        raise HTTPException(status_code=422, detail="Product variant is not active.")

    return row


def calculate_price(
    connection: psycopg.Connection, payload: PricingCalculateRequest
) -> Dict[str, Any]:
    context = _fetch_pricing_context(connection, payload.product_id, payload.product_variant_id)

    min_order_qty = int(context["min_order_qty"] or 1)
    lead_time_days = int(context["lead_time_days"] or 7)
    quantity = int(payload.quantity)

    if quantity < min_order_qty:
        raise HTTPException(
            status_code=422,
            detail=f"Quantity must be at least min_order_qty ({min_order_qty}).",
        )

    tiers = _normalize_price_tiers(context.get("price_tiers"))
    selected_tier = _select_tier_for_quantity(tiers, quantity)

    base_price_source = "tier"
    if selected_tier:
        unit_base_price = selected_tier["unit_price"]
    elif context.get("variant_unit_price") is not None:
        base_price_source = "variant"
        unit_base_price = _to_decimal(context["variant_unit_price"])
    else:
        raise HTTPException(
            status_code=422,
            detail="No base price found. Provide product price_tiers or select a priced variant.",
        )

    quantity_decimal = Decimal(quantity)
    customization_cost_per_unit = _to_decimal(payload.customization_cost_per_unit)
    customization_flat_cost = _to_decimal(payload.customization_flat_cost)
    rush_fee_pct = _to_decimal(payload.rush_fee_pct)
    margin_pct = _to_decimal(payload.margin_pct)

    base_subtotal = _as_money(unit_base_price * quantity_decimal)
    customization_subtotal = _as_money(
        customization_cost_per_unit * quantity_decimal + customization_flat_cost
    )

    rush_applied = bool(payload.is_rush)
    if payload.is_rush is None and payload.requested_delivery_days is not None:
        rush_applied = payload.requested_delivery_days < lead_time_days

    rush_fee_amount = (
        _as_money((base_subtotal + customization_subtotal) * (rush_fee_pct / Decimal("100")))
        if rush_applied
        else Decimal("0.00")
    )

    pre_margin_subtotal = _as_money(base_subtotal + customization_subtotal + rush_fee_amount)
    margin_amount = _as_money(pre_margin_subtotal * (margin_pct / Decimal("100")))
    total_amount = _as_money(pre_margin_subtotal + margin_amount)

    tier_result: Optional[Dict[str, Any]] = None
    if selected_tier:
        tier_result = {
            "min_qty": int(selected_tier["min_qty"]),
            "max_qty": (
                int(selected_tier["max_qty"])
                if selected_tier["max_qty"] is not None
                else None
            ),
            "unit_price": float(_as_money(selected_tier["unit_price"])),
        }

    return {
        "product_id": context["product_id"],
        "product_variant_id": context["product_variant_id"],
        "currency": payload.currency.strip().upper() or "AED",
        "quantity": quantity,
        "min_order_qty": min_order_qty,
        "lead_time_days": lead_time_days,
        "base_price_source": base_price_source,
        "selected_tier": tier_result,
        "unit_base_price": float(_as_money(unit_base_price)),
        "base_subtotal": float(base_subtotal),
        "customization_cost_per_unit": float(_as_money(customization_cost_per_unit)),
        "customization_flat_cost": float(_as_money(customization_flat_cost)),
        "customization_subtotal": float(customization_subtotal),
        "rush_applied": rush_applied,
        "rush_fee_pct": float(_as_money(rush_fee_pct)),
        "rush_fee_amount": float(rush_fee_amount),
        "pre_margin_subtotal": float(pre_margin_subtotal),
        "margin_pct": float(_as_money(margin_pct)),
        "margin_amount": float(margin_amount),
        "total_amount": float(total_amount),
    }
