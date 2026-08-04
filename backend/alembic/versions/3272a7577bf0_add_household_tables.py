"""add household tables

Revision ID: 3272a7577bf0
Revises: 3d52f3495e78
Create Date: 2026-08-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3272a7577bf0'
down_revision: Union[str, Sequence[str], None] = '3d52f3495e78'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# NOTE: this chains off the budgets migration (the current head on `main` at the time
# this branch was cut) rather than the net-worth-tables migration, since that PR hasn't
# merged yet. Whichever of the two PRs merges second will need its down_revision rebased
# onto the other's head to keep the migration chain linear.


def upgrade() -> None:
    """Upgrade schema."""
    # Written out explicitly rather than relying on autogenerate, matching every other
    # migration in this repo - create_all() (run on every app import) already creates
    # these tables as a side effect of local testing, so autogenerate alone would
    # produce a no-op here.
    op.create_table(
        'households',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('households') as batch_op:
        batch_op.create_index(batch_op.f('ix_households_id'), ['id'], unique=False)

    op.create_table(
        'household_members',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('household_id', sa.String(), nullable=True),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('joined_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['household_id'], ['households.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('household_members') as batch_op:
        batch_op.create_index(batch_op.f('ix_household_members_id'), ['id'], unique=False)

    op.create_table(
        'household_invites',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('household_id', sa.String(), nullable=True),
        sa.Column('code', sa.String(), nullable=True),
        sa.Column('created_by', sa.String(), nullable=True),
        sa.Column('expires_at', sa.String(), nullable=True),
        sa.Column('used_by', sa.String(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['household_id'], ['households.id']),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
        sa.ForeignKeyConstraint(['used_by'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('household_invites') as batch_op:
        batch_op.create_index(batch_op.f('ix_household_invites_id'), ['id'], unique=False)
        batch_op.create_index(batch_op.f('ix_household_invites_code'), ['code'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('household_invites') as batch_op:
        batch_op.drop_index(batch_op.f('ix_household_invites_code'))
        batch_op.drop_index(batch_op.f('ix_household_invites_id'))
    op.drop_table('household_invites')

    with op.batch_alter_table('household_members') as batch_op:
        batch_op.drop_index(batch_op.f('ix_household_members_id'))
    op.drop_table('household_members')

    with op.batch_alter_table('households') as batch_op:
        batch_op.drop_index(batch_op.f('ix_households_id'))
    op.drop_table('households')
