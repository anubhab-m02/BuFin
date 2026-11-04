"""add chat history tables

Revision ID: dba4e9379fb6
Revises: 5111289400b2
Create Date: 2026-08-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dba4e9379fb6'
down_revision: Union[str, Sequence[str], None] = '5111289400b2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Written out explicitly rather than relying on autogenerate, matching the net-worth/
    # household migrations - create_all() (run on every app import) already creates these
    # tables as a side effect of local testing, so autogenerate alone would produce a no-op.
    op.create_table(
        'chat_sessions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=True),
        sa.Column('mode', sa.String(), nullable=True),
        sa.Column('title', sa.String(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.Column('updated_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('chat_sessions') as batch_op:
        batch_op.create_index(batch_op.f('ix_chat_sessions_id'), ['id'], unique=False)

    op.create_table(
        'chat_messages',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('session_id', sa.String(), nullable=True),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('content', sa.String(), nullable=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['session_id'], ['chat_sessions.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    with op.batch_alter_table('chat_messages') as batch_op:
        batch_op.create_index(batch_op.f('ix_chat_messages_id'), ['id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('chat_messages') as batch_op:
        batch_op.drop_index(batch_op.f('ix_chat_messages_id'))
    op.drop_table('chat_messages')

    with op.batch_alter_table('chat_sessions') as batch_op:
        batch_op.drop_index(batch_op.f('ix_chat_sessions_id'))
    op.drop_table('chat_sessions')
