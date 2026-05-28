"""add last_login_at to user_account

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-27 12:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '0002'
down_revision: Union[str, None] = '0001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.get_bind().execute(
        sa.text("ALTER TABLE public.user_account ADD COLUMN IF NOT EXISTS last_login_at timestamptz")
    )


def downgrade() -> None:
    pass
