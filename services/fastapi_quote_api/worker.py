from __future__ import annotations

from rq import Connection, Worker

from app.core.config import LEAD_AI_QUEUE_NAME
from app.core.queue import get_redis_connection


def main() -> None:
    connection = get_redis_connection()
    with Connection(connection):
        worker = Worker([LEAD_AI_QUEUE_NAME])
        worker.work()


if __name__ == "__main__":
    main()
