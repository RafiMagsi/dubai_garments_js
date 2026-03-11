from __future__ import annotations

from pydantic import BaseModel, Field


class DemoDataSeedRequest(BaseModel):
    leads: int = Field(default=40, ge=1, le=1000)
    deals: int = Field(default=28, ge=1, le=1000)
    quotes: int = Field(default=22, ge=1, le=1000)
