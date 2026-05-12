from __future__ import annotations

import asyncio
from typing import Any

from celery import Celery

from app.core.config import settings


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
    return asyncio.run(_reindex_tenant(tenant_slug))


@celery_app.task(name="ops.healthcheck")
def healthcheck_task() -> dict[str, bool]:
    return {"ok": True}
