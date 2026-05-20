import pytest

from app.core import config
from app.core.csrf import (
    admin_cookie_path,
    admin_csrf_cookie_name,
    admin_frontend_cookie_path,
    admin_session_cookie_name,
    set_admin_auth_cookies,
    set_platform_auth_cookies,
)
from fastapi import Response


def test_admin_cookie_names_and_paths_are_tenant_scoped():
    assert admin_session_cookie_name("acme-docs") == "adm_session_acme_docs"
    assert admin_cookie_path("acme-docs") == "/api/t/acme-docs/admin"
    assert admin_frontend_cookie_path("acme-docs") == "/d/acme-docs/admin"


def _set_cookie_headers(response: Response) -> list[str]:
    return [
        value.decode()
        for key, value in response.raw_headers
        if key.lower() == b"set-cookie"
    ]


def test_admin_csrf_cookie_is_visible_to_frontend_admin_path():
    response = Response()
    set_admin_auth_cookies(
        response,
        "acme-docs",
        "access-token",
        "refresh-token",
        "csrf-token",
        60,
        120,
    )

    headers = _set_cookie_headers(response)
    csrf_name = admin_csrf_cookie_name("acme-docs")
    assert any(header.startswith(f"{csrf_name}=csrf-token") and "Path=/api/t/acme-docs/admin" in header for header in headers)
    assert any(header.startswith(f"{csrf_name}=csrf-token") and "Path=/d/acme-docs/admin" in header for header in headers)
    assert not any(header.startswith("adm_session_acme_docs=access-token") and "Path=/d/acme-docs/admin" in header for header in headers)


def test_platform_csrf_cookie_is_visible_to_owner_panel_path():
    response = Response()
    set_platform_auth_cookies(response, "access-token", "refresh-token", "csrf-token", 60, 120)

    headers = _set_cookie_headers(response)
    assert any(header.startswith("platform_csrf=csrf-token") and "Path=/api/platform" in header for header in headers)
    assert any(header.startswith("platform_csrf=csrf-token") and "Path=/platform/admin" in header for header in headers)


def test_production_validation_requires_billing_and_search(monkeypatch):
    monkeypatch.setattr(config, "IS_PRODUCTION", True)
    monkeypatch.setattr(config, "SECRET_KEY", "x" * 40)
    monkeypatch.setattr(config, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(config, "SMTP_FROM", "noreply@example.com")
    monkeypatch.setattr(config, "APP_PUBLIC_BASE_URL", "https://docs.example.com")
    monkeypatch.setattr(config, "CORS_ORIGINS", ["https://docs.example.com"])
    monkeypatch.setattr(config, "COOKIE_SECURE", True)
    monkeypatch.setattr(config, "PLATFORM_OWNER_EMAIL", "owner@example.com")
    monkeypatch.setattr(config, "PLATFORM_OWNER_PASSWORD_HASH", "hash")
    monkeypatch.setattr(config, "PLATFORM_OWNER_TOTP_SECRET", "BASE32SECRET")
    monkeypatch.setattr(config, "IYZICO_API_KEY", "")
    monkeypatch.setattr(config, "IYZICO_SECRET_KEY", "")
    monkeypatch.setattr(config, "IYZICO_MERCHANT_ID", "")
    monkeypatch.setattr(config, "IYZICO_SUBSCRIPTION_PLAN_REF", "")
    monkeypatch.setattr(config, "MEILISEARCH_URL", "")
    monkeypatch.setattr(config, "MEILISEARCH_API_KEY", "")
    monkeypatch.setattr(config, "SENTRY_DSN", "")

    with pytest.raises(RuntimeError) as exc:
        config.validate_production_config()

    message = str(exc.value)
    assert "Iyzico" in message
    assert "Meilisearch URL" in message
    assert "SENTRY_DSN" in message
    assert "Restic and Cloudflare R2 backup credentials" in message
