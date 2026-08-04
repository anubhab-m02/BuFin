"""add household tagging to transactions and goals

Revision ID: 5111289400b2
Revises: 3272a7577bf0
Create Date: 2026-08-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5111289400b2'
down_revision: Union[str, Sequence[str], None] = '3272a7577bf0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Nullable, no default needed - every existing row lands as NULL (personal),
    # which is exactly the "unaffected by this change" behavior the feature requires.
    with op.batch_alter_table('transactions') as batch_op:
        batch_op.add_column(sa.Column('household_id', sa.String(), nullable=True))

    with op.batch_alter_table('goals') as batch_op:
        batch_op.add_column(sa.Column('household_id', sa.String(), nullable=True))

    op.create_table(
        'goal_contributions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('goal_id', sa.String(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('amount', sa.Float(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['goal_id'], ['goals.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('goal_contributions') as batch_op:
        batch_op.create_index(batch_op.f('ix_goal_contributions_id'), ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('goal_contributions') as batch_op:
        batch_op.drop_index(batch_op.f('ix_goal_contributions_id'))
    op.drop_table('goal_contributions')

    with op.batch_alter_table('goals') as batch_op:
        batch_op.drop_column('household_id')

    with op.batch_alter_table('transactions') as batch_op:
        batch_op.drop_column('household_id')
