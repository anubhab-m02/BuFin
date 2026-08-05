"""add recurring_plan_id to transactions

Revision ID: 4159e8f5dfa3
Revises: 5111289400b2
Create Date: 2026-08-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4159e8f5dfa3'
down_revision: Union[str, Sequence[str], None] = '5111289400b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable, no default - every existing row lands as NULL (not tied to any recurring
    # plan), which is exactly the "no behavior change for anyone" this needs.
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.add_column(sa.Column('recurring_plan_id', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.drop_column('recurring_plan_id')
