from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, Request, status

from app.core.config import ACCESS_TOKEN_EXPIRE_DELTA, settings
from app.db.session import platform_execute, platform_fetch_one


def issue_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def secret_hash(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def session_expires_at() -> datetime:
    return datetime.utcnow() + ACCESS_TOKEN_EXPIRE_DELTA


def refresh_expires_at() -> datetime:
    return datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)


def _client_ip(request: Request | None) -> str | None:
    if request is None:
        return None
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    return request.client.host if request.client else None


def _user_agent(request: Request | None) -> str | None:
    if request is None:
        return None
    return request.headers.get("user-agent")


async def create_admin_session(
    *,
    tenant_id: str,
    user_id: str,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
    request: Request | None,
    access_expires_at: datetime | None = None,
    refresh_expires_at_value: datetime | None = None,
    impersonated_by: str | None = None,
    impersonation_reason: str | None = None,
) -> None:
    await platform_execute(
        """
        INSERT INTO public.admin_session (
          tenant_id, user_id, token_hash, refresh_hash, csrf_hash,
          user_agent, ip, expires_at, refresh_expires_at,
          impersonated_by, impersonation_reason
        )
        VALUES (
          :tenant_id, :user_id, :token_hash, :refresh_hash, :csrf_hash,
          :user_agent, CAST(:ip AS inet), :expires_at, :refresh_expires_at,
          :impersonated_by, :impersonation_reason
        )
        """,
        {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "token_hash": secret_hash(access_token),
            "refresh_hash": secret_hash(refresh_token),
            "csrf_hash": secret_hash(csrf_token),
            "user_agent": _user_agent(request),
            "ip": _client_ip(request),
            "expires_at": access_expires_at or session_expires_at(),
            "refresh_expires_at": refresh_expires_at_value or refresh_expires_at(),
            "impersonated_by": impersonated_by,
            "impersonation_reason": impersonation_reason,
        },
    )


async def validate_admin_session(
    *,
    tenant_id: str,
    user_id: str,
    access_token: str,
    csrf_token: str | None,
) -> dict[str, Any]:
    if not csrf_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session is incomplete")
    row = await platform_fetch_one(
        """
        SELECT id
        FROM public.admin_session
        WHERE tenant_id = :tenant_id
          AND user_id = :user_id
          AND token_hash = :token_hash
          AND csrf_hash = :csrf_hash
          AND revoked_at IS NULL
          AND expires_at > now()
        """,
        {
            "tenant_id": tenant_id,
            "user_id": user_id,
            "token_hash": secret_hash(access_token),
            "csrf_hash": secret_hash(csrf_token),
        },
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Admin session is no longer active")
    await platform_execute(
        "UPDATE public.admin_session SET last_seen_at = now() WHERE id = :id",
        {"id": row["id"]},
    )
    return dict(row)


async def get_admin_refresh_subject(*, tenant_id: str, refresh_token: str) -> dict[str, Any]:
    row = await platform_fetch_one(
        """
        SELECT
          s.user_id,
          ua.email,
          tm.role,
          t.id AS tenant_id,
          t.slug AS tenant_slug,
          s.impersonated_by,
          s.impersonation_reason
        FROM public.admin_session s
        JOIN public.user_account ua ON ua.id = s.user_id
        JOIN public.tenant_member tm ON tm.tenant_id = s.tenant_id AND tm.user_id = s.user_id
        JOIN public.tenant t ON t.id = s.tenant_id
        WHERE s.tenant_id = :tenant_id
          AND s.refresh_hash = :refresh_hash
          AND s.revoked_at IS NULL
          AND s.refresh_expires_at > now()
          AND t.status = 'active'
          AND ua.email_verified = true
        """,
        {"tenant_id": tenant_id, "refresh_hash": secret_hash(refresh_token)},
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is no longer active")
    return dict(row)


async def rotate_admin_session(
    *,
    tenant_id: str,
    refresh_token: str,
    access_token: str,
    csrf_token: str,
) -> dict[str, Any]:
    rows = await platform_execute(
        """
        UPDATE public.admin_session
        SET token_hash = :token_hash,
            csrf_hash = :csrf_hash,
            expires_at = :expires_at,
            last_seen_at = now()
        WHERE tenant_id = :tenant_id
          AND refresh_hash = :refresh_hash
          AND revoked_at IS NULL
          AND refresh_expires_at > now()
        RETURNING id, user_id
        """,
        {
            "tenant_id": tenant_id,
            "refresh_hash": secret_hash(refresh_token),
            "token_hash": secret_hash(access_token),
            "csrf_hash": secret_hash(csrf_token),
            "expires_at": session_expires_at(),
        },
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is no longer active")
    return dict(rows[0])


async def revoke_admin_session_by_id(session_id: str) -> None:
    await platform_execute(
        "UPDATE public.admin_session SET revoked_at = now() WHERE id = :id AND revoked_at IS NULL",
        {"id": session_id},
    )


async def revoke_admin_sessions_for_user(*, tenant_id: str, user_id: str) -> None:
    await platform_execute(
        """
        UPDATE public.admin_session
        SET revoked_at = now()
        WHERE tenant_id = :tenant_id
          AND user_id = :user_id
          AND revoked_at IS NULL
        """,
        {"tenant_id": tenant_id, "user_id": user_id},
    )


async def revoke_admin_sessions_for_tenant(*, tenant_id: str) -> None:
    await platform_execute(
        """
        UPDATE public.admin_session
        SET revoked_at = now()
        WHERE tenant_id = :tenant_id
          AND revoked_at IS NULL
        """,
        {"tenant_id": tenant_id},
    )


async def create_platform_session(
    *,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
    request: Request | None,
) -> None:
    await platform_execute(
        """
        INSERT INTO public.platform_session (
          token_hash, refresh_hash, csrf_hash, user_agent, ip, expires_at, refresh_expires_at
        )
        VALUES (
          :token_hash, :refresh_hash, :csrf_hash, :user_agent, CAST(:ip AS inet), :expires_at, :refresh_expires_at
        )
        """,
        {
            "token_hash": secret_hash(access_token),
            "refresh_hash": secret_hash(refresh_token),
            "csrf_hash": secret_hash(csrf_token),
            "user_agent": _user_agent(request),
            "ip": _client_ip(request),
            "expires_at": session_expires_at(),
            "refresh_expires_at": refresh_expires_at(),
        },
    )


async def validate_platform_session(*, access_token: str, csrf_token: str | None) -> dict[str, Any]:
    if not csrf_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Platform session is incomplete")
    row = await platform_fetch_one(
        """
        SELECT id
        FROM public.platform_session
        WHERE token_hash = :token_hash
          AND csrf_hash = :csrf_hash
          AND revoked_at IS NULL
          AND expires_at > now()
        """,
        {"token_hash": secret_hash(access_token), "csrf_hash": secret_hash(csrf_token)},
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Platform session is no longer active")
    await platform_execute(
        "UPDATE public.platform_session SET last_seen_at = now() WHERE id = :id",
        {"id": row["id"]},
    )
    return dict(row)


async def get_platform_refresh_subject(*, refresh_token: str) -> dict[str, Any]:
    row = await platform_fetch_one(
        """
        SELECT id
        FROM public.platform_session
        WHERE refresh_hash = :refresh_hash
          AND revoked_at IS NULL
          AND refresh_expires_at > now()
        """,
        {"refresh_hash": secret_hash(refresh_token)},
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is no longer active")
    return dict(row)


async def rotate_platform_session(*, refresh_token: str, access_token: str, csrf_token: str) -> None:
    rows = await platform_execute(
        """
        UPDATE public.platform_session
        SET token_hash = :token_hash,
            csrf_hash = :csrf_hash,
            expires_at = :expires_at,
            last_seen_at = now()
        WHERE refresh_hash = :refresh_hash
          AND revoked_at IS NULL
          AND refresh_expires_at > now()
        RETURNING id
        """,
        {
            "refresh_hash": secret_hash(refresh_token),
            "token_hash": secret_hash(access_token),
            "csrf_hash": secret_hash(csrf_token),
            "expires_at": session_expires_at(),
        },
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh session is no longer active")


async def revoke_platform_session_by_id(session_id: str) -> None:
    await platform_execute(
        "UPDATE public.platform_session SET revoked_at = now() WHERE id = :id AND revoked_at IS NULL",
        {"id": session_id},
    )
