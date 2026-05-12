from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import AsyncGenerator

from fastapi import HTTPException, Path as ApiPath

from app.core.config import ABS_UPLOADS_DIR
from app.db.session import (
    fetch_one,
    platform_fetch_one,
    platform_execute,
    reset_tenant_schema,
    set_tenant_schema,
)


@dataclass(frozen=True)
class TenantContext:
    id: str
    slug: str
    name: str
    schema_name: str
    plan_code: str
    max_admins: int
    max_categories: int
    max_headings: int
    max_contents: int
    max_upload_bytes: int
    max_seo_pages: int
    public_rate_limit: int
    search_rate_limit: int
    admin_rate_limit: int
    ai_monthly_limit: int


_current_tenant: ContextVar[TenantContext | None] = ContextVar(
    "current_tenant", default=None
)


async def load_tenant_context(tenant_slug: str) -> TenantContext:
    row = await platform_fetch_one(
        """
        SELECT
          t.id, t.slug, t.name, t.schema_name, t.plan_code,
          p.max_admins, p.max_categories, p.max_headings,
          p.max_contents, p.max_upload_bytes, p.max_seo_pages,
          p.public_rate_limit, p.search_rate_limit, p.admin_rate_limit,
          p.ai_monthly_limit
        FROM public.tenant t
        JOIN public.plan p ON p.code = t.plan_code
        WHERE t.slug = :slug AND t.status = 'active'
        """,
        {"slug": tenant_slug},
    )
    if not row:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return TenantContext(
        id=str(row["id"]),
        slug=row["slug"],
        name=row["name"],
        schema_name=row["schema_name"],
        plan_code=row["plan_code"],
        max_admins=row["max_admins"],
        max_categories=row["max_categories"],
        max_headings=row["max_headings"],
        max_contents=row["max_contents"],
        max_upload_bytes=row["max_upload_bytes"],
        max_seo_pages=row["max_seo_pages"],
        public_rate_limit=row["public_rate_limit"],
        search_rate_limit=row["search_rate_limit"],
        admin_rate_limit=row["admin_rate_limit"],
        ai_monthly_limit=row["ai_monthly_limit"],
    )


async def require_tenant_context(
    tenant_slug: str = ApiPath(...),
) -> AsyncGenerator[TenantContext, None]:
    tenant = await load_tenant_context(tenant_slug)
    schema_token = set_tenant_schema(tenant.schema_name)
    tenant_token = _current_tenant.set(tenant)
    try:
        yield tenant
    finally:
        _current_tenant.reset(tenant_token)
        reset_tenant_schema(schema_token)


def get_tenant_context() -> TenantContext:
    tenant = _current_tenant.get()
    if tenant is None:
        raise HTTPException(status_code=500, detail="Tenant context is not active")
    return tenant


async def enforce_tenant_limit(resource: str) -> None:
    tenant = get_tenant_context()
    if resource == "admins":
        row = await platform_fetch_one(
            "SELECT count(*) AS c FROM public.tenant_member WHERE tenant_id = :tenant_id",
            {"tenant_id": tenant.id},
        )
        current = row["c"] if row else 0
        limit = tenant.max_admins
    elif resource == "categories":
        row = await fetch_one("SELECT count(*) AS c FROM category")
        current = row["c"] if row else 0
        limit = tenant.max_categories
    elif resource == "headings":
        row = await fetch_one("SELECT count(*) AS c FROM heading")
        current = row["c"] if row else 0
        limit = tenant.max_headings
    elif resource == "contents":
        row = await fetch_one("SELECT count(*) AS c FROM content")
        current = row["c"] if row else 0
        limit = tenant.max_contents
    elif resource == "seo_pages":
        row = await fetch_one(
            """
            SELECT
              (SELECT count(*) FROM category) +
              (SELECT count(*) FROM heading WHERE level = 1) +
              (SELECT count(*) FROM heading WHERE level = 2) AS c
            """
        )
        current = row["c"] if row else 0
        limit = tenant.max_seo_pages
    else:
        raise HTTPException(status_code=500, detail=f"Unknown limit resource: {resource}")

    if current >= limit:
        raise HTTPException(status_code=403, detail=f"{resource} limit reached for this plan")


def current_month_period_start() -> date:
    today = date.today()
    return today.replace(day=1)


async def increment_tenant_usage_or_403(key: str, limit: int, amount: int = 1) -> int:
    if limit < 1:
        raise HTTPException(status_code=403, detail=f"{key} limit reached for this plan")
    tenant = get_tenant_context()
    rows = await platform_execute(
        """
        INSERT INTO public.usage_counter (tenant_id, key, period_start, value)
        VALUES (:tenant_id, :key, :period_start, :amount)
        ON CONFLICT (tenant_id, key, period_start) DO UPDATE SET
          value = public.usage_counter.value + EXCLUDED.value,
          updated_at = now()
        WHERE public.usage_counter.value + EXCLUDED.value <= :limit
        RETURNING value
        """,
        {
            "tenant_id": tenant.id,
            "key": key,
            "period_start": current_month_period_start(),
            "amount": amount,
            "limit": limit,
        },
    )
    if not rows:
        raise HTTPException(status_code=403, detail=f"{key} limit reached for this plan")
    return int(rows[0]["value"])


async def tenant_usage_value(key: str) -> int:
    tenant = get_tenant_context()
    row = await platform_fetch_one(
        """
        SELECT value
        FROM public.usage_counter
        WHERE tenant_id = :tenant_id
          AND key = :key
          AND period_start = :period_start
        """,
        {
            "tenant_id": tenant.id,
            "key": key,
            "period_start": current_month_period_start(),
        },
    )
    return int(row["value"]) if row else 0


def tenant_upload_dir(tenant_slug: str | None = None) -> Path:
    slug = tenant_slug or get_tenant_context().slug
    return Path(ABS_UPLOADS_DIR) / slug


def tenant_upload_bytes(tenant_slug: str | None = None) -> int:
    base = tenant_upload_dir(tenant_slug)
    if not base.exists():
        return 0
    total = 0
    for path in base.rglob("*"):
        if path.is_file():
            total += path.stat().st_size
    return total
