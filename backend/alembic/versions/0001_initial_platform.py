"""initial platform

Revision ID: 0001
Revises: 
Create Date: 2026-05-11 21:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.db.provisioning import PLATFORM_DDL, FREE_PLAN_LIMITS

revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    params = {
        **{f"free_{key}": value for key, value in FREE_PLAN_LIMITS.items()},
    }
    
    connection = op.get_bind()
    for stmt in PLATFORM_DDL:
        connection.execute(sa.text(stmt), params)

def downgrade() -> None:
    pass
