"""add budgets table

Revision ID: 3d52f3495e78
Revises: 7cfbe9aa43f0
Create Date: 2026-07-03 01:38:40.233556

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3d52f3495e78'
down_revision: Union[str, Sequence[str], None] = '7cfbe9aa43f0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Autogenerate produced a no-op here because create_all() (which main.py runs on every
    # app import) had already created this table as a side effect of local testing. Written
    # out explicitly so this migration is meaningful for a fresh/pre-existing database too.
    op.create_table(
        'budgets',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('monthlyLimit', sa.Float(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('budgets') as batch_op:
        batch_op.create_index(batch_op.f('ix_budgets_id'), ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('budgets') as batch_op:
        batch_op.drop_index(batch_op.f('ix_budgets_id'))
    op.drop_table('budgets')
