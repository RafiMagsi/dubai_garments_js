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
