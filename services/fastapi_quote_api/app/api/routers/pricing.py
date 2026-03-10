from __future__ import annotations

from typing import Dict

from fastapi import APIRouter

from app.core.db import get_db_connection
from app.schemas.pricing import PricingCalculateRequest, PricingCalculateResponse
from app.services.pricing import calculate_price

router = APIRouter(prefix="/api/v1", tags=["pricing"])


@router.post("/pricing/calculate", response_model=PricingCalculateResponse)
def calculate_pricing(payload: PricingCalculateRequest) -> Dict[str, object]:
    with get_db_connection() as connection:
        item = calculate_price(connection, payload)
    return {"item": item}
