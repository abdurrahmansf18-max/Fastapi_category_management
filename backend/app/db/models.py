# app/db/models.py
from sqlalchemy import (
    MetaData, Table, Column, CheckConstraint, ForeignKey,
    Text, Integer, SmallInteger, BigInteger, Boolean
)
from sqlalchemy.dialects.postgresql import UUID, CITEXT, TIMESTAMP
from sqlalchemy.sql import func, text
from sqlalchemy.schema import Index

metadata = MetaData()

# ==============
# Tables
# ==============

admin_user = Table(
    "admin_user", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True,
           server_default=text("gen_random_uuid()")),
    Column("email", CITEXT, nullable=False, unique=True),
    Column("password_hash", Text, nullable=False),
    Column("last_login_at", TIMESTAMP(timezone=True)),
    Column("created_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
)

category = Table(
    "category", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True,
           server_default=text("gen_random_uuid()")),
    Column("name", CITEXT, nullable=False, unique=True),
    Column("description", Text),
    Column("seo_description", Text),
    Column("slug", Text, nullable=False),
    Column("sort_order", Integer, nullable=False, server_default=text("0")),
    Column("created_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("btrim(name::text) <> ''", name="category_name_not_blank"),
    CheckConstraint("slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'", name="category_slug_format_ck"),
)

heading = Table(
    "heading", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True,
           server_default=text("gen_random_uuid()")),
    Column("category_id", UUID(as_uuid=True), ForeignKey("category.id", ondelete="CASCADE")),
    Column("parent_heading_id", UUID(as_uuid=True), ForeignKey("heading.id", ondelete="CASCADE")),
    Column("level", SmallInteger, nullable=False),
    Column("title", CITEXT, nullable=False),
    Column("description", Text),
    Column("seo_description", Text),
    Column("slug", Text, nullable=False),
    Column("sort_order", Integer, nullable=False, server_default=text("0")),
    Column("created_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("btrim(title::text) <> ''", name="heading_title_not_blank"),
    CheckConstraint(
        "((level = 1 AND category_id IS NOT NULL AND parent_heading_id IS NULL) OR "
        "(level = 2 AND parent_heading_id IS NOT NULL AND category_id IS NULL))",
        name="heading_level_parent_ck",
    ),
)

content = Table(
    "content", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True,
           server_default=text("gen_random_uuid()")),
    Column("heading_id", UUID(as_uuid=True), ForeignKey("heading.id", ondelete="CASCADE"),
           nullable=False, unique=True),
    Column("body", Text, nullable=False),
    Column("description", Text),
    Column("status", Text, nullable=False, server_default=text("'published'")),
    Column("published_at", TIMESTAMP(timezone=True), server_default=func.now()),
    Column("created_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("status IN ('draft', 'published')", name="content_status_ck"),
)

# EKSİK OLAN TABLO: content_image
content_image = Table(
    "content_image", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True,
           server_default=text("gen_random_uuid()")),
    Column("content_id", UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"), nullable=False),
    Column("url", Text, nullable=False),
    Column("alt", Text, nullable=False, server_default=text("''")),
    Column("sort_order", Integer, nullable=False, server_default=text("0")),
    Column("width", Integer, nullable=False, server_default=text("0")),   # yeni eklendi
    Column("height", Integer, nullable=False, server_default=text("0")),  # yeni eklendi
    Column("created_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("btrim(url) <> '' AND url ~ '^(https?://|/|s3://)'", name="content_image_url_ck"),
)

content_attachment = Table(
    "content_attachment", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True,
           server_default=text("gen_random_uuid()")),
    Column("content_id", UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"), nullable=False),
    Column("label", Text, nullable=False, server_default=text("''")),
    Column("file_name", Text, nullable=False, server_default=text("'attachment'")),
    Column("mime_type", Text, nullable=False, server_default=text("'application/octet-stream'")),
    Column("size_bytes", BigInteger, nullable=False, server_default=text("0")),
    Column("url", Text, nullable=False),
    Column("sort_order", Integer, nullable=False, server_default=text("0")),
    Column("created_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("btrim(url) <> '' AND url ~ '^(https?://|/|s3://)'", name="content_attachment_url_ck"),
)

redirect_rule = Table(
    "redirect_rule", metadata,
    Column("id", UUID(as_uuid=True), primary_key=True,
           server_default=text("gen_random_uuid()")),
    Column("source_path", Text, nullable=False, unique=True),
    Column("target_path", Text, nullable=False),
    Column("status_code", SmallInteger, nullable=False, server_default=text("301")),
    Column("is_active", Boolean, nullable=False, server_default=text("true")),
    Column("note", Text),
    Column("created_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
    CheckConstraint("source_path ~ '^/'", name="redirect_source_path_ck"),
    CheckConstraint("target_path ~ '^/'", name="redirect_target_path_ck"),
    CheckConstraint("status_code IN (301,302,307,308)", name="redirect_status_code_ck"),
)

# ==============
# Indexes (DDL ile aynı)
# ==============

# Slug benzersizlikleri
Index("uq_category_slug", category.c.slug, unique=True)

Index(
    "uq_heading_level1_slug",
    heading.c.category_id, heading.c.slug,
    unique=True,
    postgresql_where=(heading.c.level == 1),
)

Index(
    "uq_heading_level2_slug",
    heading.c.parent_heading_id, heading.c.slug,
    unique=True,
    postgresql_where=(heading.c.level == 2),
)

# FK ve listeleme hızlandırma
Index("idx_heading_category_l1", heading.c.category_id, postgresql_where=(heading.c.level == 1))
Index("idx_heading_parent_l2", heading.c.parent_heading_id, postgresql_where=(heading.c.level == 2))
Index(
    "idx_heading_l1_sort",
    heading.c.category_id, heading.c.sort_order, heading.c.id,
    postgresql_where=(heading.c.level == 1),
)
Index(
    "idx_heading_l2_sort",
    heading.c.parent_heading_id, heading.c.sort_order, heading.c.id,
    postgresql_where=(heading.c.level == 2),
)

# Content Image Indexleri
Index(
    "idx_content_image_order",
    content_image.c.content_id, content_image.c.sort_order, content_image.c.id
)
Index(
    "uq_content_image_sort",
    content_image.c.content_id, content_image.c.sort_order,
    unique=True
)
Index("idx_content_attachment_order", content_attachment.c.content_id, content_attachment.c.sort_order, content_attachment.c.id)
Index("idx_redirect_rule_active_source", redirect_rule.c.is_active, redirect_rule.c.source_path)

# TRGM arama index'leri (pg_trgm yüklü olmalı)
Index(
    "idx_category_name_trgm",
    category.c.name,
    postgresql_using="gin",
    postgresql_ops={category.c.name.key: "gin_trgm_ops"},
)
Index(
    "idx_category_desc_trgm",
    category.c.description,
    postgresql_using="gin",
    postgresql_ops={category.c.description.key: "gin_trgm_ops"},
)
Index(
    "idx_category_seo_desc_trgm",
    category.c.seo_description,
    postgresql_using="gin",
    postgresql_ops={category.c.seo_description.key: "gin_trgm_ops"},
)
Index(
    "idx_heading_title_trgm",
    heading.c.title,
    postgresql_using="gin",
    postgresql_ops={heading.c.title.key: "gin_trgm_ops"},
)
Index(
    "idx_heading_desc_trgm",
    heading.c.description,
    postgresql_using="gin",
    postgresql_ops={heading.c.description.key: "gin_trgm_ops"},
)
Index(
    "idx_heading_seo_desc_trgm",
    heading.c.seo_description,
    postgresql_using="gin",
    postgresql_ops={heading.c.seo_description.key: "gin_trgm_ops"},
)
Index(
    "idx_content_body_trgm",
    content.c.body,
    postgresql_using="gin",
    postgresql_ops={content.c.body.key: "gin_trgm_ops"},
)
Index(
    "idx_content_desc_trgm",
    content.c.description,
    postgresql_using="gin",
    postgresql_ops={content.c.description.key: "gin_trgm_ops"},
)
site_setting = Table(
    "site_setting", metadata,
    Column("key", CITEXT, primary_key=True),
    Column("value", Text, nullable=False),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
)
