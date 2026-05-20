from __future__ import annotations

import secrets

from fastapi import HTTPException, Request, Response, status

from app.core.audit import log_audit_event
from app.core.config import settings


def tenant_cookie_suffix(tenant_slug: str) -> str:
    return tenant_slug.replace("-", "_")


def admin_session_cookie_name(tenant_slug: str) -> str:
    return f"{settings.ADMIN_SESSION_COOKIE_PREFIX}_{tenant_cookie_suffix(tenant_slug)}"


def admin_refresh_cookie_name(tenant_slug: str) -> str:
    return f"{settings.ADMIN_REFRESH_COOKIE_PREFIX}_{tenant_cookie_suffix(tenant_slug)}"


def admin_csrf_cookie_name(tenant_slug: str) -> str:
    return f"{settings.ADMIN_CSRF_COOKIE_PREFIX}_{tenant_cookie_suffix(tenant_slug)}"


def admin_impersonation_cookie_name(tenant_slug: str) -> str:
    return f"adm_impersonation_{tenant_cookie_suffix(tenant_slug)}"


def admin_cookie_path(tenant_slug: str) -> str:
    return f"{settings.API_PUBLIC_PREFIX}/t/{tenant_slug}/admin"


def admin_frontend_cookie_path(tenant_slug: str) -> str:
    return f"/d/{tenant_slug}/admin"


def issue_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def set_admin_auth_cookies(
    response: Response,
    tenant_slug: str,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
    max_age_seconds: int,
    refresh_max_age_seconds: int | None = None,
) -> None:
    path = admin_cookie_path(tenant_slug)
    response.set_cookie(
        admin_session_cookie_name(tenant_slug),
        access_token,
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=path,
    )
    response.set_cookie(
        admin_refresh_cookie_name(tenant_slug),
        refresh_token,
        max_age=refresh_max_age_seconds or max_age_seconds,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=path,
    )
    response.set_cookie(
        admin_csrf_cookie_name(tenant_slug),
        csrf_token,
        max_age=max_age_seconds,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=path,
    )
    response.set_cookie(
        admin_csrf_cookie_name(tenant_slug),
        csrf_token,
        max_age=max_age_seconds,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=admin_frontend_cookie_path(tenant_slug),
    )


def clear_admin_auth_cookies(response: Response, tenant_slug: str) -> None:
    path = admin_cookie_path(tenant_slug)
    response.delete_cookie(admin_session_cookie_name(tenant_slug), path=path)
    response.delete_cookie(admin_refresh_cookie_name(tenant_slug), path=path)
    response.delete_cookie(admin_csrf_cookie_name(tenant_slug), path=path)
    response.delete_cookie(admin_csrf_cookie_name(tenant_slug), path=admin_frontend_cookie_path(tenant_slug))
    response.delete_cookie(admin_impersonation_cookie_name(tenant_slug), path=path)
    response.delete_cookie(admin_impersonation_cookie_name(tenant_slug), path=admin_frontend_cookie_path(tenant_slug))


def set_admin_impersonation_cookie(
    response: Response,
    tenant_slug: str,
    label: str,
    max_age_seconds: int,
) -> None:
    for path in (admin_cookie_path(tenant_slug), admin_frontend_cookie_path(tenant_slug)):
        response.set_cookie(
            admin_impersonation_cookie_name(tenant_slug),
            label,
            max_age=max_age_seconds,
            httponly=False,
            secure=settings.COOKIE_SECURE,
            samesite=settings.COOKIE_SAMESITE,
            path=path,
        )


async def validate_admin_csrf(request: Request, tenant_slug: str) -> None:
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
        return
    cookie_value = request.cookies.get(admin_csrf_cookie_name(tenant_slug))
    header_value = request.headers.get("x-csrf-token")
    if not cookie_value or not header_value or not secrets.compare_digest(cookie_value, header_value):
        await log_audit_event(
            action="security.csrf_failed",
            request=request,
            metadata={"scope": "tenant_admin", "tenant_slug": tenant_slug},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token",
        )


def set_platform_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    csrf_token: str,
    max_age_seconds: int,
    refresh_max_age_seconds: int | None = None,
) -> None:
    path = f"{settings.API_PUBLIC_PREFIX}/platform"
    response.set_cookie(
        settings.PLATFORM_SESSION_COOKIE,
        access_token,
        max_age=max_age_seconds,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=path,
    )
    response.set_cookie(
        settings.PLATFORM_REFRESH_COOKIE,
        refresh_token,
        max_age=refresh_max_age_seconds or max_age_seconds,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=path,
    )
    response.set_cookie(
        settings.PLATFORM_CSRF_COOKIE,
        csrf_token,
        max_age=max_age_seconds,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path=path,
    )
    response.set_cookie(
        settings.PLATFORM_CSRF_COOKIE,
        csrf_token,
        max_age=max_age_seconds,
        httponly=False,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        path="/platform/admin",
    )


def clear_platform_auth_cookies(response: Response) -> None:
    path = f"{settings.API_PUBLIC_PREFIX}/platform"
    response.delete_cookie(settings.PLATFORM_SESSION_COOKIE, path=path)
    response.delete_cookie(settings.PLATFORM_REFRESH_COOKIE, path=path)
    response.delete_cookie(settings.PLATFORM_CSRF_COOKIE, path=path)
    response.delete_cookie(settings.PLATFORM_CSRF_COOKIE, path="/platform/admin")


async def validate_platform_csrf(request: Request) -> None:
    if request.method.upper() in {"GET", "HEAD", "OPTIONS"}:
        return
    cookie_value = request.cookies.get(settings.PLATFORM_CSRF_COOKIE)
    header_value = request.headers.get("x-csrf-token")
    if not cookie_value or not header_value or not secrets.compare_digest(cookie_value, header_value):
        await log_audit_event(
            action="security.csrf_failed",
            request=request,
            metadata={"scope": "platform_admin"},
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid CSRF token",
        )
