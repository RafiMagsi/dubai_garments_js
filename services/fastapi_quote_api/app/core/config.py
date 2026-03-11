from __future__ import annotations

import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
LEAD_AI_QUEUE_NAME = os.getenv("LEAD_AI_QUEUE_NAME", "lead_ai")
LEAD_AI_JOB_TIMEOUT = int(os.getenv("LEAD_AI_JOB_TIMEOUT", "180"))
LEAD_AI_RETRY_MAX = int(os.getenv("LEAD_AI_RETRY_MAX", "3"))
QUOTE_PDF_QUEUE_NAME = os.getenv("QUOTE_PDF_QUEUE_NAME", "quote_pdf")
QUOTE_PDF_JOB_TIMEOUT = int(os.getenv("QUOTE_PDF_JOB_TIMEOUT", "180"))
QUOTE_PDF_RETRY_MAX = int(os.getenv("QUOTE_PDF_RETRY_MAX", "2"))
LEAD_AI_ENABLED = os.getenv("LEAD_AI_ENABLED", "true").strip().lower() in {
    "1",
    "true",
    "yes",
    "on",
}
CORS_ORIGINS: List[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

DEAL_STAGES = ("new", "qualified", "quoted", "negotiation", "won", "lost")
LEAD_STATUSES = ("new", "qualified", "quoted", "won", "lost")

STORAGE_PROVIDER = os.getenv("STORAGE_PROVIDER", "local").strip().lower()
STORAGE_LOCAL_DIR = Path(os.getenv("STORAGE_LOCAL_DIR", "uploads/quote_pdfs"))
STORAGE_PUBLIC_BASE_URL = os.getenv("STORAGE_PUBLIC_BASE_URL", "http://localhost:8000")
STORAGE_S3_BUCKET = os.getenv("STORAGE_S3_BUCKET", "")
STORAGE_S3_REGION = os.getenv("STORAGE_S3_REGION", "auto")
STORAGE_S3_ENDPOINT = os.getenv("STORAGE_S3_ENDPOINT", "")
STORAGE_S3_ACCESS_KEY = os.getenv("STORAGE_S3_ACCESS_KEY", "")
STORAGE_S3_SECRET_KEY = os.getenv("STORAGE_S3_SECRET_KEY", "")
STORAGE_S3_PUBLIC_URL_BASE = os.getenv("STORAGE_S3_PUBLIC_URL_BASE", "")
STORAGE_S3_PRESIGNED_EXPIRY = int(os.getenv("STORAGE_S3_PRESIGNED_EXPIRY", "3600"))

EMAIL_ENABLED = os.getenv("EMAIL_ENABLED", "true").strip().lower() in {"1", "true", "yes", "on"}
EMAIL_PROVIDER = os.getenv("EMAIL_PROVIDER", "log").strip().lower()
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Dubai Garments")
EMAIL_FROM_ADDRESS = os.getenv("EMAIL_FROM_ADDRESS", "no-reply@dubaigarments.ai")
ADMIN_NOTIFICATION_EMAIL = os.getenv("ADMIN_NOTIFICATION_EMAIL", "")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
SENDGRID_API_KEY = os.getenv("SENDGRID_API_KEY", "")

SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_STARTTLS = os.getenv("SMTP_STARTTLS", "true").strip().lower() in {"1", "true", "yes", "on"}
