from __future__ import annotations

import psycopg
from fastapi import HTTPException
from psycopg.rows import dict_row

from app.core.config import DATABASE_URL


def get_db_connection() -> psycopg.Connection:
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured.")
    return psycopg.connect(DATABASE_URL, row_factory=dict_row)
