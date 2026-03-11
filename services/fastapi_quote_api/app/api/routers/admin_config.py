from __future__ import annotations

from typing import Dict, Optional

from fastapi import APIRouter, Header, HTTPException

from app.core.config import AUTOMATION_SHARED_SECRET, DATABASE_URL
from app.core.db import get_db_connection
from app.schemas.admin_config import DemoDataSeedRequest
from app.services.email import create_automation_run, finish_automation_run
from scripts.seed_demo_data import seed_demo_data

router = APIRouter(prefix="/api/v1/admin/config", tags=["admin-config"])


def _enforce_automation_token(token: Optional[str]) -> None:
    expected = AUTOMATION_SHARED_SECRET.strip()
    if not expected:
        return
    if not token or token.strip() != expected:
        raise HTTPException(status_code=401, detail="Invalid automation token.")


@router.post("/demo-data/seed")
def seed_demo_data_route(
    payload: DemoDataSeedRequest,
    x_automation_token: Optional[str] = Header(default=None),
) -> Dict[str, object]:
    _enforce_automation_token(x_automation_token)

    with get_db_connection() as connection:
        run_id = create_automation_run(
            connection=connection,
            workflow_name="demo_data_seed",
            trigger_source="manual",
            trigger_entity_type="system",
            trigger_entity_id=None,
            request_payload={"leads": payload.leads, "deals": payload.deals, "quotes": payload.quotes},
        )
        connection.commit()
        try:
            seed_demo_data(
                database_url=DATABASE_URL,
                leads_count=payload.leads,
                deals_count=payload.deals,
                quotes_count=payload.quotes,
            )
            finish_automation_run(
                connection=connection,
                run_id=run_id,
                status="success",
                response_payload={"leads": payload.leads, "deals": payload.deals, "quotes": payload.quotes},
            )
            connection.commit()
            return {
                "ok": True,
                "message": "Demo data seeded successfully.",
                "leads": payload.leads,
                "deals": payload.deals,
                "quotes": payload.quotes,
            }
        except Exception as error:
            connection.rollback()
            finish_automation_run(
                connection=connection,
                run_id=run_id,
                status="failed",
                error_message=str(error),
            )
            connection.commit()
            raise HTTPException(status_code=500, detail=f"Demo data seeding failed: {error}") from error
