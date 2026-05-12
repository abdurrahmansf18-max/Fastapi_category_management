from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status
from sqlalchemy import text

from app.core.config import settings

_memory_buckets: dict[str, tuple[int, int]] = defaultdict(lambda: (0, 0))
_redis_client = None


async def _redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        from redis.asyncio import Redis

        _redis_client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        await _redis_client.ping()
        return _redis_client
    except Exception:
        _redis_client = False
        return None


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


async def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int,
    window_seconds: int | None = None,
    tenant_slug: str | None = None,
) -> None:
    window = window_seconds or settings.RATE_LIMIT_WINDOW_SECONDS
    now = int(time.time())
    bucket = now // window
    key = f"rl:{scope}:{tenant_slug or '-'}:{_client_key(request)}:{bucket}"

    redis = await _redis()
    if redis:
        current = await redis.incr(key)
        if current == 1:
            await redis.expire(key, window + 5)
        if current > limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
            )
        return

    count, seen_bucket = _memory_buckets[key]
    if seen_bucket != bucket:
        count = 0
    count += 1
    _memory_buckets[key] = (count, bucket)
    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
        )


def plan_limit_value(plan_code: str, free_value: int, pro_value: int) -> int:
    return pro_value if plan_code == "pro" else free_value
