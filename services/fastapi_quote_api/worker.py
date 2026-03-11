from __future__ import annotations

import os

from rq import Connection, Worker

from app.core.config import LEAD_AI_QUEUE_NAME, QUOTE_PDF_QUEUE_NAME
from app.core.queue import get_redis_connection


def _resolve_queues() -> list[str]:
    configured = os.getenv("WORKER_QUEUES", "").strip()
    if configured:
        queues = [item.strip() for item in configured.split(",") if item.strip()]
        if queues:
            return queues
    return [LEAD_AI_QUEUE_NAME, QUOTE_PDF_QUEUE_NAME]


def main() -> None:
    connection = get_redis_connection()
    queues = _resolve_queues()
    with Connection(connection):
        worker = Worker(queues)
        worker.work()


if __name__ == "__main__":
    main()
