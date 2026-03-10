from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class DealCreateRequest(BaseModel):
    lead_id: Optional[str] = None
    customer_id: Optional[str] = None
    owner_user_id: Optional[str] = None
    title: str
    stage: str = "new"
    expected_value: float = 0
    probability_pct: int = 0
    expected_close_date: Optional[date] = None
    notes: Optional[str] = None


class DealStageUpdateRequest(BaseModel):
    stage: str
    lost_reason: Optional[str] = None
    notes: Optional[str] = None


class DealUpdateRequest(BaseModel):
    stage: Optional[str] = None
    owner_user_id: Optional[str] = None
    expected_value: Optional[float] = None
    probability_pct: Optional[int] = None
    expected_close_date: Optional[date] = None
    notes: Optional[str] = None


class DealSendEmailRequest(BaseModel):
    recipient_email: str
    subject: str
    message: str


class ConvertLeadRequest(BaseModel):
    title: Optional[str] = None
    owner_user_id: Optional[str] = None
    expected_value: float = 0
    probability_pct: int = 20
    expected_close_date: Optional[date] = None
    notes: Optional[str] = None
