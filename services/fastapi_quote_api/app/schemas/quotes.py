from __future__ import annotations

from datetime import date
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class QuoteLineItemCreateRequest(BaseModel):
    product_id: str
    product_variant_id: Optional[str] = None
    quantity: int = Field(gt=0)
    customization_cost_per_unit: float = Field(default=0, ge=0)
    customization_flat_cost: float = Field(default=0, ge=0)
    is_rush: Optional[bool] = None
    requested_delivery_days: Optional[int] = Field(default=None, gt=0)
    rush_fee_pct: float = Field(default=0, ge=0, le=100)
    margin_pct: float = Field(default=0, ge=0, le=100)
    note: Optional[str] = None


class QuoteCreateRequest(BaseModel):
    customer_id: str
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    created_by_user_id: Optional[str] = None
    currency: str = "AED"
    valid_until: Optional[date] = None
    terms: Optional[str] = None
    notes: Optional[str] = None
    discount_amount: float = Field(default=0, ge=0)
    tax_pct: float = Field(default=0, ge=0, le=100)
    items: List[QuoteLineItemCreateRequest] = Field(min_length=1)


class QuoteLineItemResponse(BaseModel):
    id: str
    quote_id: str
    product_id: Optional[str] = None
    product_variant_id: Optional[str] = None
    item_name: str
    description: Optional[str] = None
    quantity: int
    unit_price: float
    discount_amount: float
    line_total: float
    pricing_breakdown: Dict[str, object]
    created_at: str
    updated_at: str


class QuoteResponse(BaseModel):
    id: str
    quote_number: str
    customer_id: str
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    created_by_user_id: Optional[str] = None
    status: str
    currency: str
    subtotal: float
    tax_amount: float
    discount_amount: float
    total_amount: float
    valid_until: Optional[str] = None
    terms: Optional[str] = None
    notes: Optional[str] = None
    created_at: str
    updated_at: str


class QuoteCreateResponse(BaseModel):
    item: QuoteResponse
    items: List[QuoteLineItemResponse]
