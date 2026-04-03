import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import engine
from sqlalchemy import text

async def init():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE TABLE IF NOT EXISTS public.site_setting ( key text PRIMARY KEY, value text NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL );"))
        await conn.execute(text("INSERT INTO public.site_setting (key, value) VALUES ('site_title', 'Fastapi') ON CONFLICT DO NOTHING;"))
        await conn.execute(text("INSERT INTO public.site_setting (key, value) VALUES ('site_logo', '') ON CONFLICT DO NOTHING;"))

if __name__ == '__main__':
    asyncio.run(init())
