from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class FollowupSweepRequest(BaseModel):
    limit: Optional[int] = None


class DigestReportRequest(BaseModel):
    recipient_email: Optional[str] = None


class ColdLeadDetectionRequest(BaseModel):
    threshold_days: Optional[int] = None
    limit: Optional[int] = None

