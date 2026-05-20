"""
Mevcut veritabanındaki plan limitlerini VPS boyutuna uygun değerlere günceller.
(4 vCPU / 16 GB RAM / 200 GB NVMe / 16 TB bandwidth)

Kullanım:
  docker compose exec backend python scripts/upgrade_plan_limits.py
"""
import asyncio
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.db.session import platform_execute


SQL = """
-- Tüm tenant'ları 'free' plana al (pro plan kaldırıldı)
UPDATE public.tenant SET plan_code = 'free' WHERE plan_code != 'free';

-- Free plan limitlerini VPS boyutuna yükselt
UPDATE public.plan SET
  name                = 'Standard',
  max_admins          = 50,
  max_categories      = 999,
  max_headings        = 99999,
  max_contents        = 99999,
  max_upload_bytes    = 10737418240,
  max_seo_pages       = 99999,
  public_rate_limit   = 1000,
  search_rate_limit   = 500,
  admin_rate_limit    = 600,
  ai_monthly_limit    = 500
WHERE code = 'free';

-- Entitlement tablosunu da güncelle
INSERT INTO public.plan_entitlement (plan_code, key, entitlement_value)
VALUES
  ('free', 'max_admins',        to_jsonb(CAST(50        AS int))),
  ('free', 'max_categories',    to_jsonb(CAST(999       AS int))),
  ('free', 'max_headings',      to_jsonb(CAST(99999     AS int))),
  ('free', 'max_contents',      to_jsonb(CAST(99999     AS int))),
  ('free', 'max_upload_bytes',  to_jsonb(CAST(10737418240 AS bigint))),
  ('free', 'max_seo_pages',     to_jsonb(CAST(99999     AS int))),
  ('free', 'public_rate_limit', to_jsonb(CAST(1000      AS int))),
  ('free', 'search_rate_limit', to_jsonb(CAST(500       AS int))),
  ('free', 'admin_rate_limit',  to_jsonb(CAST(600       AS int))),
  ('free', 'ai_monthly_limit',  to_jsonb(CAST(500       AS int)))
ON CONFLICT (plan_code, key) DO UPDATE SET
  entitlement_value = EXCLUDED.entitlement_value,
  updated_at        = now();

-- Pro planı kaldır (varsa — önce tenant bağımlılığını kestik)
DELETE FROM public.plan_entitlement WHERE plan_code = 'pro';
DELETE FROM public.plan WHERE code = 'pro';

-- Karakter limiti constraint'leri (her tenant şemasına uygula)
DO $$
DECLARE
  s TEXT;
BEGIN
  FOR s IN SELECT schema_name FROM information_schema.schemata
           WHERE schema_name NOT IN ('pg_catalog','information_schema','public','pg_toast')
  LOOP
    EXECUTE format('
      ALTER TABLE %I.category DROP CONSTRAINT IF EXISTS category_name_len_ck;
      ALTER TABLE %I.category ADD CONSTRAINT category_name_len_ck CHECK (char_length(name::text) <= 60);
      ALTER TABLE %I.category DROP CONSTRAINT IF EXISTS category_desc_len_ck;
      ALTER TABLE %I.category ADD CONSTRAINT category_desc_len_ck CHECK (description IS NULL OR char_length(description) <= 200);
      ALTER TABLE %I.heading DROP CONSTRAINT IF EXISTS heading_title_len_ck;
      ALTER TABLE %I.heading ADD CONSTRAINT heading_title_len_ck CHECK (char_length(title::text) <= 80);
      ALTER TABLE %I.heading DROP CONSTRAINT IF EXISTS heading_desc_len_ck;
      ALTER TABLE %I.heading ADD CONSTRAINT heading_desc_len_ck CHECK (description IS NULL OR char_length(description) <= 200);
      ALTER TABLE %I.content DROP CONSTRAINT IF EXISTS content_desc_len_ck;
      ALTER TABLE %I.content ADD CONSTRAINT content_desc_len_ck CHECK (description IS NULL OR char_length(description) <= 160);
    ', s,s,s,s,s,s,s,s,s,s,s);
  END LOOP;
END $$;
"""


async def main() -> None:
    await platform_execute(SQL, {})
    print("✓ Plan limits upgraded successfully.")
    print("  free → Standard: 999 cats / 99999 headings / 99999 contents / 10GB upload")
    print("  Rate limits: public=1000/min  search=500/min  admin=600/min")
    print("  Char limits: category.name<=60  heading.title<=80  content.description<=160")


if __name__ == "__main__":
    asyncio.run(main())
