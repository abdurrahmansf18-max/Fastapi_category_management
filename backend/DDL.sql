-- Auto-generated file. Do not edit manually.
-- Source: app.db.provisioning.PLATFORM_DDL + TENANT_DDL
-- Regenerate: python backend/scripts/generate_schema_sql.py
-- platform_checksum: a350937b7542f23c12186e1f1736835c9d28887364bda18c2e50bf26d83284de
-- tenant_template_checksum: bbd7c9d292033bcc2955f01606fe3d6257676cd2c1809bf22d1ad27e5e46002c
-- PUBLIC PLATFORM SCHEMA

CREATE EXTENSION IF NOT EXISTS citext;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.plan (
      code text PRIMARY KEY,
      name text NOT NULL,
      max_admins int NOT NULL,
      max_categories int NOT NULL,
      max_headings int NOT NULL,
      max_contents int NOT NULL,
      max_upload_bytes bigint NOT NULL,
      max_seo_pages int NOT NULL DEFAULT 200,
      public_rate_limit int NOT NULL DEFAULT 120,
      search_rate_limit int NOT NULL DEFAULT 60,
      admin_rate_limit int NOT NULL DEFAULT 120,
      ai_monthly_limit int NOT NULL DEFAULT 25,
      created_at timestamptz NOT NULL DEFAULT now()
    );

ALTER TABLE public.plan ADD COLUMN IF NOT EXISTS max_seo_pages int NOT NULL DEFAULT 200;

ALTER TABLE public.plan ADD COLUMN IF NOT EXISTS public_rate_limit int NOT NULL DEFAULT 120;

ALTER TABLE public.plan ADD COLUMN IF NOT EXISTS search_rate_limit int NOT NULL DEFAULT 60;

ALTER TABLE public.plan ADD COLUMN IF NOT EXISTS admin_rate_limit int NOT NULL DEFAULT 120;

ALTER TABLE public.plan ADD COLUMN IF NOT EXISTS ai_monthly_limit int NOT NULL DEFAULT 25;

CREATE TABLE IF NOT EXISTS public.plan_entitlement (
      plan_code text NOT NULL REFERENCES public.plan(code) ON DELETE CASCADE,
      key text NOT NULL,
      entitlement_value jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (plan_code, key)
    );

INSERT INTO public.plan (
      code, name, max_admins, max_categories, max_headings, max_contents, max_upload_bytes,
      max_seo_pages, public_rate_limit, search_rate_limit, admin_rate_limit, ai_monthly_limit
    )
    VALUES (
      'free', 'Free',
      2, 20, 800, 800, 1073741824,
      800, 180, 80, 120, 0
    ),
    (
      'pro', 'Pro',
      10, 200, 2000, 2000, 5368709120,
      2000, 600, 300, 600, 500
    )
    ON CONFLICT (code) DO UPDATE SET
      name = EXCLUDED.name,
      max_admins = EXCLUDED.max_admins,
      max_categories = EXCLUDED.max_categories,
      max_headings = EXCLUDED.max_headings,
      max_contents = EXCLUDED.max_contents,
      max_upload_bytes = EXCLUDED.max_upload_bytes,
      max_seo_pages = EXCLUDED.max_seo_pages,
      public_rate_limit = EXCLUDED.public_rate_limit,
      search_rate_limit = EXCLUDED.search_rate_limit,
      admin_rate_limit = EXCLUDED.admin_rate_limit,
      ai_monthly_limit = EXCLUDED.ai_monthly_limit;

INSERT INTO public.plan_entitlement (plan_code, key, entitlement_value)
    VALUES
      ('free', 'max_admins', to_jsonb(CAST(2 AS int))),
      ('free', 'max_categories', to_jsonb(CAST(20 AS int))),
      ('free', 'max_headings', to_jsonb(CAST(800 AS int))),
      ('free', 'max_contents', to_jsonb(CAST(800 AS int))),
      ('free', 'max_upload_bytes', to_jsonb(CAST(1073741824 AS bigint))),
      ('free', 'max_seo_pages', to_jsonb(CAST(800 AS int))),
      ('free', 'public_rate_limit', to_jsonb(CAST(180 AS int))),
      ('free', 'search_rate_limit', to_jsonb(CAST(80 AS int))),
      ('free', 'admin_rate_limit', to_jsonb(CAST(120 AS int))),
      ('free', 'ai_monthly_limit', to_jsonb(CAST(0 AS int))),
      ('pro', 'max_admins', to_jsonb(CAST(10 AS int))),
      ('pro', 'max_categories', to_jsonb(CAST(200 AS int))),
      ('pro', 'max_headings', to_jsonb(CAST(2000 AS int))),
      ('pro', 'max_contents', to_jsonb(CAST(2000 AS int))),
      ('pro', 'max_upload_bytes', to_jsonb(CAST(5368709120 AS bigint))),
      ('pro', 'max_seo_pages', to_jsonb(CAST(2000 AS int))),
      ('pro', 'public_rate_limit', to_jsonb(CAST(600 AS int))),
      ('pro', 'search_rate_limit', to_jsonb(CAST(300 AS int))),
      ('pro', 'admin_rate_limit', to_jsonb(CAST(600 AS int))),
      ('pro', 'ai_monthly_limit', to_jsonb(CAST(500 AS int)))
    ON CONFLICT (plan_code, key) DO UPDATE SET
      entitlement_value = EXCLUDED.entitlement_value,
      updated_at = now();

CREATE TABLE IF NOT EXISTS public.user_account (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email citext NOT NULL UNIQUE,
      password_hash text NOT NULL,
      email_verified boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS public.tenant (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_user_id uuid NOT NULL REFERENCES public.user_account(id) ON DELETE RESTRICT,
      name text NOT NULL,
      slug text NOT NULL UNIQUE,
      schema_name text NOT NULL UNIQUE,
      plan_code text NOT NULL DEFAULT 'free' REFERENCES public.plan(code),
      discoverable boolean NOT NULL DEFAULT true,
      status text NOT NULL DEFAULT 'pending_verification'
        CHECK (status IN ('pending_verification', 'active', 'suspended')),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT tenant_slug_format_ck CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    );

ALTER TABLE public.tenant ADD COLUMN IF NOT EXISTS discoverable boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_owner_workspace
      ON public.tenant(owner_user_id);

CREATE TABLE IF NOT EXISTS public.tenant_member (
      tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.user_account(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('owner', 'admin')),
      created_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (tenant_id, user_id)
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_member_user_once
      ON public.tenant_member(user_id);

CREATE TABLE IF NOT EXISTS public.email_verification_token (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES public.user_account(id) ON DELETE CASCADE,
      tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      expires_at timestamptz NOT NULL,
      consumed_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

CREATE TABLE IF NOT EXISTS public.audit_event (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid REFERENCES public.tenant(id) ON DELETE SET NULL,
      actor_user_id uuid REFERENCES public.user_account(id) ON DELETE SET NULL,
      action text NOT NULL,
      target_type text,
      target_id text,
      metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_audit_event_tenant_time ON public.audit_event(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_action_time ON public.audit_event(action, created_at DESC);

CREATE TABLE IF NOT EXISTS public.admin_session (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES public.user_account(id) ON DELETE CASCADE,
      token_hash text NOT NULL UNIQUE,
      refresh_hash text UNIQUE,
      csrf_hash text NOT NULL,
      user_agent text,
      ip inet,
      revoked_at timestamptz,
      expires_at timestamptz NOT NULL,
      refresh_expires_at timestamptz,
      last_seen_at timestamptz,
      impersonated_by text,
      impersonation_reason text,
      created_at timestamptz NOT NULL DEFAULT now()
    );

ALTER TABLE public.admin_session ADD COLUMN IF NOT EXISTS refresh_hash text;

ALTER TABLE public.admin_session ADD COLUMN IF NOT EXISTS refresh_expires_at timestamptz;

ALTER TABLE public.admin_session ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

ALTER TABLE public.admin_session ADD COLUMN IF NOT EXISTS impersonated_by text;

ALTER TABLE public.admin_session ADD COLUMN IF NOT EXISTS impersonation_reason text;

CREATE INDEX IF NOT EXISTS idx_admin_session_user_active ON public.admin_session(user_id, tenant_id, expires_at) WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_admin_session_refresh_hash ON public.admin_session(refresh_hash) WHERE refresh_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_admin_session_refresh_active ON public.admin_session(refresh_hash, refresh_expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.platform_session (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      token_hash text NOT NULL UNIQUE,
      refresh_hash text NOT NULL UNIQUE,
      csrf_hash text NOT NULL,
      user_agent text,
      ip inet,
      revoked_at timestamptz,
      expires_at timestamptz NOT NULL,
      refresh_expires_at timestamptz NOT NULL,
      last_seen_at timestamptz,
      created_at timestamptz NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_platform_session_active ON public.platform_session(expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.payment_customer (
      tenant_id uuid PRIMARY KEY REFERENCES public.tenant(id) ON DELETE CASCADE,
      provider text NOT NULL DEFAULT 'iyzico',
      provider_customer_id text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (provider, provider_customer_id)
    );

ALTER TABLE public.payment_customer ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'iyzico';

ALTER TABLE public.payment_customer ADD COLUMN IF NOT EXISTS provider_customer_id text;

DO $$
    DECLARE
      legacy_customer_column text := 'str' || 'ipe_customer_id';
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'payment_customer'
          AND column_name = legacy_customer_column
      ) THEN
        EXECUTE format(
          'UPDATE public.payment_customer
           SET provider = %L,
               provider_customer_id = COALESCE(provider_customer_id, %I)
           WHERE provider_customer_id IS NULL',
          'iyzico',
          legacy_customer_column
        );
        EXECUTE format('ALTER TABLE public.payment_customer DROP COLUMN %I', legacy_customer_column);
      END IF;
    END $$;

UPDATE public.payment_customer SET provider_customer_id = tenant_id::text WHERE provider_customer_id IS NULL;

ALTER TABLE public.payment_customer ALTER COLUMN provider_customer_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_customer_provider_customer ON public.payment_customer(provider, provider_customer_id);

CREATE TABLE IF NOT EXISTS public.subscription (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
      provider text NOT NULL DEFAULT 'iyzico',
      provider_subscription_id text NOT NULL UNIQUE,
      status text NOT NULL,
      plan_code text NOT NULL REFERENCES public.plan(code),
      current_period_end timestamptz,
      cancel_at_period_end boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

ALTER TABLE public.subscription ALTER COLUMN provider SET DEFAULT 'iyzico';

CREATE INDEX IF NOT EXISTS idx_subscription_tenant_status ON public.subscription(tenant_id, status);

CREATE TABLE IF NOT EXISTS public.billing_event (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      provider text NOT NULL DEFAULT 'iyzico',
      provider_event_id text NOT NULL UNIQUE,
      event_type text NOT NULL,
      tenant_id uuid REFERENCES public.tenant(id) ON DELETE SET NULL,
      payload jsonb NOT NULL,
      processed_at timestamptz NOT NULL DEFAULT now()
    );

ALTER TABLE public.billing_event ALTER COLUMN provider SET DEFAULT 'iyzico';

CREATE TABLE IF NOT EXISTS public.usage_counter (
      tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
      key text NOT NULL,
      period_start date NOT NULL,
      value bigint NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (tenant_id, key, period_start)
    );

CREATE TABLE IF NOT EXISTS public.search_event (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
      query text NOT NULL,
      source text NOT NULL CHECK (source IN ('public', 'suggest', 'admin')),
      result_count int NOT NULL DEFAULT 0,
      filters jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_search_event_tenant_time ON public.search_event(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_search_event_tenant_query ON public.search_event(tenant_id, query);

CREATE TABLE IF NOT EXISTS public.feedback_event (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL REFERENCES public.tenant(id) ON DELETE CASCADE,
      url text NOT NULL,
      rating text NOT NULL CHECK (rating IN ('helpful', 'not_helpful')),
      message text,
      user_agent text,
      ip inet,
      created_at timestamptz NOT NULL DEFAULT now()
    );

CREATE INDEX IF NOT EXISTS idx_feedback_event_tenant_time ON public.feedback_event(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.platform_override (
      tenant_id uuid PRIMARY KEY REFERENCES public.tenant(id) ON DELETE CASCADE,
      plan_code text REFERENCES public.plan(code),
      reason text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

CREATE OR REPLACE FUNCTION public.set_platform_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;$$;

DROP TRIGGER IF EXISTS trg_user_account_updated ON public.user_account;

CREATE TRIGGER trg_user_account_updated
    BEFORE UPDATE ON public.user_account
    FOR EACH ROW EXECUTE FUNCTION public.set_platform_updated_at();

DROP TRIGGER IF EXISTS trg_tenant_updated ON public.tenant;

CREATE TRIGGER trg_tenant_updated
    BEFORE UPDATE ON public.tenant
    FOR EACH ROW EXECUTE FUNCTION public.set_platform_updated_at();

-- TENANT TEMPLATE SCHEMA

CREATE TABLE IF NOT EXISTS category (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name citext NOT NULL UNIQUE,
      description text,
      seo_description text,
      slug text NOT NULL,
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT category_name_not_blank CHECK (btrim(name::text) <> ''),
      CONSTRAINT category_slug_format_ck CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
    );

CREATE TABLE IF NOT EXISTS heading (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      category_id uuid REFERENCES category(id) ON DELETE CASCADE,
      parent_heading_id uuid REFERENCES heading(id) ON DELETE CASCADE,
      level smallint NOT NULL CHECK (level IN (1,2)),
      title citext NOT NULL,
      description text,
      seo_description text,
      slug text NOT NULL,
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT heading_title_not_blank CHECK (btrim(title::text) <> ''),
      CONSTRAINT heading_level_parent_ck CHECK (
        (level = 1 AND category_id IS NOT NULL AND parent_heading_id IS NULL) OR
        (level = 2 AND parent_heading_id IS NOT NULL AND category_id IS NULL)
      )
    );

CREATE TABLE IF NOT EXISTS content (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      heading_id uuid NOT NULL UNIQUE REFERENCES heading(id) ON DELETE CASCADE,
      body text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published')),
      published_at timestamptz DEFAULT now(),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

ALTER TABLE content ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published';

ALTER TABLE content ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now();

ALTER TABLE category ADD COLUMN IF NOT EXISTS seo_description text;

ALTER TABLE heading ADD COLUMN IF NOT EXISTS seo_description text;

ALTER TABLE content DROP CONSTRAINT IF EXISTS content_status_ck;

ALTER TABLE content ADD CONSTRAINT content_status_ck CHECK (status IN ('draft', 'published'));

ALTER TABLE category DROP CONSTRAINT IF EXISTS category_name_len_ck;

ALTER TABLE category ADD CONSTRAINT category_name_len_ck CHECK (char_length(name::text) <= 60);

ALTER TABLE category DROP CONSTRAINT IF EXISTS category_desc_len_ck;

ALTER TABLE category ADD CONSTRAINT category_desc_len_ck CHECK (description IS NULL OR char_length(description) <= 200);

ALTER TABLE category DROP CONSTRAINT IF EXISTS category_seo_desc_len_ck;

ALTER TABLE category ADD CONSTRAINT category_seo_desc_len_ck CHECK (seo_description IS NULL OR char_length(seo_description) <= 320);

ALTER TABLE heading DROP CONSTRAINT IF EXISTS heading_title_len_ck;

ALTER TABLE heading ADD CONSTRAINT heading_title_len_ck CHECK (char_length(title::text) <= 80);

ALTER TABLE heading DROP CONSTRAINT IF EXISTS heading_desc_len_ck;

ALTER TABLE heading ADD CONSTRAINT heading_desc_len_ck CHECK (description IS NULL OR char_length(description) <= 200);

ALTER TABLE heading DROP CONSTRAINT IF EXISTS heading_seo_desc_len_ck;

ALTER TABLE heading ADD CONSTRAINT heading_seo_desc_len_ck CHECK (seo_description IS NULL OR char_length(seo_description) <= 320);

ALTER TABLE content DROP CONSTRAINT IF EXISTS content_body_min_len_ck;

ALTER TABLE content ADD CONSTRAINT content_body_min_len_ck CHECK (char_length(btrim(body)) >= 120);

ALTER TABLE content DROP CONSTRAINT IF EXISTS content_desc_dynamic_len_ck;

ALTER TABLE content ADD CONSTRAINT content_desc_dynamic_len_ck CHECK (description IS NULL OR char_length(description) <= LEAST(320, GREATEST(80, floor((char_length(body)::numeric) * 0.20)::int)));

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
    );

CREATE TABLE IF NOT EXISTS content_attachment (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      content_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
      label text NOT NULL DEFAULT '',
      file_name text NOT NULL DEFAULT 'attachment',
      mime_type text NOT NULL DEFAULT 'application/octet-stream',
      size_bytes bigint NOT NULL DEFAULT 0,
      url text NOT NULL,
      sort_order int NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT content_attachment_url_ck CHECK (btrim(url) <> '' AND url ~ '^(https?://|/|s3://)')
    );

ALTER TABLE content_attachment DROP CONSTRAINT IF EXISTS content_attachment_label_len_ck;

ALTER TABLE content_attachment ADD CONSTRAINT content_attachment_label_len_ck CHECK (char_length(label) <= 120);

ALTER TABLE content_attachment DROP CONSTRAINT IF EXISTS content_attachment_name_len_ck;

ALTER TABLE content_attachment ADD CONSTRAINT content_attachment_name_len_ck CHECK (char_length(file_name) <= 255);

ALTER TABLE content_attachment DROP CONSTRAINT IF EXISTS content_attachment_mime_len_ck;

ALTER TABLE content_attachment ADD CONSTRAINT content_attachment_mime_len_ck CHECK (char_length(mime_type) <= 120);

ALTER TABLE content_attachment DROP CONSTRAINT IF EXISTS content_attachment_size_nonneg_ck;

ALTER TABLE content_attachment ADD CONSTRAINT content_attachment_size_nonneg_ck CHECK (size_bytes >= 0);

CREATE TABLE IF NOT EXISTS redirect_rule (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      source_path text NOT NULL UNIQUE,
      target_path text NOT NULL,
      status_code smallint NOT NULL DEFAULT 301 CHECK (status_code IN (301,302,307,308)),
      is_active boolean NOT NULL DEFAULT true,
      note text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT redirect_source_path_ck CHECK (source_path ~ '^/'),
      CONSTRAINT redirect_target_path_ck CHECK (target_path ~ '^/')
    );

ALTER TABLE redirect_rule DROP CONSTRAINT IF EXISTS redirect_note_len_ck;

ALTER TABLE redirect_rule ADD CONSTRAINT redirect_note_len_ck CHECK (note IS NULL OR char_length(note) <= 300);

CREATE TABLE IF NOT EXISTS site_setting (
      key citext PRIMARY KEY,
      value text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

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
    END;$$;

CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at := now();
      RETURN NEW;
    END;$$;

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
    END;$$;

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
    END;$$;

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
    END;$$;

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
    END;$$;

CREATE OR REPLACE FUNCTION prevent_level_update()
    RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'UPDATE' AND NEW.level IS DISTINCT FROM OLD.level THEN
        RAISE EXCEPTION 'Heading level sonradan değiştirilemez (immutable).';
      END IF;
      RETURN NEW;
    END;$$;

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
    END;$$;

CREATE OR REPLACE FUNCTION search_all_trgm(q text, limit_count int DEFAULT 50)
    RETURNS TABLE(source text, id uuid, label text, snippet text, score real)
    LANGUAGE sql AS $$
      (
        SELECT 'category'::text, c.id, c.name::text, c.description, similarity(c.name::text, q) AS score
        FROM category c
        WHERE c.name ILIKE '%'||q||'%' OR c.description ILIKE '%'||q||'%' OR c.seo_description ILIKE '%'||q||'%'
      )
      UNION ALL
      (
        SELECT 'heading', h.id, h.title::text, h.description, similarity(h.title::text, q) AS score
        FROM heading h
        WHERE h.title ILIKE '%'||q||'%' OR h.description ILIKE '%'||q||'%' OR h.seo_description ILIKE '%'||q||'%'
      )
      UNION ALL
      (
        SELECT 'content', ct.id, NULL::text, substring(ct.body from 1 for 240), similarity(ct.body, q) AS score
        FROM content ct
        WHERE ct.body ILIKE '%'||q||'%' OR ct.description ILIKE '%'||q||'%'
      )
      ORDER BY score DESC
      LIMIT limit_count;
    $$;

DROP TRIGGER IF EXISTS trg_category_updated ON category;

CREATE TRIGGER trg_category_updated BEFORE UPDATE ON category FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_heading_updated ON heading;

CREATE TRIGGER trg_heading_updated BEFORE UPDATE ON heading FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_content_updated ON content;

CREATE TRIGGER trg_content_updated BEFORE UPDATE ON content FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_content_image_updated ON content_image;

CREATE TRIGGER trg_content_image_updated BEFORE UPDATE ON content_image FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_content_attachment_updated ON content_attachment;

CREATE TRIGGER trg_content_attachment_updated BEFORE UPDATE ON content_attachment FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_redirect_rule_updated ON redirect_rule;

CREATE TRIGGER trg_redirect_rule_updated BEFORE UPDATE ON redirect_rule FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_set_category_slug ON category;

CREATE TRIGGER trg_set_category_slug BEFORE INSERT OR UPDATE OF name, slug ON category FOR EACH ROW EXECUTE FUNCTION set_category_slug();

DROP TRIGGER IF EXISTS trg_set_heading_slug ON heading;

CREATE TRIGGER trg_set_heading_slug BEFORE INSERT OR UPDATE OF title, slug ON heading FOR EACH ROW EXECUTE FUNCTION set_heading_slug();

DROP TRIGGER IF EXISTS trg_content_parent_rule ON content;

CREATE TRIGGER trg_content_parent_rule BEFORE INSERT OR UPDATE OF heading_id ON content FOR EACH ROW EXECUTE FUNCTION enforce_content_vs_children();

DROP TRIGGER IF EXISTS trg_heading_parent_guard ON heading;

CREATE TRIGGER trg_heading_parent_guard BEFORE INSERT OR UPDATE OF parent_heading_id, level ON heading FOR EACH ROW EXECUTE FUNCTION heading_parent_guard();

DROP TRIGGER IF EXISTS trg_prevent_l2_when_parent_has_content ON heading;

CREATE TRIGGER trg_prevent_l2_when_parent_has_content BEFORE INSERT OR UPDATE OF parent_heading_id, level ON heading FOR EACH ROW EXECUTE FUNCTION prevent_l2_when_parent_has_content();

DROP TRIGGER IF EXISTS trg_prevent_level_update ON heading;

CREATE TRIGGER trg_prevent_level_update BEFORE UPDATE OF level ON heading FOR EACH ROW EXECUTE FUNCTION prevent_level_update();

CREATE UNIQUE INDEX IF NOT EXISTS uq_category_slug ON category(slug);

CREATE UNIQUE INDEX IF NOT EXISTS uq_heading_level1_slug ON heading(category_id, slug) WHERE level = 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_heading_level2_slug ON heading(parent_heading_id, slug) WHERE level = 2;

CREATE INDEX IF NOT EXISTS idx_heading_category_l1 ON heading(category_id) WHERE level = 1;

CREATE INDEX IF NOT EXISTS idx_heading_parent_l2 ON heading(parent_heading_id) WHERE level = 2;

CREATE INDEX IF NOT EXISTS idx_heading_l1_sort ON heading(category_id, sort_order, id) WHERE level = 1;

CREATE INDEX IF NOT EXISTS idx_heading_l2_sort ON heading(parent_heading_id, sort_order, id) WHERE level = 2;

CREATE INDEX IF NOT EXISTS idx_category_name_trgm ON category USING gin ((name::text) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_category_desc_trgm ON category USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_category_seo_desc_trgm ON category USING gin (seo_description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_heading_title_trgm ON heading USING gin ((title::text) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_heading_desc_trgm ON heading USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_heading_seo_desc_trgm ON heading USING gin (seo_description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_content_body_trgm ON content USING gin (body gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_content_desc_trgm ON content USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_content_image_order ON content_image(content_id, sort_order, id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_content_image_sort ON content_image(content_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_content_attachment_order ON content_attachment(content_id, sort_order, id);

CREATE INDEX IF NOT EXISTS idx_redirect_rule_active_source ON redirect_rule(is_active, source_path);

INSERT INTO site_setting (key, value) VALUES ('site_logo', '') ON CONFLICT DO NOTHING;
