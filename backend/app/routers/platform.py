from __future__ import annotations

import uuid
import json
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field

from app.core.audit import log_audit_event
from app.core.config import ALGORITHM, SECRET_KEY, settings
from app.core.csrf import (
    clear_platform_auth_cookies,
    set_admin_auth_cookies,
    set_admin_impersonation_cookie,
    issue_csrf_token,
    set_platform_auth_cookies,
    validate_platform_csrf,
)
from app.core.security import create_access_token, pwd_context
from app.core.sessions import (
    create_platform_session,
    create_admin_session,
    get_platform_refresh_subject,
    issue_refresh_token,
    revoke_admin_sessions_for_tenant,
    revoke_platform_session_by_id,
    rotate_platform_session,
    validate_platform_session,
)
from app.db.session import platform_execute, platform_fetch_all, platform_fetch_one

platform_router = APIRouter(prefix="/platform", tags=["platform"])


class PlatformLoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    totp_code: str = Field(min_length=6, max_length=8)


class TenantStatusIn(BaseModel):
    status: str = Field(pattern="^(active|suspended|pending_verification)$")


class TenantPlanIn(BaseModel):
    plan_code: str = Field(pattern="^(free|pro)$")
    reason: Optional[str] = ""


class TenantImpersonateIn(BaseModel):
    reason: str = Field(min_length=5, max_length=300)
    minutes: int = Field(default=15, ge=1, le=60)


async def get_current_platform_owner(
    request: Request,
):
    token = request.cookies.get(settings.PLATFORM_SESSION_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Platform login required")
    validate_platform_csrf(request)
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid platform token") from exc
    if payload.get("typ") != "platform_access" or payload.get("email") != settings.PLATFORM_OWNER_EMAIL:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")
    session = await validate_platform_session(
        access_token=token,
        csrf_token=request.cookies.get(settings.PLATFORM_CSRF_COOKIE),
    )
    payload["session_id"] = str(session["id"])
    return payload


@platform_router.post("/auth/login")
async def platform_login(payload: PlatformLoginIn, request: Request, response: Response):
    if not settings.PLATFORM_OWNER_EMAIL or not settings.PLATFORM_OWNER_PASSWORD_HASH:
        raise HTTPException(status_code=503, detail="Platform owner credentials are not configured")
    if payload.email.lower() != settings.PLATFORM_OWNER_EMAIL.lower():
        await log_audit_event(action="platform.login_failed", request=request, metadata={"email": payload.email})
        raise HTTPException(status_code=400, detail="Invalid platform credentials")
    if not pwd_context.verify(payload.password, settings.PLATFORM_OWNER_PASSWORD_HASH):
        await log_audit_event(action="platform.login_failed", request=request, metadata={"email": payload.email})
        raise HTTPException(status_code=400, detail="Invalid platform credentials")
    if settings.PLATFORM_OWNER_TOTP_SECRET:
        try:
            import pyotp
        except ImportError as exc:
            raise HTTPException(status_code=503, detail="TOTP package is not installed") from exc
        totp = pyotp.TOTP(settings.PLATFORM_OWNER_TOTP_SECRET)
        if not totp.verify(payload.totp_code, valid_window=1):
            await log_audit_event(action="platform.login_failed_totp", request=request, metadata={"email": payload.email})
            raise HTTPException(status_code=400, detail="Invalid TOTP code")

    token = create_access_token({"typ": "platform_access", "email": payload.email})
    csrf_token = issue_csrf_token()
    refresh_token = issue_refresh_token()
    await create_platform_session(
        access_token=token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
        request=request,
    )
    set_platform_auth_cookies(
        response,
        token,
        refresh_token,
        csrf_token,
        settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    await log_audit_event(action="platform.login_success", request=request, metadata={"email": payload.email})
    return {"ok": True}


@platform_router.post("/auth/refresh")
async def platform_refresh(request: Request, response: Response):
    refresh_token = request.cookies.get(settings.PLATFORM_REFRESH_COOKIE)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh session is missing")
    await get_platform_refresh_subject(refresh_token=refresh_token)
    token = create_access_token({"typ": "platform_access", "email": settings.PLATFORM_OWNER_EMAIL})
    csrf_token = issue_csrf_token()
    await rotate_platform_session(
        refresh_token=refresh_token,
        access_token=token,
        csrf_token=csrf_token,
    )
    set_platform_auth_cookies(
        response,
        token,
        refresh_token,
        csrf_token,
        settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    return {"ok": True}


@platform_router.post("/auth/logout", status_code=204)
async def platform_logout(response: Response, owner=Depends(get_current_platform_owner)):
    await revoke_platform_session_by_id(owner["session_id"])
    clear_platform_auth_cookies(response)
    await log_audit_event(action="platform.logout", metadata={"email": owner["email"]})
    return


@platform_router.get("/tenants")
async def list_tenants(_=Depends(get_current_platform_owner)):
    return await platform_fetch_all(
        """
        SELECT
          t.id, t.name, t.slug, t.status, t.plan_code, t.created_at,
          ua.email AS owner_email,
          COALESCE(s.status, 'none') AS billing_status
        FROM public.tenant t
        JOIN public.user_account ua ON ua.id = t.owner_user_id
        LEFT JOIN LATERAL (
          SELECT status
          FROM public.subscription s
          WHERE s.tenant_id = t.id
          ORDER BY s.updated_at DESC
          LIMIT 1
        ) s ON true
        ORDER BY t.created_at DESC
        LIMIT 500
        """
    )


@platform_router.patch("/tenants/{tenant_id}/status")
async def update_tenant_status(
    tenant_id: uuid.UUID,
    payload: TenantStatusIn,
    request: Request,
    owner=Depends(get_current_platform_owner),
):
    row = await platform_fetch_one("SELECT id FROM public.tenant WHERE id = :id", {"id": tenant_id})
    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await platform_execute(
        "UPDATE public.tenant SET status = :status WHERE id = :id",
        {"id": tenant_id, "status": payload.status},
    )
    if payload.status == "suspended":
        await revoke_admin_sessions_for_tenant(tenant_id=str(tenant_id))
    await log_audit_event(
        action="platform.tenant_status_changed",
        tenant_id=str(tenant_id),
        request=request,
        metadata={"owner": owner["email"], "status": payload.status},
    )
    return {"ok": True}


@platform_router.patch("/tenants/{tenant_id}/plan")
async def update_tenant_plan(
    tenant_id: uuid.UUID,
    payload: TenantPlanIn,
    request: Request,
    owner=Depends(get_current_platform_owner),
):
    row = await platform_fetch_one("SELECT id FROM public.tenant WHERE id = :id", {"id": tenant_id})
    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")
    await platform_execute(
        "UPDATE public.tenant SET plan_code = :plan_code WHERE id = :id",
        {"id": tenant_id, "plan_code": payload.plan_code},
    )
    await platform_execute(
        """
        INSERT INTO public.platform_override (tenant_id, plan_code, reason)
        VALUES (:tenant_id, :plan_code, :reason)
        ON CONFLICT (tenant_id) DO UPDATE SET
          plan_code = EXCLUDED.plan_code,
          reason = EXCLUDED.reason,
          updated_at = now()
        """,
        {"tenant_id": tenant_id, "plan_code": payload.plan_code, "reason": payload.reason or ""},
    )
    await log_audit_event(
        action="platform.tenant_plan_changed",
        tenant_id=str(tenant_id),
        request=request,
        metadata={"owner": owner["email"], "plan_code": payload.plan_code, "reason": payload.reason},
    )
    return {"ok": True}


@platform_router.post("/tenants/{tenant_id}/impersonate")
async def impersonate_tenant_owner(
    tenant_id: uuid.UUID,
    payload: TenantImpersonateIn,
    request: Request,
    response: Response,
    owner=Depends(get_current_platform_owner),
):
    row = await platform_fetch_one(
        """
        SELECT
          t.id AS tenant_id,
          t.slug AS tenant_slug,
          t.status,
          ua.id AS user_id,
          ua.email,
          tm.role
        FROM public.tenant t
        JOIN public.user_account ua ON ua.id = t.owner_user_id
        JOIN public.tenant_member tm ON tm.tenant_id = t.id AND tm.user_id = ua.id
        WHERE t.id = :tenant_id
        """,
        {"tenant_id": tenant_id},
    )
    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if row["status"] != "active":
        raise HTTPException(status_code=409, detail="Only active tenants can be impersonated")

    ttl = timedelta(minutes=payload.minutes)
    ttl_seconds = int(ttl.total_seconds())
    token = create_access_token(
        {
            "typ": "admin_access",
            "uid": str(row["user_id"]),
            "user_id": str(row["user_id"]),
            "sub": row["email"],
            "tenant_id": str(row["tenant_id"]),
            "tenant_slug": row["tenant_slug"],
            "role": row["role"],
            "impersonated_by": owner["email"],
            "impersonation_reason": payload.reason,
        },
        ttl,
    )
    refresh_token = issue_refresh_token()
    csrf_token = issue_csrf_token()
    expires_at = datetime.utcnow() + ttl
    await create_admin_session(
        tenant_id=str(row["tenant_id"]),
        user_id=str(row["user_id"]),
        access_token=token,
        refresh_token=refresh_token,
        csrf_token=csrf_token,
        request=request,
        access_expires_at=expires_at,
        refresh_expires_at_value=expires_at,
        impersonated_by=owner["email"],
        impersonation_reason=payload.reason,
    )
    set_admin_auth_cookies(
        response,
        row["tenant_slug"],
        token,
        refresh_token,
        csrf_token,
        ttl_seconds,
        ttl_seconds,
    )
    set_admin_impersonation_cookie(
        response,
        row["tenant_slug"],
        f"{owner['email']}: {payload.reason}",
        ttl_seconds,
    )
    await log_audit_event(
        action="platform.impersonation_started",
        tenant_id=str(row["tenant_id"]),
        target_type="tenant",
        target_id=str(row["tenant_id"]),
        request=request,
        metadata={
            "owner": owner["email"],
            "target_user": row["email"],
            "reason": payload.reason,
            "minutes": payload.minutes,
        },
    )
    return {
        "admin_url": f"/d/{row['tenant_slug']}/admin",
        "expires_in_seconds": ttl_seconds,
    }


@platform_router.get("/audit")
async def audit_events(limit: int = 100, _=Depends(get_current_platform_owner)):
    return await platform_fetch_all(
        """
        SELECT id, tenant_id, actor_user_id, action, target_type, target_id, metadata, created_at
        FROM public.audit_event
        ORDER BY created_at DESC
        LIMIT :limit
        """,
        {"limit": min(max(limit, 1), 500)},
    )


@platform_router.get("/ops/status")
async def ops_status(_=Depends(get_current_platform_owner)):
    def read_status_file(name: str) -> dict:
        path = Path(settings.OPS_STATUS_DIR) / name
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except Exception:
            return {"ok": False, "checked_at": None, "message": "No status file yet"}

    tenants = await platform_fetch_one("SELECT count(*) AS c FROM public.tenant")
    active = await platform_fetch_one("SELECT count(*) AS c FROM public.tenant WHERE status = 'active'")
    billing = await platform_fetch_one("SELECT count(*) AS c FROM public.subscription WHERE status IN ('active', 'trialing')")
    return {
        "ok": True,
        "tenants": tenants["c"] if tenants else 0,
        "active_tenants": active["c"] if active else 0,
        "active_subscriptions": billing["c"] if billing else 0,
        "search": {"configured": bool(settings.MEILISEARCH_URL)},
        "stripe": {"configured": bool(settings.STRIPE_SECRET_KEY)},
        "redis": {"configured": bool(settings.REDIS_URL)},
        "queue": {"configured": bool(settings.REDIS_URL), "worker": "celery"},
        "backup": {
            "configured": bool(settings.RESTIC_REPOSITORY and settings.RESTIC_PASSWORD),
            "last_backup": read_status_file("backup.json"),
            "last_restore_check": read_status_file("restore-check.json"),
        },
        "observability": {
            "sentry": {"configured": bool(settings.SENTRY_DSN)},
            "prometheus": {"configured": True},
            "grafana": {"configured": True},
            "loki": {"configured": True},
        },
    }
