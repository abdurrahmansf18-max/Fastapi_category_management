#  backend/app/db/session.py
from contextvars import ContextVar

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import DATABASE_URL

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    future=True
)

_tenant_schema: ContextVar[str | None] = ContextVar("tenant_schema", default=None)


def quote_ident(value: str) -> str:
    return '"' + value.replace('"', '""') + '"'


def set_tenant_schema(schema_name: str):
    return _tenant_schema.set(schema_name)


def reset_tenant_schema(token) -> None:
    _tenant_schema.reset(token)


def current_tenant_schema() -> str | None:
    return _tenant_schema.get()


async def _apply_search_path(conn) -> None:
    schema_name = current_tenant_schema()
    if schema_name:
        await conn.execute(text(f"SET LOCAL search_path TO {quote_ident(schema_name)}, public"))


async def fetch_one(query, params: dict | None = None):
    async with engine.begin() as conn:
        await _apply_search_path(conn)
        if isinstance(query, str):
            res = await conn.execute(text(query), params or {})
        else:
            res = await conn.execute(query)
        return res.mappings().first()

async def fetch_all(query, params: dict | None = None):
    async with engine.begin() as conn:
        await _apply_search_path(conn)
        if isinstance(query, str):
            res = await conn.execute(text(query), params or {})
        else:
            res = await conn.execute(query)
        return res.mappings().all()

async def execute(query, params: dict | None = None):
    async with engine.begin() as conn:
        await _apply_search_path(conn)
        if isinstance(query, str):
            res = await conn.execute(text(query), params or {})
        else:
            res = await conn.execute(query)
        try:
            return res.mappings().all()  # RETURNING kullanan sorgular için
        except Exception:
            return None


async def platform_fetch_one(query, params: dict | None = None):
    async with engine.begin() as conn:
        if isinstance(query, str):
            res = await conn.execute(text(query), params or {})
        else:
            res = await conn.execute(query)
        return res.mappings().first()


async def platform_fetch_all(query, params: dict | None = None):
    async with engine.begin() as conn:
        if isinstance(query, str):
            res = await conn.execute(text(query), params or {})
        else:
            res = await conn.execute(query)
        return res.mappings().all()


async def platform_execute(query, params: dict | None = None):
    async with engine.begin() as conn:
        if isinstance(query, str):
            res = await conn.execute(text(query), params or {})
        else:
            res = await conn.execute(query)
        try:
            return res.mappings().all()
        except Exception:
            return None
