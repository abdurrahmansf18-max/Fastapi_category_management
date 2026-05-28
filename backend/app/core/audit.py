from __future__ import annotations

import json
from typing import Any

from fastapi import Request

from app.db.session import platform_execute

# Bu action'lar için request_metadata'nın tamamı (ip, user_agent, path) kaydedilir.
# Diğer olaylar için sadece ip saklanır — user_agent/path/method DB alanı israf eder.
_FULL_METADATA_ACTIONS = frozenset({
    "auth.login_failed",
    "auth.signup_created",
    "auth.signup_conflict",
    "admin.login_failed",
    "admin.login_success",
    "platform.login_failed",
    "platform.login_failed_totp",
    "platform.login_success",
    "platform.impersonation_started",
    "security.session_revoked",
    "auth.forgot_password_requested",
    "auth.password_reset_completed",
})

# Güvenlik olayı olmayan kayıtlar için atlanacak alanlar
_NOISE_FIELDS = frozenset({"user_agent", "path", "method", "request_id"})


def request_metadata(request: Request | None, *, full: bool = True) -> dict[str, Any]:
    """
    full=True  → tüm alanlar (güvenlik olayları için)
    full=False → sadece ip (operasyonel/içerik olayları için)
    """
    if request is None:
        return {}
    base = {
        "ip": request.client.host if request.client else None,
    }
    if full:
        base.update({
            "user_agent": request.headers.get("user-agent"),
            "path": request.url.path,
            "method": request.method,
            "request_id": getattr(request.state, "request_id", None),
        })
    return base


async def log_audit_event(
    *,
    action: str,
    actor_user_id: str | None = None,
    tenant_id: str | None = None,
    target_type: str | None = None,
    target_id: str | None = None,
    request: Request | None = None,
    metadata: dict[str, Any] | None = None,
) -> None:
    # Güvenlik olayı mı? → tam metadata. Değilse → sadece ip yeterli.
    is_security = action in _FULL_METADATA_ACTIONS
    req_meta = request_metadata(request, full=is_security)

    payload = {**req_meta, **(metadata or {})}

    # Operasyonel kayıtlarda gürültülü alanları da extra metadata'dan temizle
    if not is_security:
        for field in _NOISE_FIELDS:
            payload.pop(field, None)

    # Boş değerleri çıkar — JSONB boyutunu küçültür
    payload = {k: v for k, v in payload.items() if v is not None and v != ""}

    await platform_execute(
        """
        INSERT INTO public.audit_event (
          tenant_id, actor_user_id, action, target_type, target_id, metadata
        )
        VALUES (
          :tenant_id, :actor_user_id, :action, :target_type, :target_id, CAST(:metadata AS jsonb)
        )
        """,
        {
            "tenant_id": tenant_id,
            "actor_user_id": actor_user_id,
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "metadata": json.dumps(payload, default=str),
        },
    )
