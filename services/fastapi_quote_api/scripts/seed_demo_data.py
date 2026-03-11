from __future__ import annotations

import argparse
import json
import random
import string
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence, Tuple

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row


ROOT = Path(__file__).resolve().parents[1]
load_dotenv(ROOT / ".env")


LEAD_STATUSES = ("new", "qualified", "quoted", "won", "lost")
DEAL_STAGES = ("new", "qualified", "quoted", "negotiation", "won", "lost")
QUOTE_STATUSES = ("draft", "sent", "approved", "rejected", "expired")
CATEGORIES = ("Polos", "T-Shirts", "Jerseys", "Hoodies", "Workwear")

FIRST_NAMES = (
    "Ahmed",
    "Hassan",
    "Fatima",
    "Zara",
    "Omar",
    "Ali",
    "Noor",
    "Mariam",
    "Imran",
    "Yasmin",
    "Bilal",
    "Ayesha",
)
LAST_NAMES = (
    "Khan",
    "Rahman",
    "Malik",
    "Siddiqui",
    "Farooq",
    "Qureshi",
    "Ansari",
    "Hussain",
    "Ibrahim",
    "Latif",
)
COMPANY_TOKENS = (
    "Trading",
    "Textiles",
    "Logistics",
    "Foods",
    "Retail",
    "Contracting",
    "Technologies",
    "Enterprises",
    "Solutions",
    "Holdings",
)
LEAD_NOTES_TEMPLATES = (
    "Need {qty} {product} for staff uniforms before {timeline}.",
    "Looking for branded {product}. Quantity around {qty}.",
    "Corporate event order: {qty} units with logo embroidery.",
    "Urgent requirement for {product}; need delivery by {timeline}.",
    "Please share quote for {qty}+ pieces in mixed sizes.",
)


def _decimal(value: float | int | str) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _random_code(length: int = 6) -> str:
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=length))


def _quote_number() -> str:
    return f"Q-{date.today().strftime('%Y%m%d')}-{_random_code(6)}"


def _pick_weighted(pairs: Sequence[Tuple[str, int]]) -> str:
    options = [name for name, _ in pairs]
    weights = [weight for _, weight in pairs]
    return random.choices(options, weights=weights, k=1)[0]


def _product_from_price_tiers(price_tiers: Any) -> Optional[Decimal]:
    if not isinstance(price_tiers, list):
        return None
    min_value: Optional[Decimal] = None
    for row in price_tiers:
        if not isinstance(row, dict):
            continue
        for key in ("price", "unit_price", "unitPrice", "min_unit_price"):
            raw = row.get(key)
            if raw is None:
                continue
            try:
                price = _decimal(raw)
            except Exception:
                continue
            if min_value is None or price < min_value:
                min_value = price
    return min_value


@dataclass
class ProductRow:
    id: str
    name: str
    category: str
    tier_price: Optional[Decimal]


@dataclass
class VariantRow:
    id: str
    product_id: str
    variant_name: str
    unit_price: Decimal


def _connect(database_url: str) -> psycopg.Connection:
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured in services/fastapi_quote_api/.env")
    return psycopg.connect(database_url, row_factory=dict_row)


def _load_users(cursor: psycopg.Cursor[Any]) -> List[str]:
    cursor.execute("SELECT id::text FROM users WHERE is_active = true ORDER BY created_at ASC")
    rows = cursor.fetchall()
    return [row["id"] for row in rows]


def _load_products(cursor: psycopg.Cursor[Any]) -> Dict[str, ProductRow]:
    cursor.execute(
        """
        SELECT id::text, name, category, price_tiers
        FROM products
        WHERE is_active = true
        ORDER BY created_at ASC
        """
    )
    rows = cursor.fetchall()
    result: Dict[str, ProductRow] = {}
    for row in rows:
        result[row["id"]] = ProductRow(
            id=row["id"],
            name=row["name"],
            category=row.get("category") or "Garments",
            tier_price=_product_from_price_tiers(row.get("price_tiers")),
        )
    return result


def _load_variants(cursor: psycopg.Cursor[Any]) -> List[VariantRow]:
    cursor.execute(
        """
        SELECT id::text, product_id::text, variant_name, unit_price::float8
        FROM product_variants
        WHERE is_active = true
        ORDER BY created_at ASC
        """
    )
    rows = cursor.fetchall()
    return [
        VariantRow(
            id=row["id"],
            product_id=row["product_id"],
            variant_name=row["variant_name"],
            unit_price=_decimal(row["unit_price"]),
        )
        for row in rows
    ]


def _create_customer(cursor: psycopg.Cursor[Any], owner_user_id: Optional[str]) -> str:
    first = random.choice(FIRST_NAMES)
    last = random.choice(LAST_NAMES)
    company = f"{last} {random.choice(COMPANY_TOKENS)} LLC"
    email = f"{first.lower()}.{last.lower()}.{_random_code(3).lower()}@example.com"
    phone = f"+9715{random.randint(10000000, 99999999)}"
    cursor.execute(
        """
        INSERT INTO customers (
          company_name,
          contact_name,
          email,
          phone,
          industry,
          notes,
          owner_user_id
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s::uuid)
        RETURNING id::text
        """,
        (
            company,
            f"{first} {last}",
            email,
            phone,
            random.choice(CATEGORIES),
            "DEMO customer generated by seed_demo_data.py",
            owner_user_id,
        ),
    )
    row = cursor.fetchone()
    if not row:
        raise RuntimeError("Failed to create demo customer.")
    return row["id"]


def _create_lead(cursor: psycopg.Cursor[Any], customer_id: str, owner_user_id: Optional[str], product_name: str) -> Dict[str, Any]:
    status = _pick_weighted(
        [
            ("new", 28),
            ("qualified", 32),
            ("quoted", 22),
            ("won", 10),
            ("lost", 8),
        ]
    )
    quantity = random.choice([40, 60, 80, 120, 150, 200, 300, 500, 750, 1000])
    delivery_days = random.choice([5, 7, 10, 14, 21, 30])
    timeline = date.today() + timedelta(days=delivery_days)
    note = random.choice(LEAD_NOTES_TEMPLATES).format(
        qty=quantity,
        product=product_name,
        timeline=timeline.isoformat(),
    )
    ai_score = random.randint(35, 95)
    ai_classification = "HOT" if ai_score >= 75 else ("WARM" if ai_score >= 55 else "COLD")

    contact_first = random.choice(FIRST_NAMES)
    contact_last = random.choice(LAST_NAMES)
    email = f"{contact_first.lower()}.{contact_last.lower()}.{_random_code(3).lower()}@example.com"

    cursor.execute(
        """
        INSERT INTO leads (
          customer_id,
          assigned_to_user_id,
          source,
          status,
          lead_score,
          company_name,
          contact_name,
          email,
          phone,
          requested_qty,
          budget,
          timeline_date,
          notes,
          ai_product,
          ai_quantity,
          ai_urgency,
          ai_complexity,
          ai_processed_at,
          ai_provider,
          ai_fallback_used,
          ai_score,
          ai_classification,
          ai_reasoning
        )
        VALUES (
          %s::uuid,
          %s::uuid,
          'demo_seeder',
          %s,
          %s,
          (SELECT company_name FROM customers WHERE id = %s::uuid),
          %s,
          %s,
          %s,
          %s,
          %s,
          %s::date,
          %s,
          %s,
          %s,
          %s,
          %s,
          NOW(),
          'system',
          true,
          %s,
          %s,
          %s::jsonb
        )
        RETURNING id::text, status, customer_id::text, company_name, contact_name
        """,
        (
            customer_id,
            owner_user_id,
            status,
            ai_score,
            customer_id,
            f"{contact_first} {contact_last}",
            email,
            f"+9715{random.randint(10000000, 99999999)}",
            quantity,
            _decimal(quantity * random.uniform(20, 55)),
            timeline.isoformat(),
            f"{note} [DEMO]",
            product_name,
            quantity,
            random.choice(["low", "medium", "high"]),
            random.choice(["low", "medium", "high"]),
            ai_score,
            ai_classification,
            json.dumps({"summary": "Demo AI reasoning", "signals": ["seeded"]}),
        ),
    )
    row = cursor.fetchone()
    if not row:
        raise RuntimeError("Failed to create demo lead.")
    row["requested_qty"] = quantity
    return row


def _create_deal(cursor: psycopg.Cursor[Any], lead: Dict[str, Any], owner_user_id: Optional[str]) -> Dict[str, Any]:
    stage = _pick_weighted(
        [
            ("new", 15),
            ("qualified", 25),
            ("quoted", 30),
            ("negotiation", 18),
            ("won", 8),
            ("lost", 4),
        ]
    )
    expected_value = _decimal((lead.get("requested_qty") or 120) * random.uniform(18, 60))
    close_days = random.choice([7, 10, 14, 20, 30, 45])
    expected_close = date.today() + timedelta(days=close_days)
    probability_map = {
        "new": 20,
        "qualified": 40,
        "quoted": 60,
        "negotiation": 75,
        "won": 100,
        "lost": 0,
    }

    cursor.execute(
        """
        INSERT INTO deals (
          lead_id,
          customer_id,
          owner_user_id,
          title,
          stage,
          expected_value,
          probability_pct,
          expected_close_date,
          won_at,
          lost_reason,
          notes
        )
        VALUES (
          %s::uuid,
          %s::uuid,
          %s::uuid,
          %s,
          %s,
          %s,
          %s,
          %s::date,
          CASE WHEN %s = 'won' THEN NOW() ELSE NULL END,
          CASE WHEN %s = 'lost' THEN 'Price mismatch (demo)' ELSE NULL END,
          %s
        )
        RETURNING id::text, stage, customer_id::text, lead_id::text
        """,
        (
            lead["id"],
            lead["customer_id"],
            owner_user_id,
            f"DEMO - Bulk order for {lead.get('company_name') or 'customer'}",
            stage,
            expected_value,
            probability_map.get(stage, 0),
            expected_close.isoformat(),
            stage,
            stage,
            "Demo deal generated by seeder.",
        ),
    )
    row = cursor.fetchone()
    if not row:
        raise RuntimeError("Failed to create demo deal.")
    return row


def _select_variant_for_quote(
    products: Dict[str, ProductRow],
    variants: List[VariantRow],
) -> Tuple[Optional[ProductRow], Optional[VariantRow], Decimal]:
    if variants:
        variant = random.choice(variants)
        product = products.get(variant.product_id)
        if product:
            return product, variant, variant.unit_price

    if products:
        product = random.choice(list(products.values()))
        unit_price = product.tier_price or _decimal(random.uniform(18, 65))
        return product, None, unit_price

    return None, None, _decimal(random.uniform(20, 55))


def _create_quote(
    cursor: psycopg.Cursor[Any],
    customer_id: str,
    lead_id: Optional[str],
    deal_id: Optional[str],
    user_id: Optional[str],
    products: Dict[str, ProductRow],
    variants: List[VariantRow],
) -> Dict[str, Any]:
    status = _pick_weighted(
        [
            ("draft", 20),
            ("sent", 30),
            ("approved", 20),
            ("rejected", 15),
            ("expired", 15),
        ]
    )
    quote_number = _quote_number()
    subtotal = _decimal(0)
    tax_rate = Decimal("0.05")
    discount_amount = _decimal(random.choice([0, 0, 0, 25, 50, 75, 100]))

    line_items: List[Dict[str, Any]] = []
    for _ in range(random.randint(1, 3)):
        product, variant, unit_price = _select_variant_for_quote(products, variants)
        quantity = random.choice([50, 75, 100, 150, 200, 300, 500])
        line_total = _decimal(unit_price * quantity)
        subtotal += line_total
        line_items.append(
            {
                "product_id": product.id if product else None,
                "variant_id": variant.id if variant else None,
                "item_name": (variant.variant_name if variant else (product.name if product else "Custom Garment")),
                "description": (
                    f"{product.category} bulk order (demo)"
                    if product
                    else "Bulk garment order (demo)"
                ),
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total,
            }
        )

    taxable = subtotal - discount_amount
    if taxable < 0:
        taxable = _decimal(0)
    tax_amount = _decimal(taxable * tax_rate)
    total_amount = _decimal(taxable + tax_amount)
    valid_until = date.today() + timedelta(days=random.choice([7, 10, 14, 21, 30]))

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
          notes,
          sent_at,
          approved_at,
          rejected_at
        )
        VALUES (
          %s,
          %s::uuid,
          %s::uuid,
          %s::uuid,
          %s::uuid,
          %s,
          'AED',
          %s,
          %s,
          %s,
          %s,
          %s::date,
          %s,
          %s,
          CASE WHEN %s = 'sent' THEN NOW() ELSE NULL END,
          CASE WHEN %s = 'approved' THEN NOW() ELSE NULL END,
          CASE WHEN %s IN ('rejected', 'expired') THEN NOW() ELSE NULL END
        )
        RETURNING id::text, quote_number, status
        """,
        (
            quote_number,
            customer_id,
            lead_id,
            deal_id,
            user_id,
            status,
            subtotal,
            tax_amount,
            discount_amount,
            total_amount,
            valid_until.isoformat(),
            "50% advance payment. Delivery within agreed timeline.",
            "DEMO quote generated by seed_demo_data.py",
            status,
            status,
            status,
        ),
    )
    quote = cursor.fetchone()
    if not quote:
        raise RuntimeError("Failed to create demo quote.")

    for item in line_items:
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
              0,
              %s,
              %s::jsonb
            )
            """,
            (
                quote["id"],
                item["product_id"],
                item["variant_id"],
                item["item_name"],
                item["description"],
                item["quantity"],
                item["unit_price"],
                item["line_total"],
                json.dumps(
                    {
                        "baseUnitPrice": float(item["unit_price"]),
                        "quantity": item["quantity"],
                        "discountAmount": 0,
                        "lineTotal": float(item["line_total"]),
                        "source": "demo_seeder",
                    }
                ),
            ),
        )

    return quote


def seed_demo_data(database_url: str, leads_count: int, deals_count: int, quotes_count: int) -> None:
    random.seed()
    with _connect(database_url) as connection:
        with connection.cursor() as cursor:
            users = _load_users(cursor)
            if not users:
                raise RuntimeError("No active users found. Seed users first before running demo seeder.")
            products = _load_products(cursor)
            variants = _load_variants(cursor)

            created_leads: List[Dict[str, Any]] = []
            created_deals: List[Dict[str, Any]] = []
            customer_ids: List[str] = []

            for _ in range(leads_count):
                owner = random.choice(users)
                if customer_ids and random.random() < 0.45:
                    customer_id = random.choice(customer_ids)
                else:
                    customer_id = _create_customer(cursor, owner)
                    customer_ids.append(customer_id)
                product_name = (
                    random.choice(list(products.values())).name
                    if products
                    else f"{random.choice(CATEGORIES)} Garment"
                )
                lead = _create_lead(
                    cursor=cursor,
                    customer_id=customer_id,
                    owner_user_id=owner,
                    product_name=product_name,
                )
                created_leads.append(lead)

            lead_pool = created_leads[:]
            random.shuffle(lead_pool)
            for lead in lead_pool[: min(deals_count, len(lead_pool))]:
                owner = random.choice(users)
                deal = _create_deal(cursor=cursor, lead=lead, owner_user_id=owner)
                created_deals.append(deal)

            quote_candidates: List[Tuple[str, Optional[str], Optional[str], Optional[str]]] = []
            for deal in created_deals:
                quote_candidates.append((deal["customer_id"], deal.get("lead_id"), deal["id"], random.choice(users)))
            for lead in created_leads:
                quote_candidates.append((lead["customer_id"], lead["id"], None, random.choice(users)))
            random.shuffle(quote_candidates)

            created_quotes = 0
            for customer_id, lead_id, deal_id, user_id in quote_candidates:
                if created_quotes >= quotes_count:
                    break
                _create_quote(
                    cursor=cursor,
                    customer_id=customer_id,
                    lead_id=lead_id,
                    deal_id=deal_id,
                    user_id=user_id,
                    products=products,
                    variants=variants,
                )
                created_quotes += 1

        connection.commit()

    print(
        f"Demo data seeded successfully: leads={leads_count}, deals={min(deals_count, leads_count)}, quotes={quotes_count}"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed realistic demo leads, deals, and quotes.")
    parser.add_argument("--database-url", default="", help="Override DATABASE_URL")
    parser.add_argument("--leads", type=int, default=40, help="How many demo leads to create")
    parser.add_argument("--deals", type=int, default=28, help="How many demo deals to create")
    parser.add_argument("--quotes", type=int, default=22, help="How many demo quotes to create")
    args = parser.parse_args()

    if args.leads < 0 or args.deals < 0 or args.quotes < 0:
        raise SystemExit("Counts must be >= 0")

    database_url = args.database_url
    if not database_url:
        from app.core.config import DATABASE_URL  # local import to ensure dotenv is loaded

        database_url = DATABASE_URL

    seed_demo_data(
        database_url=database_url,
        leads_count=args.leads,
        deals_count=args.deals,
        quotes_count=args.quotes,
    )


if __name__ == "__main__":
    main()
