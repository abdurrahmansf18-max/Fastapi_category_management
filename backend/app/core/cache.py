from __future__ import annotations

import json
from typing import Any

from app.core.config import settings

_redis_client: Any = None


async def _redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client or None
    try:
        from redis.asyncio import Redis

        _redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        await _redis_client.ping()
        return _redis_client
    except Exception:
        _redis_client = False
        return None


async def cache_get_json(key: str) -> Any | None:
    redis = await _redis()
    if not redis:
        return None
    raw = await redis.get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def cache_set_json(key: str, value: Any, ttl_seconds: int = 60) -> None:
    redis = await _redis()
    if not redis:
        return
    await redis.setex(key, ttl_seconds, json.dumps(value, default=str))


async def invalidate_cache_prefix(prefix: str) -> int:
    redis = await _redis()
    if not redis:
        return 0
    deleted = 0
    async for key in redis.scan_iter(f"{prefix}*"):
        deleted += await redis.delete(key)
    return deleted


def tenant_public_cache_prefix(tenant_id: str) -> str:
    return f"tenant:{tenant_id}:public:"

