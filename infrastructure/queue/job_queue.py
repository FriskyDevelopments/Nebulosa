"""
Redis-backed job queue.

Provides a simple async interface for enqueuing background jobs.
In production, this wraps Celery (or another broker); in test mode,
it can be replaced with an in-memory stub.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)


class JobQueue:
    """
    Async job queue backed by Redis.

    Parameters
    ----------
    redis_url:
        Redis connection URL, e.g. ``redis://localhost:6379/0``.
    queue_name:
        Default queue name used when enqueuing jobs.
    """

    def __init__(self, redis_url: str, *, queue_name: str = "nebulosa") -> None:
        self._redis_url = redis_url
        self._queue_name = queue_name
        self._redis: Optional[Any] = None

    async def connect(self) -> None:
        """Establish the Redis connection."""
        import redis.asyncio as aioredis  # type: ignore

        self._redis = aioredis.from_url(self._redis_url, decode_responses=True)
        logger.info("Connected to Redis: %s", self._redis_url)

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    async def enqueue(self, job_type: str, *, payload: Any) -> str:
        """
        Push a job onto the queue.

        Parameters
        ----------
        job_type:
            Logical job name, e.g. ``"full_scan"``.
        payload:
            JSON-serialisable job payload.

        Returns
        -------
        str
            The Redis list key used (for monitoring).
        """
        message = json.dumps({"job_type": job_type, "payload": payload})
        key = f"{self._queue_name}:{job_type}"
        if self._redis:
            await self._redis.rpush(key, message)
        logger.debug("Enqueued job %s → %s", job_type, key)
        return key

    async def dequeue(self, job_type: str, *, timeout: int = 0) -> Optional[dict]:
        """
        Block until a job is available and return it.

        Parameters
        ----------
        job_type:
            Job type key to pop from.
        timeout:
            Blocking timeout in seconds; 0 means block indefinitely.
        """
        if not self._redis:
            return None
        key = f"{self._queue_name}:{job_type}"
        result = await self._redis.blpop(key, timeout=timeout)
        if result is None:
            return None
        _, raw = result
        return json.loads(raw)
