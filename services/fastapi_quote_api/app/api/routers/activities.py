from __future__ import annotations

from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.core.db import get_db_connection
from app.services.activities import get_activity_by_id, list_activities

router = APIRouter(prefix="/api/v1", tags=["activities"])


@router.get("/activities")
def get_activities(
    activity_type: Optional[str] = Query(default=None),
    lead_id: Optional[str] = Query(default=None),
    deal_id: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> Dict[str, List[Dict]]:
    try:
        with get_db_connection() as connection:
            items = list_activities(
                connection=connection,
                activity_type=activity_type,
                lead_id=lead_id,
                deal_id=deal_id,
                limit=limit,
            )
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activities: {error}") from error

    return {"items": items}


@router.get("/activities/{activity_id}")
def view_activity(activity_id: str) -> Dict[str, object]:
    try:
        with get_db_connection() as connection:
            item = get_activity_by_id(connection, activity_id)
            if not item:
                raise HTTPException(status_code=404, detail="Activity not found.")
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activity: {error}") from error

    return {"item": item}
