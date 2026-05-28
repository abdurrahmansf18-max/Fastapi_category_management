"""audit: add created_at index for efficient pruning

Revision ID: 0003
Revises: 0002
Create Date: 2026-05-27 23:00:00.000000

Neden:
  - Tiered retention DELETE sorguları (content.* 30g, ops 90g, security 365g)
    sadece created_at üzerinden tarar.
  - Mevcut (tenant_id, created_at) ve (action, created_at) indeksleri bu
    sorgular için yetersiz — tek kolon indeks daha verimli.
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0003'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    # Retention/cleanup sorgularını hızlandıran tek kolon indeks
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_audit_event_time "
        "ON public.audit_event(created_at DESC)"
    ))
    # action prefix + time indeksi — tiered DELETE WHERE action LIKE 'content.%' AND created_at <
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS idx_audit_event_action_prefix_time "
        "ON public.audit_event(action text_pattern_ops, created_at DESC)"
    ))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP INDEX IF EXISTS public.idx_audit_event_time"))
    conn.execute(sa.text("DROP INDEX IF EXISTS public.idx_audit_event_action_prefix_time"))
