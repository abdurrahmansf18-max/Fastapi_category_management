from __future__ import annotations

from contextvars import ContextVar
from dataclasses import dataclass
from pathlib import Path
from typing import AsyncGenerator

from fastapi import HTTPException, Path as ApiPath

from app.core.config import ABS_UPLOADS_DIR
from app.db.session import (
    fetch_one,
    platform_fetch_one,
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


_current_tenant: ContextVar[TenantContext | None] = ContextVar(
    "current_tenant", default=None
)


async def load_tenant_context(tenant_slug: str) -> TenantContext:
    row = await platform_fetch_one(
        """
        SELECT
          t.id, t.slug, t.name, t.schema_name, t.plan_code,
          p.max_admins, p.max_categories, p.max_headings,
          p.max_contents, p.max_upload_bytes
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
    else:
        raise HTTPException(status_code=500, detail=f"Unknown limit resource: {resource}")

    if current >= limit:
        raise HTTPException(status_code=403, detail=f"{resource} limit reached for this plan")


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
