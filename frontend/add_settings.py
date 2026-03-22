import os

models_path = '../backend/app/db/models.py'
with open(models_path, 'a', encoding='utf-8') as f:
    f.write('''\nsite_setting = Table(
    "site_setting", metadata,
    Column("key", CITEXT, primary_key=True),
    Column("value", Text, nullable=False),
    Column("updated_at", TIMESTAMP(timezone=True), nullable=False, server_default=func.now()),
)
''')

ddl_path = '../backend/DDL.sql'
with open(ddl_path, 'a', encoding='utf-8') as f:
    f.write('''
CREATE TABLE public.site_setting (
    key public.citext PRIMARY KEY,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO public.site_setting (key, value) VALUES ('site_title', 'Fastapi') ON CONFLICT DO NOTHING;
''')
