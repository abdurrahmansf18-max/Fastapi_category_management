from __future__ import annotations

import re

from sqlalchemy import text

from app.db.session import engine, quote_ident

SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")

FREE_PLAN_LIMITS = {
    "max_admins": 3,
    "max_categories": 20,
    "max_headings": 200,
    "max_contents": 200,
    "max_upload_bytes": 100 * 1024 * 1024,
}


def schema_name_for_slug(slug: str) -> str:
    if not SLUG_RE.fullmatch(slug):
        raise ValueError("Invalid tenant slug")
    return "tenant_" + slug.replace("-", "_")


PLATFORM_DDL = [
    "CREATE EXTENSION IF NOT EXISTS citext",
    "CREATE EXTENSION IF NOT EXISTS pgcrypto",
    "CREATE EXTENSION IF NOT EXISTS unaccent",
    "CREATE EXTENSION IF NOT EXISTS pg_trgm",
    """
    CREATE TABLE IF NOT EXISTS public.plan (
      code text PRIMARY KEY,
      name text NOT NULL,
      max_admins int NOT NULL,
      max_categories int NOT NULL,
      max_headings int NOT NULL,
      max_contents int NOT NULL,
      max_upload_bytes bigint NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    INSERT INTO public.plan (
      code, name, max_admins, max_categories, max_headings, max_contents, max_upload_bytes
    )
    VALUES (
      'free', 'Free',
      :max_admins, :max_categories, :max_headings, :max_contents, :max_upload_bytes
    )
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      max_admins = EXCLUDED.max_admins,
      max_categories = EXCLUDED.max_categories,
      max_headings = EXCLUDED.max_headings,
      max_contents = EXCLUDED.max_contents,
      max_upload_bytes = EXCLUDED.max_upload_bytes
    """,
    """
    CREATE TABLE IF NOT EXISTS public.user_account (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email citext NOT NULL UNIQUE,
      password_hash text NOT NULL,
      email_verified boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS public.tenant (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id uuid NOT NULL REFERENCES public.user_account(id) ON DELETE RESTRICT,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      schema_name text NOT NULL UNIQUE,
      plan_code text NOT NULL DEFAULT 'free' REFERENCES public.plan(code),
      status text NOT NULL DEFAULT 'pending_verification'
        CHECK (status IN ('pending_verification', 'active', 'suspended')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tenant_slug_format_ck CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    )
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_owner_workspace
      ON public.tenant(owner_user_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS public.tenant_member (
      tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.user_account(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('owner', 'admin')),
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (tenant_id, user_id)
    )
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_member_user_once
      ON public.tenant_member(user_id)
    """,
    """
    CREATE TABLE IF NOT EXISTS public.email_verification_token (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.user_account(id) ON DELETE CASCADE,
      tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE OR REPLACE FUNCTION public.set_platform_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;$$
    """,
    """
    DROP TRIGGER IF EXISTS trg_user_account_updated ON public.user_account
    """,
    """
    CREATE TRIGGER trg_user_account_updated
    BEFORE UPDATE ON public.user_account
    FOR EACH ROW EXECUTE FUNCTION public.set_platform_updated_at()
    """,
    """
    DROP TRIGGER IF EXISTS trg_tenant_updated ON public.tenant
    """,
    """
    CREATE TRIGGER trg_tenant_updated
    BEFORE UPDATE ON public.tenant
    FOR EACH ROW EXECUTE FUNCTION public.set_platform_updated_at()
    """,
]


TENANT_DDL = [
    """
    CREATE TABLE IF NOT EXISTS category (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name citext NOT NULL UNIQUE,
      description text,
      slug text NOT NULL,
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT category_name_not_blank CHECK (btrim(name::text) <> ''),
      CONSTRAINT category_slug_format_ck CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS heading (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id uuid REFERENCES category(id) ON DELETE CASCADE,
      parent_heading_id uuid REFERENCES heading(id) ON DELETE CASCADE,
      level smallint NOT NULL CHECK (level IN (1,2)),
      title citext NOT NULL,
      description text,
      slug text NOT NULL,
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT heading_title_not_blank CHECK (btrim(title::text) <> ''),
      CONSTRAINT heading_level_parent_ck CHECK (
        (level = 1 AND category_id IS NOT NULL AND parent_heading_id IS NULL) OR
        (level = 2 AND parent_heading_id IS NOT NULL AND category_id IS NULL)
      )
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS content (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      heading_id uuid NOT NULL UNIQUE REFERENCES heading(id) ON DELETE CASCADE,
      body text NOT NULL,
      description text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS content_image (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      url text NOT NULL,
      alt text NOT NULL DEFAULT '',
      sort_order int NOT NULL DEFAULT 0,
      width integer NOT NULL DEFAULT 0,
      height integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT content_image_url_ck CHECK (btrim(url) <> '' AND url ~ '^(https?://|/|s3://)')
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS site_setting (
      key citext PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
    """,
    """
    CREATE OR REPLACE FUNCTION normalize_slug(src text)
    RETURNS text
    LANGUAGE plpgsql IMMUTABLE AS $$
    DECLARE s text;
    BEGIN
      IF src IS NULL OR btrim(src) = '' THEN
        RETURN NULL;
      END IF;
      s := regexp_replace(lower(unaccent(src)), '[^a-z0-9]+', '-', 'g');
      s := regexp_replace(s, '^-+|-+$', '', 'g');
      IF s = '' THEN
        RETURN NULL;
      END IF;
      RETURN s;
    END;$$
    """,
    """
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;$$
    """,
    """
    CREATE OR REPLACE FUNCTION set_category_slug()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE base text; s text; i int := 2;
    BEGIN
      base := normalize_slug(NEW.name);
      s := base;
      WHILE EXISTS (
        SELECT 1 FROM category c
        WHERE c.slug = s
          AND c.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) LOOP
        s := base || '-' || i; i := i + 1;
      END LOOP;
      NEW.slug := s;
      RETURN NEW;
    END;$$
    """,
    """
    CREATE OR REPLACE FUNCTION set_heading_slug()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE base text; s text; i int := 2;
    BEGIN
      base := normalize_slug(NEW.title);
      s := base;

      IF NEW.level = 1 THEN
        WHILE EXISTS (
          SELECT 1 FROM heading h
          WHERE h.level = 1 AND h.category_id = NEW.category_id AND h.slug = s
            AND h.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) LOOP
          s := base || '-' || i; i := i + 1;
        END LOOP;
      ELSE
        WHILE EXISTS (
          SELECT 1 FROM heading h
          WHERE h.level = 2 AND h.parent_heading_id = NEW.parent_heading_id AND h.slug = s
            AND h.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) LOOP
          s := base || '-' || i; i := i + 1;
        END LOOP;
      END IF;

      NEW.slug := s;
      RETURN NEW;
    END;$$
    """,
    """
    CREATE OR REPLACE FUNCTION prevent_l2_when_parent_has_content()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE has_content boolean;
    BEGIN
      IF NEW.level = 2 THEN
        SELECT EXISTS (SELECT 1 FROM content c WHERE c.heading_id = NEW.parent_heading_id)
          INTO has_content;
        IF has_content THEN
          RAISE EXCEPTION 'Ana başlık (L1) içerik barındırıyorken alt başlık (L2) oluşturulamaz/güncellenemez.';
        END IF;
      END IF;
      RETURN NEW;
    END;$$
    """,
    """
    CREATE OR REPLACE FUNCTION heading_parent_guard()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE p_level smallint;
    BEGIN
      IF NEW.level = 2 THEN
        SELECT level INTO p_level FROM heading WHERE id = NEW.parent_heading_id;
        IF p_level IS DISTINCT FROM 1 THEN
          RAISE EXCEPTION 'L2 heading''in ebeveyni level=1 olmalı.';
        END IF;
      END IF;
      RETURN NEW;
    END;$$
    """,
    """
    CREATE OR REPLACE FUNCTION prevent_level_update()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'UPDATE' AND NEW.level IS DISTINCT FROM OLD.level THEN
        RAISE EXCEPTION 'Heading level sonradan değiştirilemez (immutable).';
      END IF;
      RETURN NEW;
    END;$$
    """,
    """
    CREATE OR REPLACE FUNCTION enforce_content_vs_children()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE child_count int;
    BEGIN
      IF (SELECT level FROM heading WHERE id = NEW.heading_id) = 1 THEN
        SELECT COUNT(*) INTO child_count FROM heading WHERE parent_heading_id = NEW.heading_id;
        IF child_count > 0 THEN
          RAISE EXCEPTION 'L1 heading alt başlık içerirken kendisine içerik eklenemez.';
        END IF;
      END IF;
      RETURN NEW;
    END;$$
    """,
    """
    CREATE OR REPLACE FUNCTION search_all_trgm(q text, limit_count int DEFAULT 50)
    RETURNS TABLE(source text, id uuid, label text, snippet text, score real)
    LANGUAGE sql AS $$
      (
        SELECT 'category'::text, c.id, c.name::text, c.description, similarity(c.name::text, q) AS score
        FROM category c
        WHERE c.name ILIKE '%'||q||'%' OR c.description ILIKE '%'||q||'%'
      )
      UNION ALL
      (
        SELECT 'heading', h.id, h.title::text, h.description, similarity(h.title::text, q) AS score
        FROM heading h
        WHERE h.title ILIKE '%'||q||'%' OR h.description ILIKE '%'||q||'%'
      )
      UNION ALL
      (
        SELECT 'content', ct.id, NULL::text, substring(ct.body from 1 for 240), similarity(ct.body, q) AS score
        FROM content ct
        WHERE ct.body ILIKE '%'||q||'%' OR ct.description ILIKE '%'||q||'%'
      )
      ORDER BY score DESC
      LIMIT limit_count;
    $$
    """,
    "DROP TRIGGER IF EXISTS trg_category_updated ON category",
    "CREATE TRIGGER trg_category_updated BEFORE UPDATE ON category FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    "DROP TRIGGER IF EXISTS trg_heading_updated ON heading",
    "CREATE TRIGGER trg_heading_updated BEFORE UPDATE ON heading FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    "DROP TRIGGER IF EXISTS trg_content_updated ON content",
    "CREATE TRIGGER trg_content_updated BEFORE UPDATE ON content FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    "DROP TRIGGER IF EXISTS trg_content_image_updated ON content_image",
    "CREATE TRIGGER trg_content_image_updated BEFORE UPDATE ON content_image FOR EACH ROW EXECUTE FUNCTION set_updated_at()",
    "DROP TRIGGER IF EXISTS trg_set_category_slug ON category",
    "CREATE TRIGGER trg_set_category_slug BEFORE INSERT OR UPDATE OF name, slug ON category FOR EACH ROW EXECUTE FUNCTION set_category_slug()",
    "DROP TRIGGER IF EXISTS trg_set_heading_slug ON heading",
    "CREATE TRIGGER trg_set_heading_slug BEFORE INSERT OR UPDATE OF title, slug ON heading FOR EACH ROW EXECUTE FUNCTION set_heading_slug()",
    "DROP TRIGGER IF EXISTS trg_content_parent_rule ON content",
    "CREATE TRIGGER trg_content_parent_rule BEFORE INSERT OR UPDATE OF heading_id ON content FOR EACH ROW EXECUTE FUNCTION enforce_content_vs_children()",
    "DROP TRIGGER IF EXISTS trg_heading_parent_guard ON heading",
    "CREATE TRIGGER trg_heading_parent_guard BEFORE INSERT OR UPDATE OF parent_heading_id, level ON heading FOR EACH ROW EXECUTE FUNCTION heading_parent_guard()",
    "DROP TRIGGER IF EXISTS trg_prevent_l2_when_parent_has_content ON heading",
    "CREATE TRIGGER trg_prevent_l2_when_parent_has_content BEFORE INSERT OR UPDATE OF parent_heading_id, level ON heading FOR EACH ROW EXECUTE FUNCTION prevent_l2_when_parent_has_content()",
    "DROP TRIGGER IF EXISTS trg_prevent_level_update ON heading",
    "CREATE TRIGGER trg_prevent_level_update BEFORE UPDATE OF level ON heading FOR EACH ROW EXECUTE FUNCTION prevent_level_update()",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_category_slug ON category(slug)",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_heading_level1_slug ON heading(category_id, slug) WHERE level = 1",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_heading_level2_slug ON heading(parent_heading_id, slug) WHERE level = 2",
    "CREATE INDEX IF NOT EXISTS idx_heading_category_l1 ON heading(category_id) WHERE level = 1",
    "CREATE INDEX IF NOT EXISTS idx_heading_parent_l2 ON heading(parent_heading_id) WHERE level = 2",
    "CREATE INDEX IF NOT EXISTS idx_heading_l1_sort ON heading(category_id, sort_order, id) WHERE level = 1",
    "CREATE INDEX IF NOT EXISTS idx_heading_l2_sort ON heading(parent_heading_id, sort_order, id) WHERE level = 2",
    "CREATE INDEX IF NOT EXISTS idx_category_name_trgm ON category USING gin ((name::text) gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_category_desc_trgm ON category USING gin (description gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_heading_title_trgm ON heading USING gin ((title::text) gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_heading_desc_trgm ON heading USING gin (description gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_content_body_trgm ON content USING gin (body gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_content_desc_trgm ON content USING gin (description gin_trgm_ops)",
    "CREATE INDEX IF NOT EXISTS idx_content_image_order ON content_image(content_id, sort_order, id)",
    "CREATE UNIQUE INDEX IF NOT EXISTS uq_content_image_sort ON content_image(content_id, sort_order)",
    "INSERT INTO site_setting (key, value) VALUES ('site_title', 'Fastapi') ON CONFLICT DO NOTHING",
    "INSERT INTO site_setting (key, value) VALUES ('site_logo', '') ON CONFLICT DO NOTHING",
]


async def run_platform_migrations() -> None:
    async with engine.begin() as conn:
        for stmt in PLATFORM_DDL:
            await conn.execute(text(stmt), FREE_PLAN_LIMITS)


async def provision_tenant_schema(schema_name: str) -> None:
    async with engine.begin() as conn:
        await conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {quote_ident(schema_name)}"))
        await conn.execute(text(f"SET LOCAL search_path TO {quote_ident(schema_name)}, public"))
        for stmt in TENANT_DDL:
            await conn.execute(text(stmt))
