from __future__ import annotations

from uuid import UUID

import psycopg
from fastapi import HTTPException
from psycopg.rows import dict_row

from app.core.config import DATABASE_URL
from app.core.tenant import current_tenant_value


def _normalize_tenant_value(value: str) -> str:
    return (value or "").strip()


def _looks_like_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except Exception:
        return False


def _resolve_tenant_id(connection: psycopg.Connection, tenant_value: str) -> str:
    normalized = _normalize_tenant_value(tenant_value)
    if not normalized:
        return ""
    if _looks_like_uuid(normalized):
        return normalized

    with connection.cursor() as cursor:
        cursor.execute("SELECT to_regclass('public.tenants') IS NOT NULL AS exists")
        row = cursor.fetchone()
        exists = bool(row["exists"]) if row and isinstance(row, dict) else bool(row and row[0])
        if not exists:
            return ""

        cursor.execute(
            """
            SELECT id::text
            FROM tenants
            WHERE slug = %s
            LIMIT 1
            """,
            (normalized,),
        )
        match = cursor.fetchone()
        if not match:
            return ""
        return str(match["id"]) if isinstance(match, dict) else str(match[0])


def get_db_connection() -> psycopg.Connection:
    if not DATABASE_URL:
        raise HTTPException(status_code=500, detail="DATABASE_URL is not configured.")
    connection = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    tenant_id = _resolve_tenant_id(connection, current_tenant_value())
    if tenant_id:
        with connection.cursor() as cursor:
            cursor.execute("SELECT set_config('app.tenant_id', %s, false)", (tenant_id,))
    return connection
