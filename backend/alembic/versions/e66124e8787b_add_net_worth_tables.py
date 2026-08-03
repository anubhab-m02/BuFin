"""add net worth tables

Revision ID: e66124e8787b
Revises: 3d52f3495e78
Create Date: 2026-07-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e66124e8787b'
down_revision: Union[str, Sequence[str], None] = '3d52f3495e78'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Written out explicitly rather than relying on autogenerate, matching the budgets
    # migration - create_all() (run on every app import) already creates these tables as
    # a side effect of local testing, so autogenerate alone would produce a no-op here.
    op.create_table(
        'assets',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('current_value', sa.Float(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('assets') as batch_op:
        batch_op.create_index(batch_op.f('ix_assets_id'), ['id'], unique=False)

    op.create_table(
        'liabilities',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('category', sa.String(), nullable=True),
        sa.Column('current_balance', sa.Float(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('liabilities') as batch_op:
        batch_op.create_index(batch_op.f('ix_liabilities_id'), ['id'], unique=False)

    op.create_table(
        'net_worth_snapshots',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('total_assets', sa.Float(), nullable=True),
        sa.Column('total_liabilities', sa.Float(), nullable=True),
        sa.Column('recorded_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('net_worth_snapshots') as batch_op:
        batch_op.create_index(batch_op.f('ix_net_worth_snapshots_id'), ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('net_worth_snapshots') as batch_op:
        batch_op.drop_index(batch_op.f('ix_net_worth_snapshots_id'))
    op.drop_table('net_worth_snapshots')

    with op.batch_alter_table('liabilities') as batch_op:
        batch_op.drop_index(batch_op.f('ix_liabilities_id'))
    op.drop_table('liabilities')

    with op.batch_alter_table('assets') as batch_op:
        batch_op.drop_index(batch_op.f('ix_assets_id'))
    op.drop_table('assets')
