from __future__ import annotations

import json
from typing import Any

from app.core.redis_client import get_redis


async def cache_get_json(key: str) -> Any | None:
    redis = await get_redis()
    if not redis:
        return None
    raw = await redis.get(key)
    if raw is None:
        return None
    return json.loads(raw)


async def cache_set_json(key: str, value: Any, ttl_seconds: int = 60) -> None:
    redis = await get_redis()
    if not redis:
        return
    await redis.setex(key, ttl_seconds, json.dumps(value, default=str))


async def invalidate_cache_prefix(prefix: str) -> int:
    redis = await get_redis()
    if not redis:
        return 0
    deleted = 0
    async for key in redis.scan_iter(f"{prefix}*"):
        deleted += await redis.delete(key)
    return deleted


def tenant_public_cache_prefix(tenant_id: str) -> str:
    return f"tenant:{tenant_id}:public:"
