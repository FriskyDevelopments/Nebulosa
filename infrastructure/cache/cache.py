"""
Redis-backed cache module.

Provides get/set/delete operations with optional TTL.  Used for:
  - Caching GitHub API responses (repository metadata, rate-limit headers)
  - Storing installation token state (short TTL)
  - Caching architecture facts for repeated task queries
"""
from __future__ import annotations

import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

_DEFAULT_TTL = 300  # 5 minutes


class Cache:
    """
    Async Redis-backed key-value cache.

    Parameters
    ----------
    redis_url:
        Redis connection URL.
    namespace:
        Key prefix to avoid collisions with other applications.
    """

    def __init__(self, redis_url: str, *, namespace: str = "nebulosa") -> None:
        self._redis_url = redis_url
        self._ns = namespace
        self._redis: Optional[Any] = None

    async def connect(self) -> None:
        import redis.asyncio as aioredis  # type: ignore

        self._redis = aioredis.from_url(self._redis_url, decode_responses=True)
        logger.info("Cache connected to Redis: %s", self._redis_url)

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.aclose()
            self._redis = None

    def _key(self, key: str) -> str:
        return f"{self._ns}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        """Return a cached value, or ``None`` on cache miss."""
        if not self._redis:
            return None
        raw = await self._redis.get(self._key(key))
        if raw is None:
            return None
        return json.loads(raw)

    async def set(self, key: str, value: Any, *, ttl: int = _DEFAULT_TTL) -> None:
        """Cache *value* under *key* with an expiry of *ttl* seconds."""
        if not self._redis:
            return
        await self._redis.set(self._key(key), json.dumps(value), ex=ttl)

    async def delete(self, key: str) -> None:
        """Remove a cached entry."""
        if not self._redis:
            return
        await self._redis.delete(self._key(key))

    async def exists(self, key: str) -> bool:
        if not self._redis:
            return False
        return bool(await self._redis.exists(self._key(key)))
