import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.core import csrf


@pytest.fixture
def anyio_backend():
    return "asyncio"


def _make_request(method: str, *, cookie: str | None = None, header: str | None = None) -> Request:
    headers = []
    if cookie is not None:
        cookie_name = csrf.admin_csrf_cookie_name("acme-docs")
        headers.append((b"cookie", f"{cookie_name}={cookie}".encode("utf-8")))
    if header is not None:
        headers.append((b"x-csrf-token", header.encode("utf-8")))
    scope = {
        "type": "http",
        "method": method,
        "path": "/api/t/acme-docs/admin/categories",
        "headers": headers,
        "client": ("127.0.0.1", 1234),
    }
    return Request(scope)


@pytest.mark.anyio
async def test_validate_admin_csrf_logs_and_rejects_invalid_token(monkeypatch):
    events = []

    async def fake_log_audit_event(**kwargs):
        events.append(kwargs)

    monkeypatch.setattr(csrf, "log_audit_event", fake_log_audit_event)
    request = _make_request("POST", cookie="cookie-token", header="other-token")

    with pytest.raises(HTTPException) as exc:
        await csrf.validate_admin_csrf(request, "acme-docs")

    assert exc.value.status_code == 403
    assert events
    assert events[0]["action"] == "security.csrf_failed"
