from __future__ import annotations

from pydantic import BaseModel


class QuoteFollowupDispatchRequest(BaseModel):
    quote_id: str
    step: str  # day_2 | day_5 | day_10
