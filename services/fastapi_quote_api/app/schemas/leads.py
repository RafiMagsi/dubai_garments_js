from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class LeadCreateRequest(BaseModel):
    customer_id: Optional[str] = None
    assigned_to_user_id: Optional[str] = None
    source: str = "website"
    status: str = "new"
    lead_score: Optional[int] = None
    company_name: Optional[str] = None
    contact_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    requested_qty: Optional[int] = None
    budget: Optional[float] = None
    timeline_date: Optional[date] = None
    notes: Optional[str] = None


class LeadUpdateRequest(BaseModel):
    assigned_to_user_id: Optional[str] = None
    lead_score: Optional[int] = None
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    requested_qty: Optional[int] = None
    budget: Optional[float] = None
    timeline_date: Optional[date] = None
    notes: Optional[str] = None


class LeadStatusUpdateRequest(BaseModel):
    status: str
    notes: Optional[str] = None


class LeadSendEmailRequest(BaseModel):
    recipient_email: str
    subject: str
    message: str
