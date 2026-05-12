import hashlib
import time

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import (
    APP_TITLE, APP_VERSION,
    STATIC_MOUNT_PATH, ABS_UPLOADS_DIR,
    settings,
    validate_production_config,
)
from app.db.session import fetch_one
from app.routers.auth import auth_router
from app.routers.admin import admin_router
from app.routers.billing import billing_router, stripe_webhook_router
from app.routers.platform import platform_router
from app.routers.public import public_router

validate_production_config()
if settings.SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.05 if settings.IS_PRODUCTION else 0.0,
    )

app = FastAPI(title=APP_TITLE, version=APP_VERSION)

if settings.TRUSTED_HOSTS:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.TRUSTED_HOSTS)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
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

# --- Static mount: /static and /api/static -> ABS_UPLOADS_DIR ---
Path(ABS_UPLOADS_DIR).mkdir(parents=True, exist_ok=True)
app.mount(STATIC_MOUNT_PATH, StaticFiles(directory=ABS_UPLOADS_DIR), name="static")
app.mount("/api" + STATIC_MOUNT_PATH, StaticFiles(directory=ABS_UPLOADS_DIR), name="api-static")

app.include_router(auth_router)
app.include_router(admin_router)
app.include_router(billing_router)
app.include_router(stripe_webhook_router)
app.include_router(platform_router)
app.include_router(public_router)

@app.get("/healthz", tags=["meta"])
async def healthz():
    try:
        row = await fetch_one("SELECT 1 AS ok")
        return {"ok": bool(row)}
    except Exception as e:
        raise HTTPException(500, f"DB error: {e}")


@app.get("/metrics", include_in_schema=False)
async def metrics():
    try:
        from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
    except ImportError:
        return Response("prometheus_client is not installed\n", media_type="text/plain", status_code=503)
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)
 
