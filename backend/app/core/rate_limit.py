"""rate_limit.py — Redis destekli (fallback: in-memory) istek sınırlayıcı.

IP Spoofing Koruması
--------------------
`X-Forwarded-For` başlığının tamamı güvenilir değildir; kötü niyetli bir
istemci sahte IP ekleyebilir. Caddy (veya herhangi bir güvenilir proxy)
gerçek istemci IP'sini her zaman başlığın **son** elemanına yazar.

Güvenli çözüm:
  • TRUSTED_PROXY_COUNT env değişkeniyle kaç güvenilir proxy katmanı
    olduğunu belirtirsiniz.
  • Son N elemanı atlayarak (proxy IP'leri) gerçek istemci IP'ye ulaşırız.
  • Caddy tek proxy ise TRUSTED_PROXY_COUNT=1 (varsayılan).
  • Cloudflare + Caddy gibi iki katman varsa TRUSTED_PROXY_COUNT=2.
"""
from __future__ import annotations

import time
from collections import defaultdict

from fastapi import HTTPException, Request, status

from app.core.config import settings
from app.core.redis_client import get_redis

_memory_buckets: dict[str, tuple[int, int]] = defaultdict(lambda: (0, 0))


def _client_key(request: Request) -> str:
    """Güvenli istemci IP'si döndürür.

    X-Forwarded-For listesini sondan ``TRUSTED_PROXY_COUNT`` kadar atlayarak
    gerçek istemci IP'ye ulaşır. Bu sayede kötü niyetli bir istemcinin sahte
    IP ekleyerek rate limit'i atlatması önlenir.

    Örnek (Caddy tek proxy):
        X-Forwarded-For: <spoofed_ip>, <real_client_ip>
        TRUSTED_PROXY_COUNT = 1  →  real_client_ip seçilir

    Caddy + Cloudflare (iki güvenilir katman):
        X-Forwarded-For: <spoofed>, <client>, <cloudflare>
        TRUSTED_PROXY_COUNT = 2  →  <client> seçilir
    """
    trusted_proxy_count: int = getattr(settings, "TRUSTED_PROXY_COUNT", 1)

    forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if forwarded_for:
        ips = [ip.strip() for ip in forwarded_for.split(",") if ip.strip()]
        # Güvenilir proxy'leri sondan at; geriye kalan son eleman gerçek IP'dir.
        index = max(len(ips) - trusted_proxy_count, 0)
        candidate = ips[index] if index < len(ips) else ips[0]
        # Temel doğrulama: IPv4 veya IPv6 formatında olmalı
        if candidate and candidate not in {"unknown", ""}:
            return candidate

    # X-Real-IP Caddy tarafından set ediliyorsa güvenlidir.
    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip

    # Son çare: doğrudan bağlantı IP'si (reverse proxy yoksa geçerlidir)
    if request.client:
        return request.client.host

    return "unknown"


async def enforce_rate_limit(
    request: Request,
    *,
    scope: str,
    limit: int,
    window_seconds: int | None = None,
    tenant_slug: str | None = None,
) -> None:
    """Belirtilen scope + IP için sliding-window rate limit uygular.

    Redis erişilebilir değilse in-memory fallback devreye girer (tek process
    kurulumları veya Redis hizmet dışı senaryoları için).

    Args:
        request:        Mevcut FastAPI isteği.
        scope:          Sınırlamak istenen kapsam (ör. "auth-login").
        limit:          Pencere başına izin verilen istek sayısı.
        window_seconds: Pencere süresi (sn); None ise settings değeri kullanılır.
        tenant_slug:    Tenant bazlı anahtarlama için isteğe bağlı slug.
    """
    window = window_seconds or settings.RATE_LIMIT_WINDOW_SECONDS
    now = int(time.time())
    bucket = now // window
    client_ip = _client_key(request)
    key = f"rl:{scope}:{tenant_slug or '-'}:{client_ip}:{bucket}"

    redis = await get_redis()
    if redis:
        try:
            current = await redis.incr(key)
            if current == 1:
                await redis.expire(key, window + 5)
            if current > limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded. Please slow down.",
                )
            return
        except HTTPException:
            raise
        except Exception:
            # Redis hatası olursa sessizce in-memory fallback'e geç
            pass

    count, seen_bucket = _memory_buckets[key]
    if seen_bucket != bucket:
        count = 0
    count += 1
    _memory_buckets[key] = (count, bucket)
    if count > limit:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please slow down.",
        )
