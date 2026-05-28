#  backend/app/db/session.py
from contextvars import ContextVar

from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from sqlalchemy.dialects import postgresql
from app.core.config import settings

# ---------------------------------------------------------------------------
# Async engine — connection pool parametreleri production yükü için ayarlı
# ---------------------------------------------------------------------------
# pool_size       : havuzda sürekli açık tutulan bağlantı sayısı
# max_overflow    : pool_size üstüne çıkabilecek ekstra bağlantı sayısı
# pool_timeout    : boş bağlantı beklenecek maks. süre (sn)
# pool_recycle    : bağlantının zorla yenileneceği süre (sn) — PostgreSQL'in
#                   idle timeout'unu aşmamak için 1800 sn (30 dk) uygundur
# pool_pre_ping   : her kullanım öncesi "SELECT 1" ile bağlantı sağlığını kontrol eder
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=1800,
    future=True,
)

_tenant_schema: ContextVar[str | None] = ContextVar("tenant_schema", default=None)
_identifier_preparer = postgresql.dialect().identifier_preparer


def quote_ident(value: str) -> str:
    if not value or "\x00" in value:
        raise ValueError("Invalid SQL identifier")
    return _identifier_preparer.quote(value)


async def apply_search_path(conn, schema_name: str) -> None:
    await conn.execute(
        text("SELECT set_config('search_path', quote_ident(:schema_name) || ', public', true)"),
        {"schema_name": schema_name},
    )


def set_tenant_schema(schema_name: str):
    return _tenant_schema.set(schema_name)


def reset_tenant_schema(token) -> None:
    _tenant_schema.reset(token)


def current_tenant_schema() -> str | None:
    return _tenant_schema.get()


async def _apply_search_path(conn) -> None:
    schema_name = current_tenant_schema()
    if schema_name:
        await apply_search_path(conn, schema_name)


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
