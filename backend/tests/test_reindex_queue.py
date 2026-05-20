from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.routers import admin


@pytest.fixture
def anyio_backend():
    return "asyncio"


class _TaskResult:
    id = "task-123"


class _QueueOk:
    @staticmethod
    def delay(_tenant_slug: str):
        return _TaskResult()


class _QueueFail:
    @staticmethod
    def delay(_tenant_slug: str):
        raise RuntimeError("queue down")


@pytest.mark.anyio
async def test_reindex_search_queues_task_without_sync_fallback(monkeypatch):
    tenant = SimpleNamespace(id="tenant-1", slug="acme-docs")
    monkeypatch.setattr(admin, "get_tenant_context", lambda: tenant)
    monkeypatch.setattr(admin, "observe_queue_task", lambda *_args, **_kwargs: None)

    async def fake_audit(**_kwargs):
        return None

    monkeypatch.setattr(admin, "log_audit_event", fake_audit)

    import app.worker as worker

    monkeypatch.setattr(worker, "reindex_tenant_task", _QueueOk)
    result = await admin.reindex_search(current={"id": "user-1"})

    assert result["queued"] is True
    assert result["task_id"] == "task-123"
    assert result["tenant_slug"] == "acme-docs"


@pytest.mark.anyio
async def test_reindex_search_returns_503_when_queue_is_unavailable(monkeypatch):
    tenant = SimpleNamespace(id="tenant-1", slug="acme-docs")
    monkeypatch.setattr(admin, "get_tenant_context", lambda: tenant)
    monkeypatch.setattr(admin, "observe_queue_task", lambda *_args, **_kwargs: None)

    async def fake_audit(**_kwargs):
        return None

    monkeypatch.setattr(admin, "log_audit_event", fake_audit)

    import app.worker as worker

    monkeypatch.setattr(worker, "reindex_tenant_task", _QueueFail)

    with pytest.raises(HTTPException) as exc:
        await admin.reindex_search(current={"id": "user-1"})

    assert exc.value.status_code == 503
    assert "queue" in exc.value.detail.lower()
