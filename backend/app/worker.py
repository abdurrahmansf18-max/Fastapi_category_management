from __future__ import annotations

import asyncio
from typing import Any

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings
from app.core.observability import observe_queue_task


def _celery_broker_url() -> str:
    """Sentinel yapılandırılmışsa sentinel:// URL döndürür."""
    if settings.REDIS_SENTINEL_HOSTS:
        # kombu sentinel:// formatı: host1:port;host2:port//db
        hosts = settings.REDIS_SENTINEL_HOSTS.replace(",", ";")
        return f"sentinel://{hosts}//0"
    return settings.REDIS_URL


def _celery_transport_options() -> dict:
    if settings.REDIS_SENTINEL_HOSTS:
        return {"master_name": settings.REDIS_SENTINEL_MASTER}
    return {}


_broker_url = _celery_broker_url()
celery_app = Celery(
    "docs_platform",
    broker=_broker_url,
    backend=_broker_url,
)

celery_app.conf.update(
    broker_transport_options=_celery_transport_options(),
    result_backend_transport_options=_celery_transport_options(),
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
        },
        "ops-prune-search-events-hourly": {
            "task": "ops.prune_search_events",
            "schedule": crontab(minute=30),  # her saat başı :30'da çalışır
        },
        # İletişim mesajları: okundu → 30 gün sonra otomatik arşivle, arşivlendi → 12 ay sonra sil
        "ops-contact-message-retention-daily": {
            "task": "ops.contact_message_retention",
            "schedule": crontab(hour=3, minute=30),
        },
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
    """
    Katmanlı saklama politikası (tiered retention):

    Katman 1 — İçerik olayları (content.*): 30 gün
      Düşük değerli, yüksek hacimli. 30 gün sonra anlamsız.

    Katman 2 — Operasyonel olaylar (admin.*, platform.*): retention_days (varsayılan 90)
      Orta değerli. Tenant yönetimi, ayarlar.

    Katman 3 — Güvenlik olayları (auth.*, security.*, login, impersonation): 365 gün sabit
      Yüksek değerli. Uyumluluk ve denetim için gerekli.
    """
    from app.db.session import platform_execute

    total = 0

    # Katman 1: İçerik olayları — 30 gün
    rows = await platform_execute(
        """
        DELETE FROM public.audit_event
        WHERE action LIKE 'content.%'
          AND created_at < now() - interval '30 days'
        RETURNING id
        """,
        {},
    )
    content_deleted = len(rows or [])
    total += content_deleted

    # Katman 2: Operasyonel olaylar (auth/security olmayan) — retention_days
    rows = await platform_execute(
        """
        DELETE FROM public.audit_event
        WHERE action NOT LIKE 'auth.%'
          AND action NOT LIKE 'security.%'
          AND action NOT LIKE 'content.%'
          AND action NOT IN (
            'platform.login_success', 'platform.login_failed',
            'platform.login_failed_totp', 'platform.impersonation_started'
          )
          AND created_at < (now() - (:retention_days || ' days')::interval)
        RETURNING id
        """,
        {"retention_days": retention_days},
    )
    ops_deleted = len(rows or [])
    total += ops_deleted

    # Katman 3: Güvenlik + auth olayları — 365 gün sabit (override edilemez)
    rows = await platform_execute(
        """
        DELETE FROM public.audit_event
        WHERE (
          action LIKE 'auth.%'
          OR action LIKE 'security.%'
          OR action IN (
            'platform.login_success', 'platform.login_failed',
            'platform.login_failed_totp', 'platform.impersonation_started'
          )
        )
        AND created_at < now() - interval '365 days'
        RETURNING id
        """,
        {},
    )
    security_deleted = len(rows or [])
    total += security_deleted

    return {
        "deleted_total": total,
        "content_deleted": content_deleted,
        "ops_deleted": ops_deleted,
        "security_deleted": security_deleted,
    }


@celery_app.task(name="ops.prune_audit_events")
def prune_audit_events_task() -> dict[str, int]:
    try:
        result = asyncio.run(_prune_audit_events(settings.AUDIT_RETENTION_DAYS))
        observe_queue_task("ops.prune_audit_events", "success")
        return result
    except Exception:
        observe_queue_task("ops.prune_audit_events", "failure")
        raise


async def _prune_search_events() -> dict[str, int]:
    from app.db.session import platform_execute

    rows = await platform_execute(
        """
        DELETE FROM public.search_event
        WHERE created_at < (now() - interval '24 hours')
        RETURNING id
        """,
    )
    return {"deleted": len(rows or [])}


@celery_app.task(name="ops.prune_search_events")
def prune_search_events_task() -> dict[str, int]:
    try:
        result = asyncio.run(_prune_search_events())
        observe_queue_task("ops.prune_search_events", "success")
        return result
    except Exception:
        observe_queue_task("ops.prune_search_events", "failure")
        raise


async def _contact_message_retention(
    auto_archive_days: int = 30,
    hard_delete_days: int = 365,
) -> dict[str, int]:
    """
    İletişim mesajları saklama politikası (her gece 03:30 UTC'de çalışır):

    Aşama 1 — Otomatik arşivle:
      Okunmuş ve {auto_archive_days} günden eski mesajlar → archived = true
      (Okunmamış mesajlar asla otomatik arşivlenmez)

    Aşama 2 — Kalıcı sil:
      Arşivlenmiş ve {hard_delete_days} günden eski mesajlar → DB'den sil (GDPR uyumlu)
    """
    from app.db.session import platform_execute

    # Aşama 1: Eski okunmuş mesajları arşivle
    rows = await platform_execute(
        """
        UPDATE public.contact_message
        SET archived = true
        WHERE read = true
          AND archived = false
          AND created_at < (now() - (:auto_archive_days || ' days')::interval)
        RETURNING id
        """,
        {"auto_archive_days": auto_archive_days},
    )
    auto_archived = len(rows or [])

    # Aşama 2: Çok eski arşivlenmiş mesajları hard-delete et
    rows = await platform_execute(
        """
        DELETE FROM public.contact_message
        WHERE archived = true
          AND created_at < (now() - (:hard_delete_days || ' days')::interval)
        RETURNING id
        """,
        {"hard_delete_days": hard_delete_days},
    )
    hard_deleted = len(rows or [])

    return {
        "auto_archived": auto_archived,
        "hard_deleted": hard_deleted,
    }


@celery_app.task(name="ops.contact_message_retention")
def contact_message_retention_task() -> dict[str, int]:
    try:
        result = asyncio.run(_contact_message_retention())
        observe_queue_task("ops.contact_message_retention", "success")
        return result
    except Exception:
        observe_queue_task("ops.contact_message_retention", "failure")
        raise
