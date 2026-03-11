from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class EmailSendRequest(BaseModel):
    recipient_email: str
    subject: str
    message: str
    html: Optional[str] = None
    customer_id: Optional[str] = None
    lead_id: Optional[str] = None
    deal_id: Optional[str] = None
    quote_id: Optional[str] = None
