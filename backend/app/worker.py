from __future__ import annotations

import asyncio
from typing import Any

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings
from app.core.observability import observe_queue_task


celery_app = Celery(
    "docs_platform",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    beat_schedule={
        "ops-prune-audit-events-daily": {
            "task": "ops.prune_audit_events",
            "schedule": crontab(hour=3, minute=10),
        }
    },
)


async def _reindex_tenant(tenant_slug: str) -> dict[str, Any]:
    from app.core.search import reindex_tenant_search
    from app.core.tenancy import load_tenant_context
    from app.db.session import reset_tenant_schema, set_tenant_schema

    tenant = await load_tenant_context(tenant_slug)
    schema_token = set_tenant_schema(tenant.schema_name)
    try:
        return await reindex_tenant_search(tenant)
    finally:
        reset_tenant_schema(schema_token)


@celery_app.task(name="search.reindex_tenant")
def reindex_tenant_task(tenant_slug: str) -> dict[str, Any]:
    try:
        result = asyncio.run(_reindex_tenant(tenant_slug))
        observe_queue_task("search.reindex_tenant", "success")
        return result
    except Exception:
        observe_queue_task("search.reindex_tenant", "failure")
        raise


@celery_app.task(name="ops.healthcheck")
def healthcheck_task() -> dict[str, bool]:
    return {"ok": True}


async def _prune_audit_events(retention_days: int) -> dict[str, int]:
    from app.db.session import platform_execute

    rows = await platform_execute(
        """
        DELETE FROM public.audit_event
        WHERE created_at < (now() - (:retention_days || ' days')::interval)
        RETURNING id
        """,
        {"retention_days": retention_days},
    )
    return {"deleted": len(rows or [])}


@celery_app.task(name="ops.prune_audit_events")
def prune_audit_events_task() -> dict[str, int]:
    try:
        result = asyncio.run(_prune_audit_events(settings.AUDIT_RETENTION_DAYS))
        observe_queue_task("ops.prune_audit_events", "success")
        return result
    except Exception:
        observe_queue_task("ops.prune_audit_events", "failure")
        raise
