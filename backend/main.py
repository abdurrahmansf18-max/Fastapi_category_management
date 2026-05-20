import asyncio
import hashlib
import time
import uuid
from pathlib import Path

import httpx
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from app.core.config import (
    ABS_UPLOADS_DIR,
    APP_TITLE,
    APP_VERSION,
    STATIC_MOUNT_PATH,
    settings,
    validate_production_config,
)
from app.core.error_handling import install_exception_handlers
from app.core.observability import (
    bind_request_context,
    configure_json_logging,
    get_logger,
    observe_http_request,
    reset_request_context,
    update_request_context,
)
from app.db.session import fetch_one
from app.routers.admin import admin_router
from app.routers.auth import auth_router
from app.routers.billing import billing_router, iyzico_webhook_router
from app.routers.platform import platform_router
from app.routers.public import public_router

configure_json_logging()
logger = get_logger()
validate_production_config()
if settings.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.SENTRY_ENVIRONMENT,
        release=settings.SENTRY_RELEASE or None,
        traces_sample_rate=0.05 if settings.IS_PRODUCTION else 0.0,
    )

app = FastAPI(title=APP_TITLE, version=APP_VERSION)
install_exception_handlers(app)

if settings.TRUSTED_HOSTS:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.TRUSTED_HOSTS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _route_label(request: Request) -> str:
    route = request.scope.get("route")
    if route is not None and hasattr(route, "path"):
        return str(getattr(route, "path"))
    return request.url.path


@app.middleware("http")
async def request_context_and_metrics(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    tokens = bind_request_context(request_id=request_id)
    request.state.request_id = request_id
    started = time.perf_counter()
    response = None
    try:
        response = await call_next(request)
    except Exception:
        reset_request_context(tokens)
        raise
    else:
        tenant_slug = request.path_params.get("tenant_slug") if request.path_params else None
        update_request_context(tenant_slug=tenant_slug)

    elapsed = time.perf_counter() - started
    route_label = _route_label(request)
    observe_http_request(
        method=request.method,
        path=route_label,
        status_code=response.status_code,
        latency_seconds=elapsed,
    )
    response.headers.setdefault("X-Request-ID", request_id)
    logger.info(
        "request.completed",
        extra={
            "props": {
                "request_id": request_id,
                "tenant_slug": tenant_slug or "-",
                "route": route_label,
                "method": request.method,
                "status_code": response.status_code,
                "latency_ms": round(elapsed * 1000, 2),
            }
        },
    )
    reset_request_context(tokens)
    return response


@app.middleware("http")
async def security_headers(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("X-XSS-Protection", "1; mode=block")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline'; "
        "style-src 'self' 'unsafe-inline'; "
        "img-src 'self' data: blob: https:; "
        "font-src 'self' data:; "
        "connect-src 'self'; "
        "frame-ancestors 'none'; "
        "base-uri 'self'; "
        "form-action 'self'",
    )
    if settings.IS_PRODUCTION:
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
    response.headers["X-Process-Time-ms"] = f"{(time.perf_counter() - start) * 1000:.2f}"
    return response


@app.middleware("http")
async def public_cache_headers(request: Request, call_next):
    path = request.url.path
    is_public_tenant_get = (
        request.method.upper() == "GET"
        and (path.startswith("/t/") or path.startswith("/api/t/"))
        and "/admin" not in path
    )
    response = await call_next(request)
    if not is_public_tenant_get or response.status_code >= 400:
        return response

    response.headers.setdefault("Cache-Control", "public, max-age=0, s-maxage=60, stale-while-revalidate=300")
    content_length = response.headers.get("content-length")
    try:
        should_hash_body = content_length is not None and int(content_length) <= settings.PUBLIC_CACHE_ETAG_MAX_BYTES
    except ValueError:
        should_hash_body = False
    if not should_hash_body:
        return response

    body = b""
    async for chunk in response.body_iterator:
        body += chunk

    etag = '"' + hashlib.sha256(body).hexdigest() + '"'
    headers = dict(response.headers)
    headers["ETag"] = etag
    if request.headers.get("if-none-match") == etag:
        headers.pop("content-length", None)
        return Response(status_code=304, headers=headers)
    return Response(
        content=body,
        status_code=response.status_code,
        headers=headers,
        media_type=response.media_type,
    )


Path(ABS_UPLOADS_DIR).mkdir(parents=True, exist_ok=True)
app.mount(STATIC_MOUNT_PATH, StaticFiles(directory=ABS_UPLOADS_DIR), name="static")
app.mount("/api" + STATIC_MOUNT_PATH, StaticFiles(directory=ABS_UPLOADS_DIR), name="api-static")

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(platform_router)
app.include_router(public_router)
app.include_router(billing_router)
app.include_router(iyzico_webhook_router)


@app.get("/branding")
async def public_branding():
    from app.db.session import platform_fetch_all as _pfa
    try:
        rows = await _pfa("SELECT key, value FROM public.platform_setting")
        data = {row["key"]: row["value"] for row in (rows or [])}
        return {
            "site_name": data.get("site_name", "DocSpace"),
            "site_logo": data.get("site_logo", ""),
        }
    except Exception:
        return {"site_name": "DocSpace", "site_logo": ""}


async def _db_check() -> tuple[bool, str]:
    row = await fetch_one("SELECT 1 AS ok")
    return (bool(row), "ok" if row else "db-unreachable")


async def _redis_check() -> tuple[bool, str]:
    try:
        from redis.asyncio import Redis

        redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis.ping()
        await redis.close()
        return True, "ok"
    except Exception as exc:
        return False, str(exc)


async def _meilisearch_check() -> tuple[bool, str]:
    if not settings.MEILISEARCH_URL:
        return False, "MEILISEARCH_URL is empty"
    headers = {}
    if settings.MEILISEARCH_API_KEY:
        headers["Authorization"] = f"Bearer {settings.MEILISEARCH_API_KEY}"
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            response = await client.get(f"{settings.MEILISEARCH_URL.rstrip('/')}/health", headers=headers)
            if response.status_code < 300:
                return True, "ok"
            return False, f"status:{response.status_code}"
    except Exception as exc:
        return False, str(exc)


async def _queue_check() -> tuple[bool, str]:
    try:
        from app.worker import celery_app

        pings = await asyncio.to_thread(lambda: celery_app.control.ping(timeout=0.7))
        if pings:
            return True, "ok"
        return False, "no-workers-responding"
    except Exception as exc:
        return False, str(exc)


@app.get("/healthz", tags=["meta"])
async def healthz():
    checks: dict[str, dict[str, str | bool]] = {}
    db_ok, db_message = await _db_check()
    checks["db"] = {"ok": db_ok, "message": db_message}

    redis_ok, redis_message = await _redis_check()
    checks["redis"] = {"ok": redis_ok, "message": redis_message}

    meili_ok, meili_message = await _meilisearch_check()
    checks["meilisearch"] = {"ok": meili_ok, "message": meili_message}

    queue_ok, queue_message = await _queue_check()
    checks["queue"] = {"ok": queue_ok, "message": queue_message}

    if settings.IS_PRODUCTION:
        overall_ok = all(item["ok"] for item in checks.values())
    else:
        overall_ok = bool(checks["db"]["ok"])
    status_code = 200 if overall_ok else 503
    payload = {"ok": overall_ok, "checks": checks}
    return JSONResponse(status_code=status_code, content=payload)


@app.get("/metrics", include_in_schema=False)
async def metrics():
    try:
        from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
    except ImportError:
        return Response("prometheus_client is not installed\n", media_type="text/plain", status_code=503)
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
