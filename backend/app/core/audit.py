from __future__ import annotations

import json
from typing import Any

from fastapi import Request

from app.db.session import platform_execute


def request_metadata(request: Request | None) -> dict[str, Any]:
    if request is None:
        return {}
    return {
        "ip": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "path": request.url.path,
        "method": request.method,
        "request_id": getattr(request.state, "request_id", None),
    }


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
    payload = {**request_metadata(request), **(metadata or {})}
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
