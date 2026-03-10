from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routers.activities import router as activities_router
from app.api.routers.deals import router as deals_router
from app.api.routers.health import router as health_router
from app.api.routers.leads import router as leads_router
from app.api.routers.quote_requests import router as quote_requests_router
from app.core.config import CORS_ORIGINS

app = FastAPI(title="Dubai Garments Quote API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(quote_requests_router)
app.include_router(leads_router)
app.include_router(deals_router)
app.include_router(activities_router)
