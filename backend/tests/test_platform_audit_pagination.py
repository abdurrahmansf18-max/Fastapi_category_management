import base64
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.routers import platform


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_platform_audit_returns_cursor(monkeypatch):
    rows = [
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "tenant_id": None,
            "actor_user_id": None,
            "action": "a",
            "target_type": None,
            "target_id": None,
            "metadata": {},
            "created_at": datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc),
        },
        {
            "id": "00000000-0000-0000-0000-000000000000",
            "tenant_id": None,
            "actor_user_id": None,
            "action": "b",
            "target_type": None,
            "target_id": None,
            "metadata": {},
            "created_at": datetime(2026, 1, 1, 11, 0, tzinfo=timezone.utc),
        },
    ]

    async def fake_fetch_all(_query, _params):
        return rows

    monkeypatch.setattr(platform, "platform_fetch_all", fake_fetch_all)

    payload = await platform.audit_events(
        tenant_id=None,
        action=None,
        from_ts=None,
        to_ts=None,
        cursor=None,
        limit=2,
        _={"email": "owner@example.com"},
    )

    assert len(payload["items"]) == 2
    assert payload["next_cursor"] is not None
    decoded = base64.urlsafe_b64decode(payload["next_cursor"].encode("ascii")).decode("utf-8")
    assert rows[-1]["id"] in decoded


@pytest.mark.anyio
async def test_platform_audit_rejects_invalid_cursor():
    with pytest.raises(HTTPException) as exc:
        await platform.audit_events(
            tenant_id=None,
            action=None,
            from_ts=None,
            to_ts=None,
            cursor="not-base64",
            limit=100,
            _={"email": "owner@example.com"},
        )
    assert exc.value.status_code == 400
