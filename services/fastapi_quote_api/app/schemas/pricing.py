from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class PricingCalculateRequest(BaseModel):
    product_id: str
    product_variant_id: Optional[str] = None
    quantity: int = Field(gt=0)
    customization_cost_per_unit: float = Field(default=0, ge=0)
    customization_flat_cost: float = Field(default=0, ge=0)
    is_rush: Optional[bool] = None
    requested_delivery_days: Optional[int] = Field(default=None, gt=0)
    rush_fee_pct: float = Field(default=0, ge=0, le=100)
    margin_pct: float = Field(default=0, ge=0, le=100)
    currency: str = "AED"


class PricingTierResult(BaseModel):
    min_qty: int
    max_qty: Optional[int] = None
    unit_price: float


class PricingBreakdownResult(BaseModel):
    product_id: str
    product_variant_id: Optional[str] = None
    currency: str
    quantity: int
    min_order_qty: int
    lead_time_days: int
    base_price_source: str
    selected_tier: Optional[PricingTierResult] = None
    unit_base_price: float
    base_subtotal: float
    customization_cost_per_unit: float
    customization_flat_cost: float
    customization_subtotal: float
    rush_applied: bool
    rush_fee_pct: float
    rush_fee_amount: float
    pre_margin_subtotal: float
    margin_pct: float
    margin_amount: float
    total_amount: float


class PricingCalculateResponse(BaseModel):
    item: PricingBreakdownResult
