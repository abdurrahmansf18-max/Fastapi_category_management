from __future__ import annotations

import json
import logging
from contextvars import ContextVar, Token
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings

try:
    from prometheus_client import Counter, Histogram
except Exception:  # pragma: no cover - local dev fallback when optional deps are missing
    class _NoopMetric:
        def labels(self, **_kwargs):
            return self

        def inc(self, *_args, **_kwargs):
            return None

        def observe(self, *_args, **_kwargs):
            return None

    def Counter(*_args, **_kwargs):  # type: ignore[misc]
        return _NoopMetric()

    def Histogram(*_args, **_kwargs):  # type: ignore[misc]
        return _NoopMetric()

_request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")
_tenant_slug_ctx: ContextVar[str] = ContextVar("tenant_slug", default="-")
_user_id_ctx: ContextVar[str] = ContextVar("user_id", default="-")

LOGGER_NAME = "docs_platform"

HTTP_REQUEST_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP requests",
    labelnames=("method", "path", "status"),
)
HTTP_REQUEST_LATENCY_SECONDS = Histogram(
    "http_request_latency_seconds",
    "HTTP request latency in seconds",
    labelnames=("method", "path", "status"),
    buckets=(0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5),
)
QUEUE_TASK_TOTAL = Counter(
    "queue_tasks_total",
    "Total queue tasks by status",
    labelnames=("task_name", "status"),
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def current_request_id() -> str:
    return _request_id_ctx.get()


def bind_request_context(
    *,
    request_id: str,
    tenant_slug: str | None = None,
    user_id: str | None = None,
) -> tuple[Token[str], Token[str], Token[str]]:
    req_token = _request_id_ctx.set(request_id or "-")
    tenant_token = _tenant_slug_ctx.set(tenant_slug or "-")
    user_token = _user_id_ctx.set(user_id or "-")
    return req_token, tenant_token, user_token


def update_request_context(*, tenant_slug: str | None = None, user_id: str | None = None) -> None:
    if tenant_slug is not None:
        _tenant_slug_ctx.set(tenant_slug or "-")
    if user_id is not None:
        _user_id_ctx.set(user_id or "-")


def reset_request_context(tokens: tuple[Token[str], Token[str], Token[str]]) -> None:
    req_token, tenant_token, user_token = tokens
    _request_id_ctx.reset(req_token)
    _tenant_slug_ctx.reset(tenant_token)
    _user_id_ctx.reset(user_token)


def request_context_payload() -> dict[str, str]:
    return {
        "request_id": _request_id_ctx.get(),
        "tenant_slug": _tenant_slug_ctx.get(),
        "user_id": _user_id_ctx.get(),
    }


class JsonLogFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "timestamp": _utc_now_iso(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "route": "-",
            "method": "-",
            "status_code": "-",
            "latency_ms": None,
            **request_context_payload(),
        }
        props = getattr(record, "props", None)
        if isinstance(props, dict):
            payload.update(props)
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=True, default=str)


def configure_json_logging() -> None:
    root = logging.getLogger()
    if getattr(root, "_docs_json_logging", False):
        return

    level_name = (settings.LOG_LEVEL or "INFO").upper()
    level = getattr(logging, level_name, logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(JsonLogFormatter())

    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(level)
    root._docs_json_logging = True


def get_logger() -> logging.Logger:
    return logging.getLogger(LOGGER_NAME)


def observe_http_request(
    *,
    method: str,
    path: str,
    status_code: int,
    latency_seconds: float,
) -> None:
    status = str(status_code)
    HTTP_REQUEST_TOTAL.labels(method=method, path=path, status=status).inc()
    HTTP_REQUEST_LATENCY_SECONDS.labels(method=method, path=path, status=status).observe(latency_seconds)


def observe_queue_task(task_name: str, status: str) -> None:
    QUEUE_TASK_TOTAL.labels(task_name=task_name, status=status).inc()
