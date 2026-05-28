from __future__ import annotations

import asyncio
import time
from typing import Any

from app.core.config import settings

_redis_client: Any | None = None
_redis_lock = asyncio.Lock()
_last_failure_at = 0.0
_RETRY_AFTER_SECONDS = 30.0


def _build_sentinel_client() -> Any:
    """Sentinel modunda Redis master client döndürür."""
    from redis.asyncio.sentinel import Sentinel

    raw = settings.REDIS_SENTINEL_HOSTS  # "host1:26379,host2:26379,host3:26379"
    sentinel_hosts = [
        (part.split(":")[0], int(part.split(":")[1]))
        for part in raw.split(",")
        if part.strip()
    ]
    sentinel = Sentinel(sentinel_hosts, socket_timeout=0.5)
    return sentinel.master_for(settings.REDIS_SENTINEL_MASTER, decode_responses=True)


async def get_redis() -> Any | None:
    """Paylaşılan Redis client döndürür.

    REDIS_SENTINEL_HOSTS ayarlanmışsa Sentinel modunda,
    aksi takdirde doğrudan REDIS_URL ile bağlanır.
    Redis geçici olarak erişilemezse None döner (fail-open).
    """
    global _last_failure_at, _redis_client

    if _redis_client is not None:
        return _redis_client

    now = time.monotonic()
    if _last_failure_at and now - _last_failure_at < _RETRY_AFTER_SECONDS:
        return None

    async with _redis_lock:
        if _redis_client is not None:
            return _redis_client

        now = time.monotonic()
        if _last_failure_at and now - _last_failure_at < _RETRY_AFTER_SECONDS:
            return None

        try:
            if settings.REDIS_SENTINEL_HOSTS:
                client = _build_sentinel_client()
            else:
                from redis.asyncio import Redis
                client = Redis.from_url(settings.REDIS_URL, decode_responses=True)

            await client.ping()
        except Exception:
            _last_failure_at = time.monotonic()
            return None

        _redis_client = client
        _last_failure_at = 0.0
        return _redis_client


async def close_redis() -> None:
    global _redis_client

    if _redis_client is None:
        return
    client = _redis_client
    _redis_client = None
    await client.aclose()
