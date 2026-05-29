# app/routers/public.py
import re
import uuid
from typing import List, Dict
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from pydantic import BaseModel, Field

from sqlalchemy import select, exists, and_, or_
from app.db.session import fetch_one, fetch_all, platform_execute
from app.db.models import (
    category as t_category,
    heading as t_heading,
    content as t_content,
    content_image as t_content_image,
    content_attachment as t_content_attachment,
    redirect_rule as t_redirect_rule,
)
from app.schemas import (
    ContentPublic,
    CategoryPublic as CategoryOut,
    HeadingPublic as HeadingOut,
    PageOut,
    MenuNode,
    ContentImageOut,
    ContentAttachmentOut,
)
from app.core.tenancy import require_tenant_context
from app.core.tenancy import get_tenant_context
from app.core.rate_limit import enforce_rate_limit
from app.core.cache import cache_get_json, cache_set_json, tenant_public_cache_prefix
from app.core.search import record_search_event, search_tenant, suggest_tenant, tenant_seo_urls
from app.core.config import settings

public_router = APIRouter(
    prefix="/t/{tenant_slug}",
    tags=["public"],
    dependencies=[Depends(require_tenant_context)],
)

HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
DEFAULT_PRIMARY_COLOR = "#10b981"


class FeedbackIn(BaseModel):
    rating: str = Field(pattern="^(helpful|not_helpful)$")
    url: str = Field(min_length=1, max_length=500)
    message: str | None = Field(default=None, max_length=1000)


class PageViewIn(BaseModel):
    url: str = Field(min_length=1, max_length=500)
    title: str = Field(default="", max_length=200)
    content_id: UUID | None = None


def _resolve_site_settings(settings: dict, tenant) -> dict:
    resolved = dict(settings)
    title = (resolved.get("site_title") or "").strip()
    if not title or title == "Fastapi":
        resolved["site_title"] = tenant.name or tenant.slug
    if "site_logo" not in resolved:
        resolved["site_logo"] = ""
    color = (resolved.get("primary_color") or DEFAULT_PRIMARY_COLOR).strip()
    resolved["primary_color"] = color.lower() if HEX_COLOR_RE.fullmatch(color) else DEFAULT_PRIMARY_COLOR
    resolved["plan_code"] = tenant.plan_code
    return resolved

# ========== Helpers (EXISTS koşulları) ==========

def _exists_l1_has_content():
    h = t_heading.alias("h_l1c")
    ct = t_content.alias("ct_l1c")
    sub = (
        select(1)
        .select_from(h.join(ct, ct.c.heading_id == h.c.id))
        .where(and_(h.c.level == 1, h.c.category_id == t_category.c.id, ct.c.status == "published"))
        .limit(1)
    )
    return exists(sub)

def _exists_any_l2_has_content():
    h1 = t_heading.alias("h1_c")
    l2 = t_heading.alias("l2_c")
    ct2 = t_content.alias("ct2_c")
    sub = (
        select(1)
        .select_from(
            h1.join(l2, l2.c.parent_heading_id == h1.c.id)
              .join(ct2, ct2.c.heading_id == l2.c.id)
        )
        .where(h1.c.category_id == t_category.c.id)
        .where(ct2.c.status == "published")
        .limit(1)
    )
    return exists(sub)

def _exists_l1_or_any_child_has_content_for_h(h_alias):
    ct1 = t_content.alias("ct_for_l1")
    l2 = t_heading.alias("l2_for_l1")
    ct2 = t_content.alias("ct2_for_l1")

    sub_l1 = (
        select(1)
        .select_from(ct1)
        .where(and_(ct1.c.heading_id == h_alias.c.id, ct1.c.status == "published"))
        .limit(1)
    )
    sub_any_l2 = (
        select(1)
        .select_from(l2.join(ct2, ct2.c.heading_id == l2.c.id))
        .where(and_(l2.c.parent_heading_id == h_alias.c.id, ct2.c.status == "published"))
        .limit(1)
    )
    return or_(exists(sub_l1), exists(sub_any_l2))

def _exists_l2_has_content_for_h(h_alias):
    ct = t_content.alias("ct_for_l2")
    sub = (
        select(1)
        .select_from(ct)
        .where(and_(ct.c.heading_id == h_alias.c.id, ct.c.status == "published"))
        .limit(1)
    )
    return exists(sub)

# ========== Endpoints ==========

@public_router.get("/categories", response_model=List[CategoryOut])
async def list_categories():
    stmt = (
        select(
            t_category.c.id, t_category.c.name, t_category.c.slug, t_category.c.sort_order
        )
        .where(or_(_exists_l1_has_content(), _exists_any_l2_has_content()))
        .distinct()
        .order_by(t_category.c.sort_order, t_category.c.name)
    )
    return await fetch_all(stmt)

@public_router.get("/categories/{category_slug}/headings", response_model=List[HeadingOut])
async def list_h1_headings(category_slug: str = Path(...)):
    cat_stmt = select(t_category.c.id).where(t_category.c.slug == category_slug)
    cat = await fetch_one(cat_stmt)
    if not cat:
        raise HTTPException(404, "Category not found")

    h = t_heading.alias("h_l1_list")
    stmt = (
        select(h.c.id, h.c.level, h.c.title, h.c.slug, h.c.sort_order)
        .where(
            and_(
                h.c.level == 1,
                h.c.category_id == cat["id"],
                _exists_l1_or_any_child_has_content_for_h(h),
            )
        )
        .order_by(h.c.sort_order, h.c.title)
    )
    return await fetch_all(stmt)

@public_router.get("/categories/{category_slug}/{h1_slug}/headings", response_model=List[HeadingOut])
async def list_h2_under_h1(category_slug: str, h1_slug: str):
    h1 = t_heading.alias("h1_for_l2")
    c = t_category.alias("c_for_l2")
    h1_stmt = (
        select(h1.c.id)
        .select_from(h1.join(c, h1.c.category_id == c.c.id))
        .where(and_(h1.c.level == 1, c.c.slug == category_slug, h1.c.slug == h1_slug))
        .limit(1)
    )
    h1_row = await fetch_one(h1_stmt)
    if not h1_row:
        raise HTTPException(404, "Level-1 heading not found")

    h = t_heading.alias("h_l2_list")
    stmt = (
        select(h.c.id, h.c.level, h.c.title, h.c.slug, h.c.sort_order)
        .where(
            and_(
                h.c.level == 2,
                h.c.parent_heading_id == h1_row["id"],
                _exists_l2_has_content_for_h(h),
            )
        )
        .order_by(h.c.sort_order, h.c.title)
    )
    return await fetch_all(stmt)

@public_router.get("/page/{category_slug}/{h1_slug}/{h2_slug}", response_model=PageOut)
async def get_page(category_slug: str, h1_slug: str, h2_slug: str):
    c = t_category.alias("c")
    h1 = t_heading.alias("h1")
    h2 = t_heading.alias("h2")
    ct = t_content.alias("ct")

    stmt = (
        select(
            ct.c.id.label("content_id"),
            c.c.slug.label("category"),
            h1.c.slug.label("h1"),
            h2.c.slug.label("h2"),
            h2.c.title.label("title"),
            ct.c.body.label("body"),
            ct.c.description.label("description"),
        )
        .select_from(
            c.join(h1, and_(h1.c.category_id == c.c.id, h1.c.level == 1))
             .join(h2, and_(h2.c.parent_heading_id == h1.c.id, h2.c.level == 2))
             .join(ct, ct.c.heading_id == h2.c.id)
        )
        .where(and_(c.c.slug == category_slug, h1.c.slug == h1_slug, h2.c.slug == h2_slug, ct.c.status == "published"))
        .limit(1)
    )
    row = await fetch_one(stmt)
    if not row:
        raise HTTPException(404, "Page not found")
    return row

@public_router.get("/public/contents", response_model=List[ContentPublic])
async def list_public_contents(heading_id: UUID = Query(..., description="L1 veya L2 heading id")):
    ct = t_content.alias("ct")
    stmt = (
        select(ct.c.id, ct.c.heading_id, ct.c.body, ct.c.description)
        .where(and_(ct.c.heading_id == heading_id, ct.c.status == "published"))
        .order_by(ct.c.created_at.asc())
    )
    return await fetch_all(stmt)

# ---- Content Images (Public) ----

# ---- Content Images (Public) ----

def _abs_url(request: Request, url: str) -> str:
    """Stored path → root-relative URL served through Next.js proxy.

    Returns /api/static/... so the browser resolves it against whatever
    origin the user opened the page from (localhost, Cloudflare tunnel,
    production domain — all work without any config change).

    • Relative /static/...             → /api/static/...
    • Absolute .../api/static/... path → /api/static/...  (old Docker URLs)
    • Absolute .../static/... path     → /api/static/...
    • External absolute URL            → returned unchanged
    """
    if not url:
        return url

    if url.startswith("http://") or url.startswith("https://"):
        try:
            from urllib.parse import urlparse
            path = urlparse(url).path
            if path.startswith("/api/static/"):
                return path
            if path.startswith("/static/"):
                return f"/api{path}"
        except Exception:
            pass
        return url  # External URL — leave unchanged

    # Relative path
    if url.startswith("/static/"):
        return f"/api{url}"
    if not url.startswith("/"):
        url = "/" + url
    return url


@public_router.get("/contents/{id}/images", response_model=List[ContentImageOut])
async def list_images_by_content_id(id: uuid.UUID, request: Request):
    # content var mı kontrolü
    ct_stmt = select(t_content.c.id).where(and_(t_content.c.id == id, t_content.c.status == "published"))
    ct_row = await fetch_one(ct_stmt)
    if not ct_row:
        raise HTTPException(404, "Content not found")

    stmt = (
        select(
            t_content_image.c.id,
            t_content_image.c.content_id,
            t_content_image.c.url,
            t_content_image.c.alt,
            t_content_image.c.sort_order,
            # yeni alanlar
            t_content_image.c.width,
            t_content_image.c.height,
            t_content_image.c.created_at,
            t_content_image.c.updated_at,
        )
        .where(t_content_image.c.content_id == id)
        .order_by(t_content_image.c.sort_order, t_content_image.c.created_at, t_content_image.c.id)
    )
    rows = await fetch_all(stmt)
    # RowMapping -> dict; url'leri güvenle dönüştür
    result = []
    for r in rows:
        d = dict(r)
        if d.get("url"):
            d["url"] = _abs_url(request, d["url"]) 
        result.append(d)
    return result


@public_router.get("/page/{category_slug}/{h1_slug}/{h2_slug}/images", response_model=List[ContentImageOut])
async def list_images_by_page(category_slug: str, h1_slug: str, h2_slug: str, request: Request):
    # h2 -> content id çöz
    c = t_category.alias("c_img")
    h1 = t_heading.alias("h1_img")
    h2 = t_heading.alias("h2_img")
    ct = t_content.alias("ct_img")

    ct_stmt = (
        select(ct.c.id)
        .select_from(
            c.join(h1, and_(h1.c.category_id == c.c.id, h1.c.level == 1))
             .join(h2, and_(h2.c.parent_heading_id == h1.c.id, h2.c.level == 2))
             .join(ct, ct.c.heading_id == h2.c.id)
        )
        .where(and_(c.c.slug == category_slug, h1.c.slug == h1_slug, h2.c.slug == h2_slug, ct.c.status == "published"))
        .limit(1)
    )
    ct_row = await fetch_one(ct_stmt)
    if not ct_row:
        raise HTTPException(404, "Page not found")

    stmt = (
        select(
            t_content_image.c.id,
            t_content_image.c.content_id,
            t_content_image.c.url,
            t_content_image.c.alt,
            t_content_image.c.sort_order,
            # yeni alanlar
            t_content_image.c.width,
            t_content_image.c.height,
            t_content_image.c.created_at,
            t_content_image.c.updated_at,
        )
        .where(t_content_image.c.content_id == ct_row["id"])
        .order_by(t_content_image.c.sort_order, t_content_image.c.created_at, t_content_image.c.id)
    )
    rows = await fetch_all(stmt)
    result = []
    for r in rows:
        d = dict(r)
        if d.get("url"):
            d["url"] = _abs_url(request, d["url"]) 
        result.append(d)
    return result


@public_router.get("/contents/{id}/attachments", response_model=List[ContentAttachmentOut])
async def list_attachments_by_content_id(id: uuid.UUID, request: Request):
    ct_stmt = select(t_content.c.id).where(and_(t_content.c.id == id, t_content.c.status == "published"))
    ct_row = await fetch_one(ct_stmt)
    if not ct_row:
        raise HTTPException(404, "Content not found")

    stmt = (
        select(
            t_content_attachment.c.id,
            t_content_attachment.c.content_id,
            t_content_attachment.c.url,
            t_content_attachment.c.label,
            t_content_attachment.c.file_name,
            t_content_attachment.c.mime_type,
            t_content_attachment.c.size_bytes,
            t_content_attachment.c.sort_order,
            t_content_attachment.c.created_at,
            t_content_attachment.c.updated_at,
        )
        .where(t_content_attachment.c.content_id == id)
        .order_by(t_content_attachment.c.sort_order, t_content_attachment.c.created_at, t_content_attachment.c.id)
    )
    rows = await fetch_all(stmt)
    result = []
    for row in rows:
        data = dict(row)
        if data.get("url"):
            data["url"] = _abs_url(request, data["url"])
        result.append(data)
    return result


@public_router.get("/page/{category_slug}/{h1_slug}/{h2_slug}/attachments", response_model=List[ContentAttachmentOut])
async def list_attachments_by_page(category_slug: str, h1_slug: str, h2_slug: str, request: Request):
    c = t_category.alias("c_att")
    h1 = t_heading.alias("h1_att")
    h2 = t_heading.alias("h2_att")
    ct = t_content.alias("ct_att")

    ct_stmt = (
        select(ct.c.id)
        .select_from(
            c.join(h1, and_(h1.c.category_id == c.c.id, h1.c.level == 1))
             .join(h2, and_(h2.c.parent_heading_id == h1.c.id, h2.c.level == 2))
             .join(ct, ct.c.heading_id == h2.c.id)
        )
        .where(and_(c.c.slug == category_slug, h1.c.slug == h1_slug, h2.c.slug == h2_slug, ct.c.status == "published"))
        .limit(1)
    )
    ct_row = await fetch_one(ct_stmt)
    if not ct_row:
        raise HTTPException(404, "Page not found")

    stmt = (
        select(
            t_content_attachment.c.id,
            t_content_attachment.c.content_id,
            t_content_attachment.c.url,
            t_content_attachment.c.label,
            t_content_attachment.c.file_name,
            t_content_attachment.c.mime_type,
            t_content_attachment.c.size_bytes,
            t_content_attachment.c.sort_order,
            t_content_attachment.c.created_at,
            t_content_attachment.c.updated_at,
        )
        .where(t_content_attachment.c.content_id == ct_row["id"])
        .order_by(t_content_attachment.c.sort_order, t_content_attachment.c.created_at, t_content_attachment.c.id)
    )
    rows = await fetch_all(stmt)
    result = []
    for row in rows:
        data = dict(row)
        if data.get("url"):
            data["url"] = _abs_url(request, data["url"])
        result.append(data)
    return result


@public_router.get("/redirects/resolve")
async def resolve_redirect(path: str = Query(..., min_length=1, max_length=500)):
    normalized = path.strip()
    if not normalized.startswith("/"):
        normalized = "/" + normalized
    if len(normalized) > 1 and normalized.endswith("/"):
        normalized = normalized.rstrip("/")

    row = await fetch_one(
        select(
            t_redirect_rule.c.source_path,
            t_redirect_rule.c.target_path,
            t_redirect_rule.c.status_code,
        ).where(and_(t_redirect_rule.c.is_active == True, t_redirect_rule.c.source_path == normalized))
    )
    if not row:
        raise HTTPException(status_code=404, detail="Redirect not found")
    return dict(row)


@public_router.get("/menu", response_model=List[MenuNode])
async def menu():
    tenant = get_tenant_context()
    cache_key = f"{tenant_public_cache_prefix(tenant.id)}menu"
    cached = await cache_get_json(cache_key)
    if cached is not None:
        return cached

    cats_stmt = (
        select(
            t_category.c.id, t_category.c.name, t_category.c.slug, t_category.c.sort_order
        )
        .where(or_(_exists_l1_has_content(), _exists_any_l2_has_content()))
        .distinct()
        .order_by(t_category.c.sort_order, t_category.c.name)
    )
    cats = await fetch_all(cats_stmt)

    h = t_heading.alias("h_vis")
    headings_stmt = (
        select(
            h.c.id, h.c.level, h.c.title, h.c.slug, h.c.sort_order,
            h.c.category_id, h.c.parent_heading_id
        )
        .where(
            or_(
                and_(h.c.level == 1, _exists_l1_or_any_child_has_content_for_h(h)),
                and_(h.c.level == 2, _exists_l2_has_content_for_h(h)),
            )
        )
        .order_by(h.c.sort_order, h.c.title)
    )
    headings = await fetch_all(headings_stmt)

    by_cat: Dict[uuid.UUID, List[dict]] = {c["id"]: [] for c in cats}
    h1_map: Dict[uuid.UUID, dict] = {}

    for h in headings:
        if h["level"] == 1 and h["category_id"] in by_cat:
            node = {"id": h["id"], "title": h["title"], "slug": h["slug"],
                    "sort_order": h["sort_order"], "children": []}
            by_cat[h["category_id"]].append(node)
            h1_map[h["id"]] = node

    for h in headings:
        if h["level"] == 2 and h["parent_heading_id"] in h1_map:
            node = {"id": h["id"], "title": h["title"], "slug": h["slug"],
                    "sort_order": h["sort_order"], "children": []}
            h1_map[h["parent_heading_id"]]["children"].append(node)

    menu_all: List[MenuNode] = []
    for c in cats:
        menu_all.extend(sorted(by_cat[c["id"]], key=lambda n: (n["sort_order"], n["title"])))
    await cache_set_json(cache_key, menu_all, ttl_seconds=120)
    return menu_all


@public_router.get("/docs-index", response_model=List[dict])
async def docs_index():
    tenant = get_tenant_context()
    cache_key = f"{tenant_public_cache_prefix(tenant.id)}docs-index"
    cached = await cache_get_json(cache_key)
    if cached is not None:
        return cached

    rows = await fetch_all(
        """
        SELECT
          c.id AS category_id,
          c.name::text AS category_name,
          c.slug AS category_slug,
          c.sort_order AS category_sort_order,
          h1.id AS h1_id,
          h1.title::text AS h1_title,
          h1.slug AS h1_slug,
          h1.sort_order AS h1_sort_order,
          h2.id AS h2_id,
          h2.title::text AS h2_title,
          h2.slug AS h2_slug,
          h2.sort_order AS h2_sort_order
        FROM category c
        JOIN heading h1 ON h1.category_id = c.id AND h1.level = 1
        LEFT JOIN heading h2 ON h2.parent_heading_id = h1.id AND h2.level = 2
        WHERE
          EXISTS (SELECT 1 FROM content ct WHERE ct.heading_id = h1.id AND ct.status = 'published')
          OR EXISTS (SELECT 1 FROM content ct WHERE ct.heading_id = h2.id AND ct.status = 'published')
        ORDER BY c.sort_order, c.name, h1.sort_order, h1.title, h2.sort_order, h2.title
        """
    )
    categories: dict[str, dict] = {}
    for row in rows:
        category = categories.setdefault(
            str(row["category_id"]),
            {
                "id": str(row["category_id"]),
                "name": row["category_name"],
                "slug": row["category_slug"],
                "sort_order": row["category_sort_order"],
                "headings": {},
            },
        )
        heading = category["headings"].setdefault(
            str(row["h1_id"]),
            {
                "id": str(row["h1_id"]),
                "title": row["h1_title"],
                "slug": row["h1_slug"],
                "sort_order": row["h1_sort_order"],
                "children": [],
            },
        )
        if row["h2_id"]:
            heading["children"].append(
                {
                    "id": str(row["h2_id"]),
                    "title": row["h2_title"],
                    "slug": row["h2_slug"],
                    "sort_order": row["h2_sort_order"],
                }
            )
    result = [
        {**category, "headings": list(category["headings"].values())}
        for category in categories.values()
    ]
    await cache_set_json(cache_key, result, ttl_seconds=120)
    return result

@public_router.get("/search", response_model=List[dict])
async def search(
    request: Request,
    q: str = Query(..., min_length=2),
    limit: int = Query(20, ge=1, le=100),
    category_slug: str | None = Query(None),
    h1_slug: str | None = Query(None),
    h2_slug: str | None = Query(None),
):
    tenant = get_tenant_context()
    await enforce_rate_limit(
        request,
        scope="public-search",
        limit=tenant.search_rate_limit,
        tenant_slug=tenant.slug,
    )
    results = await search_tenant(
        tenant,
        q,
        limit,
        category_slug=category_slug,
        h1_slug=h1_slug,
        h2_slug=h2_slug,
    )
    await record_search_event(
        tenant,
        query=q,
        source="public",
        result_count=len(results),
        filters={
            "category_slug": category_slug,
            "h1_slug": h1_slug,
            "h2_slug": h2_slug,
        },
    )
    return results


@public_router.get("/search/suggest", response_model=List[str])
async def search_suggest(
    request: Request,
    q: str = Query(..., min_length=1),
    limit: int = Query(8, ge=1, le=20),
    category_slug: str | None = Query(None),
):
    tenant = get_tenant_context()
    await enforce_rate_limit(
        request,
        scope="public-search-suggest",
        limit=tenant.search_rate_limit,
        tenant_slug=tenant.slug,
    )
    suggestions = await suggest_tenant(tenant, q, limit, category_slug=category_slug)
    await record_search_event(
        tenant,
        query=q,
        source="suggest",
        result_count=len(suggestions),
        filters={"category_slug": category_slug},
    )
    return suggestions


@public_router.get("/seo/pages")
async def seo_pages():
    tenant = get_tenant_context()
    return {
        "limit": tenant.max_seo_pages,
        "urls": await tenant_seo_urls(tenant),
    }


@public_router.post("/analytics/page-view", status_code=202)
async def record_page_view(payload: PageViewIn, request: Request):
    tenant = get_tenant_context()
    await enforce_rate_limit(
        request,
        scope="public-page-view",
        limit=tenant.public_rate_limit,
        tenant_slug=tenant.slug,
    )
    forwarded = request.headers.get("x-forwarded-for", "")
    ip = forwarded.split(",", 1)[0].strip() if forwarded else (request.client.host if request.client else None)
    await platform_execute(
        """
        INSERT INTO public.page_view_event (tenant_id, url, title, content_id, user_agent, ip)
        VALUES (:tenant_id, :url, :title, CAST(:content_id AS uuid), :user_agent, CAST(:ip AS inet))
        """,
        {
            "tenant_id": tenant.id,
            "url": payload.url[:500],
            "title": payload.title[:200],
            "content_id": str(payload.content_id) if payload.content_id else None,
            "user_agent": request.headers.get("user-agent", "")[:500],
            "ip": ip,
        },
    )
    return {"ok": True}


@public_router.post("/feedback", status_code=201)
async def create_feedback(payload: FeedbackIn, request: Request):
    tenant = get_tenant_context()
    await enforce_rate_limit(
        request,
        scope="public-feedback",
        limit=tenant.public_rate_limit,
        tenant_slug=tenant.slug,
    )
    await platform_execute(
        """
        INSERT INTO public.feedback_event (tenant_id, url, rating, message, user_agent, ip)
        VALUES (:tenant_id, :url, :rating, :message, :user_agent, CAST(:ip AS inet))
        """,
        {
            "tenant_id": tenant.id,
            "url": payload.url,
            "rating": payload.rating,
            "message": payload.message,
            "user_agent": request.headers.get("user-agent", "")[:500],
            "ip": request.client.host if request.client else None,
        },
    )
    return {"ok": True}


@public_router.get("/settings")
async def get_site_settings(request: Request):
    tenant = get_tenant_context()
    cache_key = f"{tenant_public_cache_prefix(tenant.id)}settings"
    cached = await cache_get_json(cache_key)
    if cached is not None:
        result = _resolve_site_settings(cached, tenant)
        if result.get("site_logo"):
            result["site_logo"] = _abs_url(request, result["site_logo"])
        return result

    rows = await fetch_all("SELECT key, value FROM site_setting")
    raw = {row["key"]: row["value"] for row in rows}
    await cache_set_json(cache_key, raw, ttl_seconds=300)  # cache relative paths
    result = _resolve_site_settings(raw, tenant)
    if result.get("site_logo"):
        result["site_logo"] = _abs_url(request, result["site_logo"])
    return result
