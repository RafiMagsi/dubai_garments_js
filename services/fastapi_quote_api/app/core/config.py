from __future__ import annotations

import os
from pathlib import Path
from typing import Dict, List

import psycopg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")


def _as_bool(value: str | bool | None, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    return str(value).strip().lower() in {"1", "true", "yes", "on"}


def _as_int(value: str | None, default: int) -> int:
    try:
        return int(str(value))
    except Exception:
        return default


def _as_float(value: str | None, default: float) -> float:
    try:
        return float(str(value))
    except Exception:
        return default


def _is_production_environment() -> bool:
    node_env = os.getenv("NODE_ENV", "").strip().lower()
    app_env = os.getenv("APP_ENV", os.getenv("ENV", "")).strip().lower()
    return node_env == "production" or app_env in {"prod", "production"}


def _resolve_config_mode() -> str:
    requested = os.getenv("CONFIG_MODE", "auto").strip().lower()
    if requested in {"env", "db"}:
        return requested
    return "db" if _is_production_environment() else "env"


CONFIG_MODE = _resolve_config_mode()


def _load_db_settings() -> Dict[str, str]:
    if CONFIG_MODE != "db" or not DATABASE_URL:
        return {}

    try:
        with psycopg.connect(DATABASE_URL) as connection:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT to_regclass('public.system_settings') IS NOT NULL AS exists
                    """
                )
                row = cursor.fetchone()
                if not row or row[0] is not True:
                    return {}

                cursor.execute(
                    """
                    SELECT scope, key, value
                    FROM system_settings
                    WHERE is_active = TRUE
                      AND scope IN ('global', 'fastapi')
                    ORDER BY CASE WHEN scope = 'global' THEN 0 ELSE 1 END
                    """
                )
                rows = cursor.fetchall()
    except Exception:
        return {}

    settings: Dict[str, str] = {}
    for scope, key, value in rows:
        settings[f"{scope}:{key}"] = value or ""
    return settings


_DB_SETTINGS = _load_db_settings()


def _env_or_db(key: str, default: str = "") -> str:
    env_value = os.getenv(key)
    if CONFIG_MODE == "env":
        return env_value if env_value is not None else default

    scoped = _DB_SETTINGS.get(f"fastapi:{key}")
    if scoped is not None:
        return scoped
    global_value = _DB_SETTINGS.get(f"global:{key}")
    if global_value is not None:
        return global_value
    return env_value if env_value is not None else default


UPLOAD_DIR = Path(_env_or_db("UPLOAD_DIR", "uploads"))
OPENAI_API_KEY = _env_or_db("OPENAI_API_KEY", "")
OPENAI_MODEL = _env_or_db("OPENAI_MODEL", "gpt-4o-mini")
REDIS_URL = _env_or_db("REDIS_URL", "redis://localhost:6379/0")
LEAD_AI_QUEUE_NAME = _env_or_db("LEAD_AI_QUEUE_NAME", "lead_ai")
LEAD_AI_JOB_TIMEOUT = _as_int(_env_or_db("LEAD_AI_JOB_TIMEOUT", "180"), 180)
LEAD_AI_RETRY_MAX = _as_int(_env_or_db("LEAD_AI_RETRY_MAX", "3"), 3)
QUOTE_PDF_QUEUE_NAME = _env_or_db("QUOTE_PDF_QUEUE_NAME", "quote_pdf")
QUOTE_PDF_JOB_TIMEOUT = _as_int(_env_or_db("QUOTE_PDF_JOB_TIMEOUT", "180"), 180)
QUOTE_PDF_RETRY_MAX = _as_int(_env_or_db("QUOTE_PDF_RETRY_MAX", "2"), 2)
LEAD_AI_ENABLED = _as_bool(_env_or_db("LEAD_AI_ENABLED", "true"), default=True)
CORS_ORIGINS: List[str] = [
    origin.strip()
    for origin in _env_or_db("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if origin.strip()
]

DEAL_STAGES = ("new", "qualified", "quoted", "negotiation", "won", "lost")
LEAD_STATUSES = ("new", "qualified", "quoted", "won", "lost")

STORAGE_PROVIDER = _env_or_db("STORAGE_PROVIDER", "local").strip().lower()
STORAGE_LOCAL_DIR = Path(_env_or_db("STORAGE_LOCAL_DIR", "uploads/quote_pdfs"))
STORAGE_PUBLIC_BASE_URL = _env_or_db("STORAGE_PUBLIC_BASE_URL", "http://localhost:8000")
STORAGE_S3_BUCKET = _env_or_db("STORAGE_S3_BUCKET", "")
STORAGE_S3_REGION = _env_or_db("STORAGE_S3_REGION", "auto")
STORAGE_S3_ENDPOINT = _env_or_db("STORAGE_S3_ENDPOINT", "")
STORAGE_S3_ACCESS_KEY = _env_or_db("STORAGE_S3_ACCESS_KEY", "")
STORAGE_S3_SECRET_KEY = _env_or_db("STORAGE_S3_SECRET_KEY", "")
STORAGE_S3_PUBLIC_URL_BASE = _env_or_db("STORAGE_S3_PUBLIC_URL_BASE", "")
STORAGE_S3_PRESIGNED_EXPIRY = _as_int(_env_or_db("STORAGE_S3_PRESIGNED_EXPIRY", "3600"), 3600)

EMAIL_ENABLED = _as_bool(_env_or_db("EMAIL_ENABLED", "true"), default=True)
EMAIL_PROVIDER = _env_or_db("EMAIL_PROVIDER", "log").strip().lower()
EMAIL_FROM_NAME = _env_or_db("EMAIL_FROM_NAME", "Dubai Garments")
EMAIL_FROM_ADDRESS = _env_or_db("EMAIL_FROM_ADDRESS", "no-reply@dubaigarments.ai")
ADMIN_NOTIFICATION_EMAIL = _env_or_db("ADMIN_NOTIFICATION_EMAIL", "")

RESEND_API_KEY = _env_or_db("RESEND_API_KEY", "")
SENDGRID_API_KEY = _env_or_db("SENDGRID_API_KEY", "")
SENDGRID_INBOUND_WEBHOOK_TOKEN = _env_or_db("SENDGRID_INBOUND_WEBHOOK_TOKEN", "")

SMTP_HOST = _env_or_db("SMTP_HOST", "")
SMTP_PORT = _as_int(_env_or_db("SMTP_PORT", "587"), 587)
SMTP_USERNAME = _env_or_db("SMTP_USERNAME", "")
SMTP_PASSWORD = _env_or_db("SMTP_PASSWORD", "")
SMTP_STARTTLS = _as_bool(_env_or_db("SMTP_STARTTLS", "true"), default=True)

N8N_FOLLOWUP_ENABLED = _as_bool(_env_or_db("N8N_FOLLOWUP_ENABLED", "true"), default=True)
N8N_QUOTE_FOLLOWUP_WEBHOOK_URL = _env_or_db("N8N_QUOTE_FOLLOWUP_WEBHOOK_URL", "")
N8N_REQUEST_TIMEOUT_SECONDS = _as_float(_env_or_db("N8N_REQUEST_TIMEOUT_SECONDS", "10"), 10.0)
AUTOMATION_SHARED_SECRET = _env_or_db("AUTOMATION_SHARED_SECRET", "")
COLD_LEAD_THRESHOLD_DAYS = _as_int(_env_or_db("COLD_LEAD_THRESHOLD_DAYS", "10"), 10)
SCHEDULER_FOLLOWUP_BATCH_SIZE = _as_int(_env_or_db("SCHEDULER_FOLLOWUP_BATCH_SIZE", "100"), 100)

SLACK_ENABLED = _as_bool(_env_or_db("SLACK_ENABLED", "false"), default=False)
SLACK_WEBHOOK_URL = _env_or_db("SLACK_WEBHOOK_URL", "")
SLACK_BOT_TOKEN = _env_or_db("SLACK_BOT_TOKEN", "")
SLACK_CHANNEL = _env_or_db("SLACK_CHANNEL", "")

TELEGRAM_ENABLED = _as_bool(_env_or_db("TELEGRAM_ENABLED", "false"), default=False)
TELEGRAM_BOT_TOKEN = _env_or_db("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = _env_or_db("TELEGRAM_CHAT_ID", "")
TELEGRAM_PARSE_MODE = _env_or_db("TELEGRAM_PARSE_MODE", "Markdown")
