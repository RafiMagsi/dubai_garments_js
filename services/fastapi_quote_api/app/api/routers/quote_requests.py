from __future__ import annotations

from datetime import date
from pathlib import Path
from typing import Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.core.config import UPLOAD_DIR
from app.core.db import get_db_connection
from app.services.leads import track_lead_activity
from app.services.utils import to_lead_code

router = APIRouter(prefix="/api/v1", tags=["quote-requests"])


@router.post("/quote-requests")
async def create_quote_request(
    name: str = Form(...),
    email: str = Form(...),
    company: str = Form(...),
    product: str = Form(...),
    quantity: int = Form(...),
    delivery_date: Optional[date] = Form(None),
    message: Optional[str] = Form(None),
    file_upload: Optional[UploadFile] = File(None),
) -> Dict[str, str]:
    if quantity <= 0:
        raise HTTPException(status_code=422, detail="Quantity must be greater than 0.")

    attachment_path: Optional[str] = None

    if file_upload and file_upload.filename:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        safe_name = Path(file_upload.filename).name
        target_name = f"{uuid4().hex}_{safe_name}"
        target_path = UPLOAD_DIR / target_name
        target_path.write_bytes(await file_upload.read())
        attachment_path = str(target_path)

    notes_parts = [f"Product: {product}"]
    if message:
        notes_parts.append(f"Message: {message}")
    if attachment_path:
        notes_parts.append(f"Attachment: {attachment_path}")
    notes = "\n".join(notes_parts)

    insert_sql = """
        INSERT INTO leads (
            source,
            status,
            contact_name,
            email,
            company_name,
            requested_qty,
            timeline_date,
            notes
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id::text
    """

    try:
        with get_db_connection() as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    insert_sql,
                    (
                        "website",
                        "new",
                        name.strip(),
                        email.strip(),
                        company.strip(),
                        quantity,
                        delivery_date,
                        notes,
                    ),
                )
                row = cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=500, detail="Failed to create lead.")
                lead_id = row["id"]

                track_lead_activity(
                    connection,
                    lead_id,
                    "lead_created",
                    "Lead created from quote request",
                    details="Lead was created from public quote request form.",
                    metadata={"source": "website", "status": "new"},
                )
            connection.commit()
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Database insert failed: {error}") from error

    return {"ok": "true", "leadId": lead_id, "leadCode": to_lead_code(lead_id)}
