from __future__ import annotations

import re
import json
from typing import Any

import httpx

from app.core.config import settings
from app.core.tenancy import TenantContext
from app.db.session import fetch_all, platform_execute


def _index_name(tenant: TenantContext) -> str:
    safe = re.sub(r"[^a-z0-9_]", "_", tenant.slug.replace("-", "_"))
    return f"docs_{safe}"


def canonical_url(tenant_slug: str, category: str | None, h1: str | None, h2: str | None = None) -> str:
    base = f"/d/{tenant_slug}"
    if category and h1 and h2:
        return f"{base}/{category}/{h1}/{h2}"
    if category and h1:
        return f"{base}/{category}/{h1}"
    return base


async def _tenant_documents(tenant: TenantContext) -> list[dict[str, Any]]:
    rows = await fetch_all(
        """
        SELECT
          c.id AS category_id,
          c.name::text AS category_name,
          c.slug AS category_slug,
          h1.id AS h1_id,
          h1.title::text AS h1_title,
          h1.slug AS h1_slug,
          h2.id AS h2_id,
          h2.title::text AS h2_title,
          h2.slug AS h2_slug,
          ct.id AS content_id,
          ct.body,
          ct.description
        FROM category c
        JOIN heading h1 ON h1.category_id = c.id AND h1.level = 1
        LEFT JOIN heading h2 ON h2.parent_heading_id = h1.id AND h2.level = 2
        LEFT JOIN content ct ON ct.heading_id = COALESCE(h2.id, h1.id)
        WHERE ct.id IS NOT NULL AND ct.status = 'published'
        ORDER BY c.sort_order, h1.sort_order, h2.sort_order
        """
    )
    docs: list[dict[str, Any]] = []
    for row in rows:
        title = row["h2_title"] or row["h1_title"]
        docs.append(
            {
                "id": str(row["content_id"]),
                "tenant_slug": tenant.slug,
                "category_id": str(row["category_id"]),
                "category": row["category_name"],
                "category_slug": row["category_slug"],
                "h1_id": str(row["h1_id"]),
                "h1": row["h1_title"],
                "h1_slug": row["h1_slug"],
                "h2_id": str(row["h2_id"]) if row["h2_id"] else None,
                "h2": row["h2_title"],
                "h2_slug": row["h2_slug"],
                "title": title,
                "description": row["description"] or "",
                "body": row["body"] or "",
                "url": canonical_url(tenant.slug, row["category_slug"], row["h1_slug"], row["h2_slug"]),
            }
        )
    return docs


async def reindex_tenant_search(tenant: TenantContext) -> dict[str, Any]:
    docs = await _tenant_documents(tenant)
    if not settings.MEILISEARCH_URL:
        return {"engine": "postgres_fallback", "indexed": len(docs), "enabled": False}

    headers = {}
    if settings.MEILISEARCH_API_KEY:
        headers["Authorization"] = f"Bearer {settings.MEILISEARCH_API_KEY}"
    index = _index_name(tenant)
    async with httpx.AsyncClient(base_url=settings.MEILISEARCH_URL.rstrip("/"), headers=headers, timeout=20) as client:
        await client.put(f"/indexes/{index}", json={"uid": index, "primaryKey": "id"})
        await client.patch(
            f"/indexes/{index}/settings",
            json={
                "searchableAttributes": ["title", "category", "h1", "h2", "description", "body"],
                "filterableAttributes": ["tenant_slug", "category_slug", "h1_slug", "h2_slug"],
                "displayedAttributes": [
                    "id",
                    "title",
                    "description",
                    "category",
                    "category_slug",
                    "h1",
                    "h1_slug",
                    "h2",
                    "h2_slug",
                    "body",
                    "url",
                ],
            },
        )
        if docs:
            res = await client.post(f"/indexes/{index}/documents", json=docs)
            res.raise_for_status()
            task = res.json()
        else:
            task = {"taskUid": None}
    return {"engine": "meilisearch", "indexed": len(docs), "task": task}


def _meili_filter(
    *,
    category_slug: str | None = None,
    h1_slug: str | None = None,
    h2_slug: str | None = None,
) -> list[str]:
    def clean(value: str) -> str:
        return value.replace("\\", "\\\\").replace('"', '\\"')

    filters = []
    if category_slug:
        filters.append(f'category_slug = "{clean(category_slug)}"')
    if h1_slug:
        filters.append(f'h1_slug = "{clean(h1_slug)}"')
    if h2_slug:
        filters.append(f'h2_slug = "{clean(h2_slug)}"')
    return filters


def _format_doc_result(doc: dict[str, Any], q: str, score: float = 0.0) -> dict[str, Any]:
    body = doc.get("body") or ""
    description = doc.get("description") or ""
    q_lower = q.lower()
    context = description or body[:220]
    if q_lower and q_lower in body.lower():
        idx = body.lower().find(q_lower)
        start = max(idx - 80, 0)
        context = body[start : start + 260]
    return {
        "source_type": "content",
        "source_id": doc["id"],
        "matched_text": doc.get("title") or "",
        "context": context,
        "url": doc.get("url"),
        "category": doc.get("category"),
        "category_slug": doc.get("category_slug"),
        "h1": doc.get("h1"),
        "h1_slug": doc.get("h1_slug"),
        "h2": doc.get("h2"),
        "h2_slug": doc.get("h2_slug"),
        "highlight": {},
        "similarity_score": score,
    }


async def search_tenant(
    tenant: TenantContext,
    q: str,
    limit: int = 20,
    *,
    category_slug: str | None = None,
    h1_slug: str | None = None,
    h2_slug: str | None = None,
) -> list[dict[str, Any]]:
    if settings.MEILISEARCH_URL:
        headers = {}
        if settings.MEILISEARCH_API_KEY:
            headers["Authorization"] = f"Bearer {settings.MEILISEARCH_API_KEY}"
        filters = _meili_filter(category_slug=category_slug, h1_slug=h1_slug, h2_slug=h2_slug)
        async with httpx.AsyncClient(base_url=settings.MEILISEARCH_URL.rstrip("/"), headers=headers, timeout=5) as client:
            res = await client.post(
                f"/indexes/{_index_name(tenant)}/search",
                json={
                    "q": q,
                    "limit": limit,
                    "filter": filters or None,
                    "attributesToHighlight": ["title", "description", "body", "category", "h1", "h2"],
                    "attributesToCrop": ["description", "body"],
                    "cropLength": 30,
                    "showMatchesPosition": True,
                },
            )
            if res.status_code < 400:
                hits = res.json().get("hits", [])
                return [
                    {
                        "source_type": "content",
                        "source_id": hit["id"],
                        "matched_text": hit.get("title") or "",
                        "context": hit.get("description") or hit.get("body") or "",
                        "url": hit.get("url"),
                        "category": hit.get("category"),
                        "category_slug": hit.get("category_slug"),
                        "h1": hit.get("h1"),
                        "h1_slug": hit.get("h1_slug"),
                        "h2": hit.get("h2"),
                        "h2_slug": hit.get("h2_slug"),
                        "highlight": hit.get("_formatted", {}),
                        "similarity_score": hit.get("_rankingScore", 0),
                    }
                    for hit in hits
                ]

    docs = await _tenant_documents(tenant)
    q_lower = q.lower()
    results: list[dict[str, Any]] = []
    for doc in docs:
        if category_slug and doc.get("category_slug") != category_slug:
            continue
        if h1_slug and doc.get("h1_slug") != h1_slug:
            continue
        if h2_slug and doc.get("h2_slug") != h2_slug:
            continue
        haystack = " ".join(
            str(doc.get(key) or "")
            for key in ["title", "category", "h1", "h2", "description", "body"]
        ).lower()
        if q_lower not in haystack:
            continue
        title_hit = q_lower in str(doc.get("title") or "").lower()
        heading_hit = q_lower in f"{doc.get('h1') or ''} {doc.get('h2') or ''}".lower()
        score = 1.0 if title_hit else 0.8 if heading_hit else 0.5
        results.append(_format_doc_result(doc, q, score=score))
    return sorted(results, key=lambda item: item["similarity_score"], reverse=True)[:limit]


async def suggest_tenant(
    tenant: TenantContext,
    q: str,
    limit: int = 8,
    *,
    category_slug: str | None = None,
) -> list[str]:
    hits = await search_tenant(tenant, q, limit, category_slug=category_slug)
    return [str(hit.get("matched_text", ""))[:120] for hit in hits if hit.get("matched_text")]


async def record_search_event(
    tenant: TenantContext,
    *,
    query: str,
    source: str,
    result_count: int,
    filters: dict[str, Any] | None = None,
) -> None:
    try:
        await platform_execute(
            """
            INSERT INTO public.search_event (tenant_id, query, source, result_count, filters)
            VALUES (:tenant_id, :query, :source, :result_count, CAST(:filters AS jsonb))
            """,
            {
                "tenant_id": tenant.id,
                "query": query[:300],
                "source": source,
                "result_count": result_count,
                "filters": json.dumps(filters or {}),
            },
        )
    except Exception:
        return


async def tenant_seo_urls(tenant: TenantContext) -> list[str]:
    docs = await _tenant_documents(tenant)
    urls = [canonical_url(tenant.slug, None, None)]
    seen = set(urls)
    for doc in docs:
        url = doc["url"]
        if url not in seen:
            urls.append(url)
            seen.add(url)
        if len(urls) >= tenant.max_seo_pages:
            break
    return urls
