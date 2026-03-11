from __future__ import annotations

from contextvars import ContextVar
from typing import Optional

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import DEFAULT_TENANT_SLUG

tenant_context: ContextVar[str] = ContextVar("tenant_context", default="")


def current_tenant_value() -> str:
    return tenant_context.get().strip()


def set_current_tenant_value(value: Optional[str]):
    normalized = (value or "").strip()
    if not normalized:
        normalized = DEFAULT_TENANT_SLUG
    return tenant_context.set(normalized)


def reset_current_tenant_value(token) -> None:
    tenant_context.reset(token)


class TenantContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        tenant_value = (
            request.headers.get("x-tenant-id")
            or request.headers.get("x-tenant-slug")
            or DEFAULT_TENANT_SLUG
        )
        token = set_current_tenant_value(tenant_value)
        try:
            response = await call_next(request)
            response.headers["X-Tenant-Context"] = current_tenant_value() or DEFAULT_TENANT_SLUG
            return response
        finally:
            tenant_context.reset(token)
