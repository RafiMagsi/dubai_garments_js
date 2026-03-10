from __future__ import annotations

import os
from pathlib import Path
from typing import List

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "uploads"))
CORS_ORIGINS: List[str] = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    if origin.strip()
]

DEAL_STAGES = ("new", "qualified", "quoted", "negotiation", "won", "lost")
LEAD_STATUSES = ("new", "qualified", "quoted", "won", "lost")
